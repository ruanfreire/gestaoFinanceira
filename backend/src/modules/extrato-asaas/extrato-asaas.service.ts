import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { parseAsaasCsv } from './asaas-csv.parser';
import { normalizeName } from './name-match.util';
import { mapScoredCandidata } from './conciliacao-response.util';
import { NotasService } from '../notas/notas.service';
import { pagamentoDetalhesFromAsaas } from '../notas/pagamento-detalhes.util';
import {
  buildFluxoCaixaFilename,
  resolveFluxoCaixaHeader,
  type FluxoCaixaExportParams,
} from '../../common/fluxo-caixa.config';
import {
  buildDateFilter,
  collectValidNotaIds,
  enrichHeaderFromNotas,
  mapLancamentosToFluxoCaixaRows,
  resolveExportDateRange,
} from '../../common/fluxo-caixa-data.util';
import {
  isAsaasCobrancaRecebida,
  tipoMovimentoFromAsaas,
  type TipoMovimento,
} from '../../common/movimento-bancario.util';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import { buildFluxoCaixaWorkbook } from '../../common/fluxo-caixa.export';
import { resolveSaldoInicialAutomatico } from '../../common/fluxo-caixa-saldo.resolver';

export type { FluxoCaixaExportParams };

@Injectable()
export class ExtratoAsaasService {
  constructor(
    @InjectModel('AsaasImportacao') private importModel: Model<any>,
    @InjectModel('AsaasLancamento') private lancamentoModel: Model<any>,
    @InjectModel('Nota') private notaModel: Model<any>,
    private readonly notasService: NotasService,
    private readonly config: ConfigService,
  ) {}

