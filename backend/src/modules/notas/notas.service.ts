import { BadRequestException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  amountsEqual,
  AUTO_MATCH_MIN_NAME_SCORE,
  datesAreClose,
  DATE_AUTO_MATCH_WINDOW_DAYS,
  effectiveValorPago,
  nameSimilarity,
  notaSaldoAberto,
  pickDominantAutoMatch,
  scoreMatchCandidate,
} from '../extrato-asaas/name-match.util';
import {
  buildPagamentoEntry,
  pagamentoDetalhesFromAsaas,
  pagamentoDetalhesFromNubank,
  PagamentoSource,
} from './pagamento-detalhes.util';
import { PagamentoVinculoDetalhes } from './schemas/pagamento-vinculo.schema';
import { parsePrefeituraLink } from '../importacoes/prefeitura-link.util';
import { mapFromStoredJsonOriginal } from '../importacoes/nf-json.mapper';
import { mesCompetenciaFromDate } from './competencia.util';
import { NOTA_NAO_CANCELADA_FILTER } from './nota-cancelada.util';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import {
  buildPaymentDateMongoFilter,
  isDateInPaymentRange,
  resolvePaymentDateRange,
} from '../../common/payment-date-filter.util';

type NotaExtracaoLean = {
  valor?: number;
  valor_pago?: number;
  status_pagamento?: string;
  pagamentos?: Array<{ data?: Date | string; valor?: number }>;
  data_pagamento?: Date | string;
  [key: string]: unknown;
};

const PAYMENT_FIELDS = [
  'status_pagamento',
  'valor_pago',
  'asaas_lancamento_id',
  'asaas_lancamento_ids',
  'nubank_lancamento_id',
  'nubank_lancamento_ids',
  'data_pagamento',
  'pagamentos',
] as const;

export type { PagamentoSource };

const OPEN_PAYMENT_FILTER = {
  $and: [
    {
      $or: [
        { status_pagamento: 'em_aberto' },
        { status_pagamento: 'parcial' },
        { status_pagamento: { $exists: false } },
      ],
    },
    NOTA_NAO_CANCELADA_FILTER,
  ],
};

@Injectable()
export class NotasService {
  constructor(
    @InjectModel('Nota') private notaModel: Model<any>,
    @InjectModel('AsaasLancamento') private asaasLancamentoModel: Model<any>,
    @InjectModel('AsaasImportacao') private asaasImportModel: Model<any>,
    @InjectModel('NubankLancamento') private nubankLancamentoModel: Model<any>,
    @InjectModel('NubankImportacao') private nubankImportModel: Model<any>,
  ) {}

  buildSearchFilter(search?: string) {
    const term = search?.trim();
    if (!term) return {};

    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const orConditions: Record<string, unknown>[] = [
      { tomador: regex },
      { numero: regex },
      { nota_api_id: regex },
      { codigo_servico: regex },
      { status: regex },
      { status_pagamento: regex },
      { rps_id: regex },
    ];

    const numericTerm = term.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numericValue = Number.parseFloat(numericTerm);
    if (Number.isFinite(numericValue) && numericTerm.length > 0) {
      orConditions.push({ valor: numericValue });
    }

    return { $or: orConditions };
  }

  private stripPaymentFields(dto: Record<string, unknown>) {
    const updateDto = { ...dto };
    for (const field of PAYMENT_FIELDS) {
      delete updateDto[field];
    }
    return updateDto;
  }

  async create(dto: any) {
    const existsByApiId = dto.nota_api_id
      ? await this.notaModel.findOne({ nota_api_id: dto.nota_api_id })
      : null;
    if (existsByApiId) {
      return this.notaModel.findByIdAndUpdate(existsByApiId._id, this.stripPaymentFields(dto), {
        new: true,
      });
    }
    const existsByEmpresaNumero = await this.notaModel.findOne({
      empresa: dto.empresa,
      numero: dto.numero,
    });
    if (existsByEmpresaNumero) {
      return this.notaModel.findByIdAndUpdate(existsByEmpresaNumero._id, this.stripPaymentFields(dto), {
        new: true,
      });
    }
    return this.notaModel.create({
      ...dto,
      status_pagamento: dto.status_pagamento ?? 'em_aberto',
      valor_pago: dto.valor_pago ?? 0,
    });
  }

  async findAll(filter: any = {}, options: any = {}) {
    const { page = 1, limit = 50, sort = { data_emissao: -1, createdAt: -1 } } = options;
    const skip = (page - 1) * limit;
    const query = this.notaModel.find(filter).sort(sort).skip(skip).limit(limit);
    const items = await query.exec();
    const total = await this.notaModel.countDocuments(filter);
    return { items, total, page, limit };
  }

