import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import type { FluxoCaixaBanco, FluxoCaixaExportParams } from './fluxo-caixa.config';
import { asLeanMany, asLeanOne } from './mongoose-lean.util';
import {
  hasSaldoInicialOverride,
  type LancamentoSaldoInput,
  resolveSaldoReferenceDate,
  saldoAnteriorFromLancamento,
  startOfDayUtc,
  sumNetMovimentos,
} from './fluxo-caixa-saldo.util';

type SaldoResolverDeps = {
  lancamentoModel: Model<any>;
  importModel: Model<any>;
  config: ConfigService;
};

function parseSeedSaldo(config: ConfigService, banco: FluxoCaixaBanco): number {
  const key = banco === 'asaas' ? 'FLUXO_CAIXA_ASAAS_SALDO_INICIAL' : 'FLUXO_CAIXA_SALDO_INICIAL';
  const raw = config.get<string>(key) ?? config.get<string>('FLUXO_CAIXA_SALDO_INICIAL') ?? '0';
  return Number.parseFloat(String(raw).replace(',', '.')) || 0;
}

export async function resolveSaldoInicialAutomatico(
  deps: SaldoResolverDeps,
  banco: FluxoCaixaBanco,
  params: FluxoCaixaExportParams,
  lancamentosFiltrados: LancamentoSaldoInput[],
): Promise<number | null> {
  if (hasSaldoInicialOverride(params)) return null;

  const referenceDate = resolveSaldoReferenceDate(params, lancamentosFiltrados);
  if (!referenceDate) return null;

  if (banco === 'asaas') {
    return resolveAsaasSaldo(deps, referenceDate, lancamentosFiltrados);
  }
  return resolveNubankSaldo(deps, referenceDate);
}

async function resolveAsaasSaldo(
  deps: SaldoResolverDeps,
  referenceDate: Date,
  lancamentosFiltrados: LancamentoSaldoInput[],
): Promise<number | null> {
  const anterior = asLeanOne<{ saldo?: number }>(
    await deps.lancamentoModel
      .findOne({
        data: { $lt: referenceDate },
        saldo: { $type: 'number' },
      })
      .sort({ data: -1, _id: -1 })
      .select('saldo')
      .lean(),
  );

  if (anterior?.saldo != null) {
    return anterior.saldo;
  }

  const firstWithSaldo = lancamentosFiltrados.find((item) => item.saldo != null);
  if (firstWithSaldo) {
    const calculado = saldoAnteriorFromLancamento(firstWithSaldo);
    if (calculado != null) return calculado;
  }

  const importacoes = asLeanMany<{ _id: unknown; saldo_inicial?: number }>(
    await deps.importModel
      .find({ saldo_inicial: { $type: 'number' } })
      .sort({ createdAt: 1 })
      .lean(),
  );

  for (const importacao of importacoes) {
    const firstRow = asLeanOne<{ data?: Date | string }>(
      await deps.lancamentoModel
        .findOne({ importacao_id: importacao._id })
        .sort({ data: 1, _id: 1 })
        .select('data')
        .lean(),
    );

    if (!firstRow?.data) continue;

    const firstDay = startOfDayUtc(new Date(firstRow.data));
    if (referenceDate.getTime() <= firstDay.getTime()) {
      return importacao.saldo_inicial ?? null;
    }
  }

  return null;
}

async function resolveNubankSaldo(deps: SaldoResolverDeps, referenceDate: Date): Promise<number | null> {
  const imports = asLeanMany<{ _id: unknown; saldo_inicial?: number; saldo_final?: number }>(
    await deps.importModel
      .find({ status: 'finished' })
      .sort({ createdAt: 1 })
      .lean(),
  );

  if (imports.length === 0) {
    const anteriores = asLeanMany<LancamentoSaldoInput>(
      await deps.lancamentoModel
        .find({ data: { $lt: referenceDate } })
        .select('valor tipo_movimento json_original')
        .lean(),
    );
    return parseSeedSaldo(deps.config, 'nubank') + sumNetMovimentos(anteriores);
  }

  return findNubankSaldoAtReference(deps, referenceDate, imports);
}

async function findNubankSaldoAtReference(
  deps: SaldoResolverDeps,
  referenceDate: Date,
  imports: Array<{ _id: unknown; saldo_inicial?: number; saldo_final?: number }>,
): Promise<number> {
  let runningSaldo = parseSeedSaldo(deps.config, 'nubank');

  for (const importacao of imports) {
    const lancamentos = asLeanMany<LancamentoSaldoInput & { data: Date | string }>(
      await deps.lancamentoModel
        .find({ importacao_id: importacao._id })
        .select('data valor tipo_movimento json_original')
        .lean(),
    );

    if (lancamentos.length === 0) continue;

    const saldoInicial =
      importacao.saldo_inicial != null ? importacao.saldo_inicial : runningSaldo;
    const saldoFinal =
      importacao.saldo_final != null
        ? importacao.saldo_final
        : saldoInicial + sumNetMovimentos(lancamentos);

    const sorted = [...lancamentos].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    );
    const firstDay = startOfDayUtc(new Date(sorted[0].data));
    const lastDay = startOfDayUtc(new Date(sorted[sorted.length - 1].data));

    if (referenceDate.getTime() <= firstDay.getTime()) {
      return saldoInicial;
    }

    if (referenceDate.getTime() > lastDay.getTime()) {
      runningSaldo = saldoFinal;
      continue;
    }

    const antesDoPeriodo = lancamentos.filter(
      (item) => startOfDayUtc(new Date(item.data)).getTime() < referenceDate.getTime(),
    );
    return saldoInicial + sumNetMovimentos(antesDoPeriodo);
  }

  return runningSaldo;
}

export async function persistNubankImportSaldos(
  importModel: Model<any>,
  lancamentoModel: Model<any>,
  config: ConfigService,
  importacaoId: unknown,
): Promise<void> {
  const lancamentos = asLeanMany<LancamentoSaldoInput>(
    await lancamentoModel
      .find({ importacao_id: importacaoId })
      .select('valor tipo_movimento json_original')
      .lean(),
  );

  if (lancamentos.length === 0) return;

  const previousImport = asLeanOne<{ saldo_final?: number }>(
    await importModel
      .findOne({ _id: { $ne: importacaoId }, status: 'finished' })
      .sort({ createdAt: -1 })
      .select('saldo_final')
      .lean(),
  );

  const saldoInicial = previousImport?.saldo_final ?? parseSeedSaldo(config, 'nubank');
  const saldoFinal = saldoInicial + sumNetMovimentos(lancamentos);

  await importModel.findByIdAndUpdate(importacaoId, {
    $set: { saldo_inicial: saldoInicial, saldo_final: saldoFinal },
  });
}