  async processUpload(content: string, metadata: { filename: string; originalName?: string; uploadedBy?: string }) {
    const { meta, rows } = parseAsaasCsv(content);
    const transacao_ids = rows.map((row) => row.transacao_id);
    const importacao = await this.importModel.create({
      filename: metadata.filename,
      originalName: metadata.originalName,
      uploadedBy: metadata.uploadedBy,
      periodo: meta.periodo,
      saldo_inicial: meta.saldo_inicial,
      saldo_final: meta.saldo_final,
      transacao_ids,
      status: 'processing',
      stats: {
        total_linhas: rows.length,
        cobrancas: 0,
        entradas: 0,
        saidas: 0,
        conciliado_auto: 0,
        pendente_vinculo: 0,
        conciliado_manual: 0,
        sem_match: 0,
        extrato: 0,
      },
    });

    const stats = {
      total_linhas: rows.length,
      cobrancas: 0,
      entradas: 0,
      saidas: 0,
      conciliado_auto: 0,
      pendente_vinculo: 0,
      conciliado_manual: 0,
      sem_match: 0,
      extrato: 0,
      imported: 0,
      skipped: 0,
    };

    for (const row of rows) {
      const exists = await this.lancamentoModel.findOne({ transacao_id: row.transacao_id }).lean();
      if (exists) {
        stats.skipped += 1;
        continue;
      }

      stats.imported += 1;
      const tipo_movimento = tipoMovimentoFromAsaas(row.tipo_lancamento);
      if (tipo_movimento === 'entrada') stats.entradas += 1;
      else stats.saidas += 1;

      const isCobranca = isAsaasCobrancaRecebida(row.tipo_transacao, row.tipo_lancamento);

      if (!isCobranca) {
        stats.extrato += 1;
        await this.lancamentoModel.create({
          importacao_id: importacao._id,
          transacao_id: row.transacao_id,
          data: row.data,
          tipo_transacao: row.tipo_transacao,
          descricao: row.descricao,
          valor: row.valor,
          saldo: row.saldo,
          fatura_parcelamento_id: row.fatura_parcelamento_id,
          fatura_cobranca_id: row.fatura_cobranca_id,
          pagador_nome: row.pagador_nome,
          pagador_nome_normalizado: row.pagador_nome ? normalizeName(row.pagador_nome) : undefined,
          tipo_lancamento: row.tipo_lancamento,
          tipo_movimento,
          status_conciliacao: 'extrato',
          json_original: row,
        });
        continue;
      }

      stats.cobrancas += 1;
      const match = await this.resolveCobrancaMatch(
        row.pagador_nome || '',
        row.valor,
        row.data,
      );
      const { status_conciliacao, nota_id, candidatas_nota_ids } = match;

      if (status_conciliacao === 'conciliado_auto') stats.conciliado_auto += 1;
      else if (status_conciliacao === 'pendente_vinculo') stats.pendente_vinculo += 1;
      else stats.sem_match += 1;

      const lancamento = await this.lancamentoModel.create({
        importacao_id: importacao._id,
        transacao_id: row.transacao_id,
        data: row.data,
        tipo_transacao: row.tipo_transacao,
        descricao: row.descricao,
        valor: row.valor,
        saldo: row.saldo,
        fatura_parcelamento_id: row.fatura_parcelamento_id,
        fatura_cobranca_id: row.fatura_cobranca_id,
        pagador_nome: row.pagador_nome,
        pagador_nome_normalizado: row.pagador_nome ? normalizeName(row.pagador_nome) : undefined,
        tipo_lancamento: row.tipo_lancamento,
        tipo_movimento,
        status_conciliacao,
        nota_id,
        candidatas_nota_ids,
        json_original: row,
      });

      if (status_conciliacao === 'conciliado_auto' && nota_id) {
        await this.notasService.applyPayment(
          nota_id,
          String(lancamento._id),
          row.valor,
          row.data,
          'asaas',
          pagamentoDetalhesFromAsaas(lancamento),
        );
      }
    }

    await this.importModel.findByIdAndUpdate(importacao._id, {
      $set: {
        stats: {
          total_linhas: stats.total_linhas,
          cobrancas: stats.cobrancas,
          entradas: stats.entradas,
          saidas: stats.saidas,
          conciliado_auto: stats.conciliado_auto,
          pendente_vinculo: stats.pendente_vinculo,
          conciliado_manual: stats.conciliado_manual,
          sem_match: stats.sem_match,
          extrato: stats.extrato,
          imported: stats.imported,
          skipped: stats.skipped,
        },
        status: 'finished',
        originalCsv: content,
        transacao_ids,
      },
    });

    const reconciled = await this.reconcilePendentes();

    return {
      ok: true,
      importacao_id: String(importacao._id),
      ...stats,
      reconciled,
    };
  }

  private async resolveCobrancaMatch(payerName: string, valor: number, paymentDate: Date) {
    if (!payerName) {
      return { status_conciliacao: 'sem_match' as const, candidatas_nota_ids: [] as string[] };
    }

    const exactMatches = await this.notasService.findOpenByNameAndValue(
      payerName,
      valor,
      paymentDate,
    );

    if (exactMatches.length === 1) {
      return {
        status_conciliacao: 'conciliado_auto' as const,
        nota_id: String(exactMatches[0]._id),
        candidatas_nota_ids: [] as string[],
      };
    }

    if (exactMatches.length > 1) {
      return {
        status_conciliacao: 'pendente_vinculo' as const,
        candidatas_nota_ids: exactMatches.map((nota) => String(nota._id)),
      };
    }

    const scoredMatches = await this.notasService.findOpenMatches(payerName, valor, paymentDate);
    const relevant = scoredMatches.filter((item) => item.valueMatch || item.partialMatch);
    const candidates = relevant.length > 0 ? relevant : scoredMatches;
    if (candidates.length > 0) {
      return {
        status_conciliacao: 'pendente_vinculo' as const,
        candidatas_nota_ids: candidates.map((item) => String(item.nota._id)),
      };
    }

    return { status_conciliacao: 'sem_match' as const, candidatas_nota_ids: [] as string[] };
  }