  scoreOpenNotes(
    openNotes: any[],
    payerName: string,
    valor: number,
    paymentDate: Date,
    minNameScore = 0.7,
  ) {
    return openNotes
      .map((nota) => ({
        nota,
        ...scoreMatchCandidate(nota, payerName, valor, paymentDate),
      }))
      .filter((item) => item.nameScore >= minNameScore)
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  scoreOpenNotesByValueDate(openNotes: any[], valor: number, paymentDate: Date) {
    return openNotes
      .map((nota) => ({
        nota,
        ...scoreMatchCandidate(nota, '', valor, paymentDate),
      }))
      .filter(
        (item) =>
          item.valueMatch ||
          item.partialMatch ||
          (item.competenciaMatch && item.dateClose),
      )
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  async findOpenByValueAndDate(valor: number, paymentDate: Date) {
    const openNotes = await this.notaModel.find(OPEN_PAYMENT_FILTER).lean();
    const scored = this.scoreOpenNotesByValueDate(openNotes, valor, paymentDate);

    const autoEligible = scored.filter((item) => {
      if (item.partialMatch) return true;
      if (!item.valueMatch) return false;
      if (item.competenciaMatch) return true;
      const emission = item.nota.data_emissao ? new Date(item.nota.data_emissao) : null;
      if (!emission || Number.isNaN(emission.getTime())) return false;
      return datesAreClose(paymentDate, emission, DATE_AUTO_MATCH_WINDOW_DAYS);
    });

    const dominant = pickDominantAutoMatch(autoEligible);
    if (dominant) return [dominant];
    if (autoEligible.length === 1) return [autoEligible[0].nota];

    return autoEligible.map((item) => item.nota);
  }

  async findOpenMatches(payerName: string, valor: number, paymentDate: Date) {
    const openNotes = await this.notaModel.find(OPEN_PAYMENT_FILTER).lean();
    return this.scoreOpenNotes(openNotes, payerName, valor, paymentDate);
  }

  async findOpenByNameAndValue(payerName: string, valor: number, paymentDate: Date) {
    const scored = await this.findOpenMatches(payerName, valor, paymentDate);
    const autoEligible = scored.filter((item) => {
      if (!item.valueMatch || item.nameScore < AUTO_MATCH_MIN_NAME_SCORE) return false;
      if (item.competenciaMatch) return true;
      const emission = item.nota.data_emissao ? new Date(item.nota.data_emissao) : null;
      if (!emission || Number.isNaN(emission.getTime())) return false;
      return datesAreClose(paymentDate, emission, DATE_AUTO_MATCH_WINDOW_DAYS);
    });

    const dominant = pickDominantAutoMatch(autoEligible);
    if (dominant) return [dominant];
    if (autoEligible.length === 1) return [autoEligible[0].nota];

    return autoEligible.map((item) => item.nota);
  }

  async findOpenByName(payerName: string, paymentDate?: Date, valor?: number) {
    const openNotes = await this.notaModel.find(OPEN_PAYMENT_FILTER).lean();
    if (paymentDate != null && valor != null) {
      return this.scoreOpenNotes(openNotes, payerName, valor, paymentDate, 0.7).map(
        (item) => item.nota,
      );
    }
    return openNotes
      .map((nota) => ({
        nota,
        score: nameSimilarity(nota.tomador || '', payerName),
      }))
      .filter((item) => item.score >= 0.7)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.nota);
  }

  async findOpenForConciliacao(payerName: string, valor: number, paymentDate: Date, search?: string) {
    const openNotes = await this.notaModel
      .find({
        ...OPEN_PAYMENT_FILTER,
        ...this.buildSearchFilter(search),
      })
      .lean();

    if (!payerName?.trim()) {
      const byValueDate = this.scoreOpenNotesByValueDate(openNotes, valor, paymentDate);
      if (byValueDate.length > 0) {
        return byValueDate;
      }
      if (search?.trim()) {
        return this.scoreOpenNotes(openNotes, '', valor, paymentDate, 0);
      }
      return byValueDate;
    }

    const scoredByName = this.scoreOpenNotes(openNotes, payerName, valor, paymentDate, 0.55);
    const valueMatches = scoredByName.filter((item) => item.valueMatch);
    if (valueMatches.length > 0) {
      return valueMatches;
    }

    const partialMatches = scoredByName.filter((item) => item.partialMatch);
    if (partialMatches.length > 0) {
      return partialMatches;
    }

    if (scoredByName.length > 0) {
      return scoredByName;
    }

    if (search?.trim()) {
      return this.scoreOpenNotes(openNotes, payerName, valor, paymentDate, 0);
    }

    return scoredByName;
  }

  async applyPayment(
    notaId: string,
    lancamentoId: string,
    paymentAmount: number,
    dataPagamento: Date,
    source: PagamentoSource = 'asaas',
    detalhes?: PagamentoVinculoDetalhes,
  ) {
    const nota = await this.notaModel.findById(notaId);
    if (!nota) {
      throw new BadRequestException('Nota não encontrada');
    }

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Valor do pagamento inválido');
    }

    const saldo = notaSaldoAberto(nota);
    if (amount > saldo + 0.01) {
      throw new BadRequestException(
        `Valor do pagamento (${amount.toFixed(2)}) excede o saldo em aberto da nota (${saldo.toFixed(2)})`,
      );
    }

    const alreadyLinked = (nota.pagamentos || []).some(
      (item: any) => String(item.lancamento_id) === String(lancamentoId),
    );

    const newValorPago = effectiveValorPago(nota) + amount;
    const total = Number(nota.valor ?? 0);
    const status_pagamento = newValorPago >= total - 0.01 ? 'pago' : 'parcial';

    const lancamentoIdsField =
      source === 'nubank' ? 'nubank_lancamento_ids' : 'asaas_lancamento_ids';
    const lancamentoIdField = source === 'nubank' ? 'nubank_lancamento_id' : 'asaas_lancamento_id';

    const update: Record<string, unknown> = {
      $set: {
        valor_pago: newValorPago,
        status_pagamento,
        [lancamentoIdField]: lancamentoId,
        data_pagamento: dataPagamento,
      },
      $addToSet: { [lancamentoIdsField]: lancamentoId },
    };

    if (!alreadyLinked) {
      update.$push = {
        pagamentos: buildPagamentoEntry(source, lancamentoId, amount, dataPagamento, detalhes),
      };
    }

    return this.notaModel.findByIdAndUpdate(notaId, update, { new: true });
  }

