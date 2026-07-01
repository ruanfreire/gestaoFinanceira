import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { parseNubankCsv } from './nubank-csv.parser';
import { normalizeName } from '../extrato-asaas/name-match.util';
import { mapScoredCandidata } from '../extrato-asaas/conciliacao-response.util';
import { NotasService } from '../notas/notas.service';
import { pagamentoDetalhesFromNubank } from '../notas/pagamento-detalhes.util';
import {
  buildFluxoCaixaFilename,
  resolveFluxoCaixaHeader,
  type FluxoCaixaExportParams,
} from '../../common/fluxo-caixa.config';
import {
  buildDateFilter,
  collectValidNotaIds,
  enrichHeaderFromNotas,
  splitNubankLancamentosFluxoCaixa,
  mapLancamentosToFluxoCaixaRows,
  resolveExportDateRange,
} from '../../common/fluxo-caixa-data.util';
import { tipoMovimentoFromNubank, type TipoMovimento } from '../../common/movimento-bancario.util';
import { buildFluxoCaixaWorkbook, type FluxoCaixaCartaoSection } from '../../common/fluxo-caixa.export';
import { resolveSaldoInicialAutomatico, persistNubankImportSaldos } from '../../common/fluxo-caixa-saldo.resolver';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';

export type { FluxoCaixaExportParams };

@Injectable()
export class ExtratoNubankService {
  constructor(
    @InjectModel('NubankImportacao') private importModel: Model<any>,
    @InjectModel('NubankLancamento') private lancamentoModel: Model<any>,
    @InjectModel('Nota') private notaModel: Model<any>,
    private readonly notasService: NotasService,
    private readonly config: ConfigService,
  ) {}