  async reconcilePendentes() {
    const pendentes = await this.lancamentoModel
      .find({ status_conciliacao: 'pendente_vinculo' })
      .lean();

    let conciliado_auto = 0;
    let ainda_pendente = 0;

    for (const lancamento of pendentes) {
      const match = await this.resolveCobrancaMatch(
        lancamento.pagador_nome || '',
        lancamento.valor,
        new Date(lancamento.data),
      );

      if (match.status_conciliacao === 'conciliado_auto' && match.nota_id) {
        await this.notasService.applyPayment(
          match.nota_id,
          String(lancamento._id),
          lancamento.valor,
          new Date(lancamento.data),
          'asaas',
          pagamentoDetalhesFromAsaas(lancamento),
        );
        await this.lancamentoModel.findByIdAndUpdate(lancamento._id, {
          $set: {
            status_conciliacao: 'conciliado_auto',
            nota_id: match.nota_id,
            candidatas_nota_ids: [],
          },
        });
        if (lancamento.importacao_id) {
          await this.importModel.findByIdAndUpdate(lancamento.importacao_id, {
            $inc: { 'stats.pendente_vinculo': -1, 'stats.conciliado_auto': 1 },
          });
        }
        conciliado_auto += 1;
        continue;
      }

      if (match.status_conciliacao === 'pendente_vinculo') {
        await this.lancamentoModel.findByIdAndUpdate(lancamento._id, {
          $set: { candidatas_nota_ids: match.candidatas_nota_ids },
        });
      }

      ainda_pendente += 1;
    }

    return { conciliado_auto, ainda_pendente, total: pendentes.length };
  }

  async listSemMatch() {
    const lancamentos = await this.lancamentoModel
      .find({ status_conciliacao: 'sem_match' })
      .sort({ data: -1 })
      .lean();

    const results = [];
    for (const lancamento of lancamentos) {
      const scored = await this.notasService.findOpenForConciliacao(
        lancamento.pagador_nome || '',
        lancamento.valor,
        new Date(lancamento.data),
      );

      results.push({
        lancamento,
        candidatas: scored.map(mapScoredCandidata),
      });
    }

    return results;
  }

  async listPendentes() {
    const lancamentos = await this.lancamentoModel
      .find({ status_conciliacao: 'pendente_vinculo' })
      .sort({ data: -1 })
      .lean();

    const results = [];
    for (const lancamento of lancamentos) {
      const scored = await this.notasService.findOpenForConciliacao(
        lancamento.pagador_nome || '',
        lancamento.valor,
        new Date(lancamento.data),
      );

      results.push({
        lancamento,
        candidatas: scored.map(mapScoredCandidata),
      });
    }

    return results;
  }

  async listNotasParaLancamento(lancamentoId: string, search?: string) {
    const lancamento = asLeanOne<{
      status_conciliacao?: string;
      pagador_nome?: string;
      valor?: number;
      data?: Date | string;
    }>(await this.lancamentoModel.findById(lancamentoId).lean());
    if (!lancamento) {
      throw new Error('Lançamento não encontrado');
    }
    if (!['pendente_vinculo', 'sem_match'].includes(lancamento.status_conciliacao ?? '')) {
      throw new Error('Lançamento não está disponível para vínculo manual');
    }

    const scored = await this.notasService.findOpenForConciliacao(
      lancamento.pagador_nome ?? '',
      lancamento.valor ?? 0,
      new Date(lancamento.data ?? Date.now()),
      search,
    );

    return {
      lancamento,
      candidatas: scored.map(mapScoredCandidata),
    };
  }