  async desvincularPagamento(notaId: string, lancamentoId: string, source: PagamentoSource) {
    const nota = await this.notaModel.findById(notaId);
    if (!nota) {
      throw new BadRequestException('Nota não encontrada');
    }

    const lancModel =
      source === 'nubank' ? this.nubankLancamentoModel : this.asaasLancamentoModel;
    const importModel =
      source === 'nubank' ? this.nubankImportModel : this.asaasImportModel;

    const lancamento = await lancModel.findById(lancamentoId);
    if (!lancamento) {
      throw new BadRequestException('Lançamento não encontrado');
    }

    const lancamentoIdsField =
      source === 'nubank' ? 'nubank_lancamento_ids' : 'asaas_lancamento_ids';
    const lancamentoIdField = source === 'nubank' ? 'nubank_lancamento_id' : 'asaas_lancamento_id';

    const pagamento = (nota.pagamentos || []).find(
      (item: any) =>
        String(item.lancamento_id) === String(lancamentoId) && item.source === source,
    );
    const linkedViaNota =
      pagamento != null ||
      (nota[lancamentoIdsField] || []).some((id: any) => String(id) === String(lancamentoId)) ||
      String(nota[lancamentoIdField] || '') === String(lancamentoId);

    if (!linkedViaNota) {
      throw new BadRequestException('Pagamento não está vinculado a esta nota');
    }

    const previousStatus = lancamento.status_conciliacao;
    if (!['conciliado_auto', 'conciliado_manual'].includes(previousStatus)) {
      throw new BadRequestException('Lançamento não está conciliado');
    }

    if (lancamento.nota_id && String(lancamento.nota_id) !== String(notaId)) {
      throw new BadRequestException('Lançamento vinculado a outra nota');
    }

    const remainingPagamentos = (nota.pagamentos || []).filter(
      (item: any) =>
        !(String(item.lancamento_id) === String(lancamentoId) && item.source === source),
    );
    const removedAmount = pagamento
      ? Number(pagamento.valor ?? 0)
      : Number(lancamento.valor ?? 0);
    const newValorPago = pagamento
      ? remainingPagamentos.reduce((sum: number, item: any) => sum + Number(item.valor ?? 0), 0)
      : Math.max(0, effectiveValorPago(nota) - removedAmount);
    const total = Number(nota.valor ?? 0);
    const status_pagamento =
      newValorPago <= 0.01
        ? 'em_aberto'
        : newValorPago >= total - 0.01
          ? 'pago'
          : 'parcial';

    const remainingIds = [...(nota[lancamentoIdsField] || [])]
      .map(String)
      .filter((id) => id !== String(lancamentoId));

    const latestPagamento = [...remainingPagamentos].sort(
      (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    )[0];

    await this.notaModel.findByIdAndUpdate(notaId, {
      $set: {
        valor_pago: newValorPago,
        status_pagamento,
        pagamentos: remainingPagamentos,
        [lancamentoIdField]: remainingIds.length ? remainingIds[remainingIds.length - 1] : null,
        data_pagamento: latestPagamento?.data ?? null,
        [lancamentoIdsField]: remainingIds,
      },
    });

    const candidatas = await this.findOpenByNameAndValue(
      lancamento.pagador_nome || '',
      lancamento.valor,
      new Date(lancamento.data),
    );

    await lancModel.findByIdAndUpdate(lancamentoId, {
      $set: {
        status_conciliacao: 'pendente_vinculo',
        nota_id: null,
        candidatas_nota_ids: candidatas.map((item: any) => item._id),
      },
    });

    if (lancamento.importacao_id) {
      const statsInc: Record<string, number> = { 'stats.pendente_vinculo': 1 };
      if (previousStatus === 'conciliado_manual') {
        statsInc['stats.conciliado_manual'] = -1;
      } else if (previousStatus === 'conciliado_auto') {
        statsInc['stats.conciliado_auto'] = -1;
      }
      await importModel.findByIdAndUpdate(lancamento.importacao_id, { $inc: statsInc });
    }

    const notaAtualizada = await this.notaModel.findById(notaId).lean();

    return {
      ok: true,
      nota_id: notaId,
      lancamento_id: lancamentoId,
      source,
      status_pagamento,
      valor_pago: newValorPago,
      nota: notaAtualizada,
    };
  }

  async backfillPagamentosHistorico() {
    const notas = await this.notaModel
      .find({
        $or: [
          { 'asaas_lancamento_ids.0': { $exists: true } },
          { 'nubank_lancamento_ids.0': { $exists: true } },
          { asaas_lancamento_id: { $exists: true, $ne: null } },
          { nubank_lancamento_id: { $exists: true, $ne: null } },
        ],
      })
      .lean();

    let atualizadas = 0;

    for (const nota of notas) {
      const linked = new Set(
        (nota.pagamentos || []).map((item: any) => `${item.source}:${item.lancamento_id}`),
      );
      const novos: any[] = [];

      const asaasIds = [
        ...new Set(
          [...(nota.asaas_lancamento_ids || []), nota.asaas_lancamento_id]
            .filter(Boolean)
            .map(String),
        ),
      ];
      for (const id of asaasIds) {
        const key = `asaas:${id}`;
        if (linked.has(key)) continue;
        const lanc = asLeanOne<{ valor?: number; data?: Date | string }>(
          await this.asaasLancamentoModel.findById(id).lean(),
        );
        if (!lanc || lanc.valor == null || !lanc.data) continue;
        novos.push(
          buildPagamentoEntry(
            'asaas',
            id,
            lanc.valor,
            new Date(lanc.data),
            pagamentoDetalhesFromAsaas(lanc),
          ),
        );
      }

      const nubankIds = [
        ...new Set(
          [...(nota.nubank_lancamento_ids || []), nota.nubank_lancamento_id]
            .filter(Boolean)
            .map(String),
        ),
      ];
      for (const id of nubankIds) {
        const key = `nubank:${id}`;
        if (linked.has(key)) continue;
        const lanc = asLeanOne<{ valor?: number; data?: Date | string }>(
          await this.nubankLancamentoModel.findById(id).lean(),
        );
        if (!lanc || lanc.valor == null || !lanc.data) continue;
        novos.push(
          buildPagamentoEntry(
            'nubank',
            id,
            lanc.valor,
            new Date(lanc.data),
            pagamentoDetalhesFromNubank(lanc),
          ),
        );
      }

      if (novos.length > 0) {
        await this.notaModel.findByIdAndUpdate(nota._id, { $push: { pagamentos: { $each: novos } } });
        atualizadas += 1;
      }
    }

    return { atualizadas, total_notas: notas.length };
  }

  async enrichNotasMetadata() {
    const notasPrefeitura = await this.notaModel
      .find({
        link_prefeitura: { $exists: true, $ne: '' },
        prefeitura_ccm: { $exists: false },
      })
      .lean();

    for (const nota of notasPrefeitura) {
      const prefeitura = parsePrefeituraLink(nota.link_prefeitura);
      if (prefeitura.prefeitura_ccm) {
        await this.notaModel.findByIdAndUpdate(nota._id, { $set: prefeitura });
      }
    }

    const notasSemCompetencia = await this.notaModel
      .find({
        data_emissao: { $exists: true, $ne: null },
        $or: [{ mes_competencia: { $exists: false } }, { mes_competencia: '' }],
      })
      .lean();

    for (const nota of notasSemCompetencia) {
      const mes_competencia = mesCompetenciaFromDate(nota.data_emissao);
      if (mes_competencia) {
        await this.notaModel.findByIdAndUpdate(nota._id, { $set: { mes_competencia } });
      }
    }

    const notasComJson = await this.notaModel
      .find({ json_original: { $exists: true, $ne: null } })
      .lean();

    for (const nota of notasComJson) {
      const legacy = !(nota.json_original as any)?.nf;
      const missingPrefeitura = nota.link_prefeitura && !nota.prefeitura_ccm;
      const missingCompetencia = !nota.mes_competencia;
      if (!legacy && !missingPrefeitura && !missingCompetencia) continue;

      const mapped = mapFromStoredJsonOriginal(nota.json_original);
      if (!mapped) continue;

      await this.notaModel.findByIdAndUpdate(nota._id, {
        $set: this.stripPaymentFields(mapped as Record<string, unknown>),
      });
    }
  }

  async findForExtracao(
    filters: {
      from?: string;
      to?: string;
      status_pagamento?: string;
      mes_pagamento?: string;
      mes_competencia?: string;
    } = {},
  ) {
    await this.enrichNotasMetadata();
    await this.backfillPagamentosHistorico();

    const { from, to } = resolvePaymentDateRange(filters);
    const paymentDateFilter = buildPaymentDateMongoFilter(from, to);

    const filter: Record<string, unknown> = {};
    if (paymentDateFilter) {
      filter.$or = [
        { data_pagamento: paymentDateFilter },
        { pagamentos: { $elemMatch: { data: paymentDateFilter } } },
      ];
    }
    if (filters.status_pagamento) {
      filter.status_pagamento = filters.status_pagamento;
    }

    const notas = asLeanMany<NotaExtracaoLean>(
      await this.notaModel.find(filter).sort({ data_pagamento: -1, data_emissao: -1, numero: -1 }).lean(),
    );

    const items = notas
      .map((nota) => {
        const pagamentosNoPeriodo = (nota.pagamentos || []).filter((pagamento) =>
          isDateInPaymentRange(pagamento.data, from, to),
        );
        const valorPagoPeriodo = pagamentosNoPeriodo.reduce(
          (sum, pagamento) => sum + Number(pagamento.valor ?? 0),
          0,
        );
        const temPagamentoNoPeriodo =
          pagamentosNoPeriodo.length > 0 || isDateInPaymentRange(nota.data_pagamento, from, to);

        if (paymentDateFilter && !temPagamentoNoPeriodo) {
          return null;
        }

        const valorPagoEfetivo =
          paymentDateFilter && pagamentosNoPeriodo.length > 0
            ? valorPagoPeriodo
            : effectiveValorPago(nota);

        return {
          ...nota,
          pagamentos: paymentDateFilter ? pagamentosNoPeriodo : nota.pagamentos,
          saldo_aberto: notaSaldoAberto(nota),
          valor_pago_efetivo: valorPagoEfetivo,
          qtd_pagamentos: (nota.pagamentos || []).length,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);

    return {
      items,
      total: items.length,
      totais: {
        valor_nf: items.reduce((sum, item) => sum + Number(item.valor ?? 0), 0),
        valor_pago: items.reduce((sum, item) => sum + Number(item.valor_pago_efetivo ?? 0), 0),
        saldo_aberto: items.reduce((sum, item) => sum + notaSaldoAberto(item), 0),
      },
    };
  }

  /** @deprecated use applyPayment */
  async markAsPaid(notaId: string, lancamentoId: string, dataPagamento: Date, paymentAmount?: number) {
    const nota = asLeanOne<{ valor?: number }>(await this.notaModel.findById(notaId).lean());
    const amount = paymentAmount ?? nota?.valor ?? 0;
    return this.applyPayment(notaId, lancamentoId, amount, dataPagamento, 'asaas');
  }

  async findById(id: string) {
    return this.notaModel.findById(id).lean();
  }
}