  async processUpload(content: string, metadata: { filename: string; originalName?: string; uploadedBy?: string }) {
    const { meta, rows } = parseNubankCsv(content);
    const transacao_ids = rows.map((row) => row.transacao_id);
    const importacao = await this.importModel.create({
      filename: metadata.filename,
      originalName: metadata.originalName,
      uploadedBy: metadata.uploadedBy,
      periodo: meta.periodo,
      formato: meta.formato,
      transacao_ids,
      status: 'processing',
      stats: {
        total_linhas: rows.length,
        creditos: 0,
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
      creditos: 0,
      entradas: 0,
      saidas: 0,
      conciliado_auto: 0,
      pendente_vinculo: 0,
      conciliado_manual: 0,
      sem_match: 0,
      extrato: 0,
      imported: 0,
      skipped: 0,
      formato: meta.formato,
    };

    for (const row of rows) {
      const exists = await this.lancamentoModel.findOne({ transacao_id: row.transacao_id }).lean();
      if (exists) {
        stats.skipped += 1;
        continue;
      }

      stats.imported += 1;
      const tipo_movimento = tipoMovimentoFromNubank(row.tipo);
      if (tipo_movimento === 'entrada') stats.entradas += 1;
      else stats.saidas += 1;

      if (tipo_movimento === 'saida') {
        stats.extrato += 1;
        await this.lancamentoModel.create({
          importacao_id: importacao._id,
          transacao_id: row.transacao_id,
          data: row.data,
          descricao: row.descricao,
          valor: row.valor,
          categoria: row.categoria,
          origem: row.origem,
          tipo_movimento,
          status_conciliacao: 'extrato',
          json_original: row,
        });
        continue;
      }

      stats.creditos += 1;
      const match = await this.resolveCreditoMatch(row.pagador_nome || '', row.valor, row.data);
      const { status_conciliacao, nota_id, candidatas_nota_ids } = match;

      if (status_conciliacao === 'conciliado_auto') stats.conciliado_auto += 1;
      else if (status_conciliacao === 'pendente_vinculo') stats.pendente_vinculo += 1;
      else stats.sem_match += 1;

      const lancamento = await this.lancamentoModel.create({
        importacao_id: importacao._id,
        transacao_id: row.transacao_id,
        data: row.data,
        descricao: row.descricao,
        valor: row.valor,
        categoria: row.categoria,
        origem: row.origem,
        pagador_nome: row.pagador_nome,
        pagador_nome_normalizado: row.pagador_nome ? normalizeName(row.pagador_nome) : undefined,
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
          'nubank',
          pagamentoDetalhesFromNubank(lancamento),
        );
      }
    }

    await this.importModel.findByIdAndUpdate(importacao._id, {
      $set: {
        stats: {
          total_linhas: stats.total_linhas,
          creditos: stats.creditos,
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

    await persistNubankImportSaldos(
      this.importModel,
      this.lancamentoModel,
      this.config,
      importacao._id,
    );

    const reconciled = await this.reconcilePendentes();

    return {
      ok: true,
      importacao_id: String(importacao._id),
      ...stats,
      reconciled,
    };
  }

  private async resolveCreditoMatch(payerName: string, valor: number, paymentDate: Date) {
    const findMatches = payerName?.trim()
      ? (name: string, amount: number, date: Date) =>
          this.notasService.findOpenByNameAndValue(name, amount, date)
      : (_name: string, amount: number, date: Date) =>
          this.notasService.findOpenByValueAndDate(amount, date);

    const findScoredMatches = payerName?.trim()
      ? (name: string, amount: number, date: Date) =>
          this.notasService.findOpenMatches(name, amount, date)
      : async (name: string, amount: number, date: Date) => {
          const openNotes = await this.notasService.findOpenForConciliacao(name, amount, date);
          return openNotes;
        };

    const exactMatches = await findMatches(payerName || '', valor, paymentDate);

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

    const scoredMatches = await findScoredMatches(payerName || '', valor, paymentDate);
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
      const match = await this.resolveCreditoMatch(
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
          'nubank',
          pagamentoDetalhesFromNubank(lancamento),
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

  async updatePagadorNome(lancamentoId: string, pagador_nome: string) {
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
      throw new Error('Lançamento não está disponível para alteração');
    }

    const trimmed = pagador_nome.trim();
    await this.lancamentoModel.findByIdAndUpdate(lancamentoId, {
      $set: {
        pagador_nome: trimmed || undefined,
        pagador_nome_normalizado: trimmed ? normalizeName(trimmed) : undefined,
      },
    });

    const updated = asLeanOne<{
      pagador_nome?: string;
      valor?: number;
      data?: Date | string;
    }>(await this.lancamentoModel.findById(lancamentoId).lean());
    const scored = await this.notasService.findOpenForConciliacao(
      trimmed,
      lancamento.valor ?? 0,
      new Date(lancamento.data ?? Date.now()),
    );

    return {
      lancamento: updated,
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
      'nubank',
      pagamentoDetalhesFromNubank(lancamento),
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
      origem?: string;
      data?: Date | string;
      descricao?: string;
      pagador_nome?: string;
      valor?: number;
      categoria?: string;
      tipo_movimento?: TipoMovimento;
      json_original?: { tipo?: string };
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
    const { conta, cartao } = splitNubankLancamentosFluxoCaixa(lancamentos, undefined, notaById);

    const mapRow = (lancamento: (typeof lancamentos)[number]) => {
      if (lancamento.tipo_movimento) return lancamento.tipo_movimento;
      const original = lancamento as { json_original?: { tipo?: string } };
      return tipoMovimentoFromNubank(original.json_original?.tipo);
    };

    const { rows } = mapLancamentosToFluxoCaixaRows(
      conta,
      notaById,
      (lancamento) => lancamento.descricao || lancamento.pagador_nome || '',
      undefined,
      mapRow,
    );

    const { rows: cartaoRows } = mapLancamentosToFluxoCaixaRows(
      cartao,
      notaById,
      (lancamento) => lancamento.descricao || '',
      (lancamento) => lancamento.categoria,
      mapRow,
    );

    const header = resolveFluxoCaixaHeader(
      this.config,
      'nubank',
      params,
      await resolveSaldoInicialAutomatico(
        {
          lancamentoModel: this.lancamentoModel,
          importModel: this.importModel,
          config: this.config,
        },
        'nubank',
        params,
        conta,
      ),
    );
    enrichHeaderFromNotas(header, notas);

    let cartaoSection: FluxoCaixaCartaoSection | undefined;
    if (cartaoRows.length > 0) {
      const cartaoHeader = resolveFluxoCaixaHeader(
        this.config,
        'nubank',
        params,
        await resolveSaldoInicialAutomatico(
          {
            lancamentoModel: this.lancamentoModel,
            importModel: this.importModel,
            config: this.config,
          },
          'nubank',
          params,
          cartao,
        ),
      );
      cartaoHeader.empresaNome = header.empresaNome;
      cartaoHeader.empresaCnpj = header.empresaCnpj;
      cartaoSection = { header: cartaoHeader, rows: cartaoRows };
    }

    return { header, rows, cartao: cartaoSection };
  }

  async exportFluxoCaixa(params: FluxoCaixaExportParams): Promise<{ buffer: Buffer; filename: string }> {
    const { header, rows, cartao } = await this.prepareFluxoCaixaData(params);
    const buffer = await buildFluxoCaixaWorkbook('nubank', header, rows, cartao);

    return {
      buffer,
      filename: buildFluxoCaixaFilename('nubank', params),
    };
  }
}