  async vincularManual(lancamentoId: string, notaId: string) {
    const lancamento = await this.lancamentoModel.findById(lancamentoId);
    if (!lancamento) {
      throw new Error('Lançamento não encontrado');
    }
    if (!['pendente_vinculo', 'sem_match'].includes(lancamento.status_conciliacao)) {
      throw new Error('Lançamento não está disponível para vínculo manual');
    }

    const nota = await this.notasService.findById(notaId);
    if (!nota) {
      throw new Error('Nota não encontrada');
    }

    await this.notasService.applyPayment(
      notaId,
      lancamentoId,
      lancamento.valor,
      new Date(lancamento.data),
      'asaas',
      pagamentoDetalhesFromAsaas(lancamento),
    );

    await this.lancamentoModel.findByIdAndUpdate(lancamentoId, {
      $set: {
        status_conciliacao: 'conciliado_manual',
        nota_id: notaId,
      },
    });

    const previousStatus = lancamento.status_conciliacao;
    const statsInc: Record<string, number> = { 'stats.conciliado_manual': 1 };
    if (previousStatus === 'pendente_vinculo') {
      statsInc['stats.pendente_vinculo'] = -1;
    } else if (previousStatus === 'sem_match') {
      statsInc['stats.sem_match'] = -1;
    }

    if (lancamento.importacao_id) {
      await this.importModel.findByIdAndUpdate(lancamento.importacao_id, { $inc: statsInc });
    }

    return { ok: true, lancamento_id: lancamentoId, nota_id: notaId };
  }

  async prepareFluxoCaixaData(params: FluxoCaixaExportParams) {
    const filter: Record<string, unknown> = {};
    const { from, to } = resolveExportDateRange(params);
    const dataFilter = buildDateFilter(from, to);
    if (dataFilter) filter.data = dataFilter;

    const lancamentos = asLeanMany<{
      nota_id?: unknown;
      data?: Date | string;
      descricao?: string;
      tipo_transacao?: string;
      pagador_nome?: string;
      tipo_lancamento?: string;
      tipo_movimento?: TipoMovimento;
      valor?: number;
      saldo?: number;
    }>(await this.lancamentoModel.find(filter).sort({ data: 1, _id: 1 }).lean());

    const notaIds = collectValidNotaIds(lancamentos);
    const notas = notaIds.length
      ? asLeanMany<{
          _id: unknown;
          numero?: string;
          tomador?: string;
          codigo_servico?: string;
          mes_competencia?: string;
          empresa_nome?: string;
          empresa_cnpj?: string;
        }>(
          await this.notaModel
            .find({ _id: { $in: notaIds } })
            .select('numero tomador codigo_servico mes_competencia empresa_nome empresa_cnpj')
            .lean(),
        )
      : [];

    const notaById = new Map(notas.map((nota) => [String(nota._id), nota]));
    const lancamentosExport = lancamentos;

    const { rows } = mapLancamentosToFluxoCaixaRows(
      lancamentosExport,
      notaById,
      (lancamento) => {
        const parts = [lancamento.tipo_transacao, lancamento.descricao, lancamento.pagador_nome].filter(
          Boolean,
        );
        return parts.join(' — ') || '';
      },
      undefined,
      (lancamento) => lancamento.tipo_movimento || tipoMovimentoFromAsaas(lancamento.tipo_lancamento),
    );

    const header = resolveFluxoCaixaHeader(
      this.config,
      'asaas',
      params,
      await resolveSaldoInicialAutomatico(
        {
          lancamentoModel: this.lancamentoModel,
          importModel: this.importModel,
          config: this.config,
        },
        'asaas',
        params,
        lancamentosExport,
      ),
    );
    enrichHeaderFromNotas(header, notas);

    return { header, rows };
  }

  async exportFluxoCaixa(params: FluxoCaixaExportParams): Promise<{ buffer: Buffer; filename: string }> {
    const { header, rows } = await this.prepareFluxoCaixaData(params);
    const buffer = await buildFluxoCaixaWorkbook('asaas', header, rows);

    return {
      buffer,
      filename: buildFluxoCaixaFilename('asaas', params),
    };
  }
}
