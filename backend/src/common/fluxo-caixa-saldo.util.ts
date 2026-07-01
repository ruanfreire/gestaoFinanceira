import type { FluxoCaixaExportParams } from './fluxo-caixa.config';
import { resolveExportDateRange } from './fluxo-caixa-data.util';
import { tipoMovimentoFromAsaas, tipoMovimentoFromNubank, type TipoMovimento } from './movimento-bancario.util';

export type LancamentoSaldoInput = {
  data?: Date | string;
  valor?: number;
  saldo?: number | null;
  tipo_movimento?: TipoMovimento;
  tipo_lancamento?: string;
  json_original?: { tipo?: string };
};

export function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Data de referência: saldo imediatamente antes do primeiro lançamento exportado. */
export function resolveSaldoReferenceDate(
  params: FluxoCaixaExportParams,
  lancamentos: LancamentoSaldoInput[],
): Date | null {
  if (lancamentos.length > 0) {
    const sorted = [...lancamentos].sort(
      (a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime(),
    );
    return startOfDayUtc(new Date(sorted[0].data!));
  }
  const { from } = resolveExportDateRange(params);
  if (from) {
    return new Date(`${from}T00:00:00.000Z`);
  }
  return null;
}

export function resolveTipoMovimento(lancamento: LancamentoSaldoInput): TipoMovimento {
  if (lancamento.tipo_movimento) return lancamento.tipo_movimento;
  if (lancamento.tipo_lancamento) return tipoMovimentoFromAsaas(lancamento.tipo_lancamento);
  return tipoMovimentoFromNubank(lancamento.json_original?.tipo);
}

/** Saldo antes de aplicar o lançamento (quando o extrato traz saldo pós-movimento). */
export function saldoAnteriorFromLancamento(lancamento: LancamentoSaldoInput): number | null {
  if (lancamento.saldo == null || lancamento.valor == null) return null;
  const tipo = resolveTipoMovimento(lancamento);
  return tipo === 'entrada'
    ? lancamento.saldo - lancamento.valor
    : lancamento.saldo + lancamento.valor;
}

export function netMovimento(lancamento: LancamentoSaldoInput): number {
  const valor = Math.abs(lancamento.valor ?? 0);
  return resolveTipoMovimento(lancamento) === 'entrada' ? valor : -valor;
}

export function sumNetMovimentos(lancamentos: LancamentoSaldoInput[]): number {
  return lancamentos.reduce((total, item) => total + netMovimento(item), 0);
}

export function hasSaldoInicialOverride(params: FluxoCaixaExportParams): boolean {
  return Boolean(params.saldo_inicial?.trim());
}
