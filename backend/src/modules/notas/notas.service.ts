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
} from '../../common/name-match.util';
import {
  buildPagamentoEntry,
  pagamentoDetalhesFromLancamento,
  PagamentoSource,
} from './pagamento-detalhes.util';
import { PagamentoVinculoDetalhes } from './schemas/pagamento-vinculo.schema';
import { parsePrefeituraLink } from '../importacoes/prefeitura-link.util';
import { mapFromStoredJsonOriginal } from '../importacoes/nf-json.mapper';
import { mesCompetenciaFromDate } from './competencia.util';
import { NOTA_NAO_CANCELADA_FILTER } from './nota-cancelada.util';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import { getCurrentTenantId } from '../../common/tenant/tenant-storage';
import { PlanLimitsService } from '../billing/plan-limits.service';
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

const PAYMENT_FIELDS = ['status_pagamento', 'valor_pago', 'data_pagamento', 'pagamentos'] as const;

function isBankPaymentSource(source?: string): boolean {
  return source === 'bank' || source === 'custom';
}

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
    @InjectModel('BankLancamento') private bankLancamentoModel: Model<any>,
    @InjectModel('BankImportacao') private bankImportModel: Model<any>,
    private readonly planLimitsService: PlanLimitsService,
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
    await this.planLimitsService.assertCanCreateNotas();
    const existsByApiId = dto.nota_api_id
      ? await this.notaModel.findOne({ nota_api_id: dto.nota_api_id }).lean()
      : null;
    if (existsByApiId) {
      return existsByApiId;
    }
    const existsByEmpresaNumero = await this.notaModel
      .findOne({
        empresa: dto.empresa,
        numero: dto.numero,
      })
      .lean();
    if (existsByEmpresaNumero) {
      return existsByEmpresaNumero;
    }
    return this.notaModel.create({
      ...dto,
      status_pagamento: dto.status_pagamento ?? 'em_aberto',
      valor_pago: dto.valor_pago ?? 0,
    });
  }

  /** Importação em lote — apenas insere notas novas; existentes são ignoradas. */
  async importBulk(
    dtos: any[],
    options: { batchSize?: number } = {},
  ): Promise<{ imported: number; updated: number; ignored: number }> {
    const batchSize = Math.min(100, Math.max(10, options.batchSize ?? 40));
    const tenantId = getCurrentTenantId();
    let imported = 0;
    const updated = 0;
    let ignored = 0;

    if (tenantId && dtos.length > 0) {
      const apiIds = [...new Set(dtos.map((d) => d.nota_api_id).filter(Boolean))];
      const empresaNumeros = dtos
        .filter((d) => d.empresa && d.numero)
        .map((d) => ({ empresa: d.empresa, numero: d.numero }));

      const orphanFilter: Record<string, unknown>[] = [];
      if (apiIds.length) orphanFilter.push({ nota_api_id: { $in: apiIds } });
      for (const entry of empresaNumeros) {
        orphanFilter.push({ empresa: entry.empresa, numero: entry.numero });
      }
      if (orphanFilter.length) {
        await this.notaModel.collection.updateMany(
          { tenantId: { $exists: false }, $or: orphanFilter },
          { $set: { tenantId } },
        );
      }
    }

    for (let offset = 0; offset < dtos.length; offset += batchSize) {
      const batch = dtos.slice(offset, offset + batchSize);
      const apiIds = [...new Set(batch.map((d) => d.nota_api_id).filter(Boolean))];
      const empresaNumeros = batch
        .filter((d) => d.empresa && d.numero)
        .map((d) => ({ empresa: d.empresa, numero: d.numero }));

      const [byApiId, byEmpresaNumero] = await Promise.all([
        apiIds.length
          ? this.notaModel
              .find({ nota_api_id: { $in: apiIds } })
              .select('_id nota_api_id')
              .lean()
          : Promise.resolve([]),
        empresaNumeros.length
          ? this.notaModel
              .find({
                $or: empresaNumeros.map((e) => ({ empresa: e.empresa, numero: e.numero })),
              })
              .select('_id empresa numero')
              .lean()
          : Promise.resolve([]),
      ]);

      const apiIdMap = new Map(
        asLeanMany<{ _id: unknown; nota_api_id?: string }>(byApiId).map((n) => [
          String(n.nota_api_id),
          n,
        ]),
      );
      const empresaNumeroMap = new Map(
        asLeanMany<{ _id: unknown; empresa?: string; numero?: string }>(byEmpresaNumero).map(
          (n) => [`${n.empresa}::${n.numero}`, n],
        ),
      );

      const bulkOps: any[] = [];
      for (const dto of batch) {
        const stripped = this.stripPaymentFields(dto);
        if (!stripped.numero) {
          ignored++;
          continue;
        }

        let existing = dto.nota_api_id ? apiIdMap.get(String(dto.nota_api_id)) : undefined;
        if (!existing && dto.empresa && dto.numero) {
          existing = empresaNumeroMap.get(`${dto.empresa}::${dto.numero}`);
        }

        if (existing) {
          ignored++;
          continue;
        }

        bulkOps.push({
          insertOne: {
            document: {
              ...stripped,
              ...(tenantId ? { tenantId } : {}),
              status_pagamento: stripped.status_pagamento ?? 'em_aberto',
              valor_pago: stripped.valor_pago ?? 0,
            },
          },
        });
        imported++;
      }

      if (bulkOps.length) {
        await this.notaModel.bulkWrite(bulkOps, { ordered: false });
      }

      await new Promise((resolve) => setImmediate(resolve));
    }

    return { imported, updated, ignored };
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
    _source: PagamentoSource = 'bank',
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

    const update: Record<string, unknown> = {
      $set: {
        valor_pago: newValorPago,
        status_pagamento,
        data_pagamento: dataPagamento,
      },
    };
    if (!alreadyLinked) {
      update.$push = {
        pagamentos: buildPagamentoEntry('bank', lancamentoId, amount, dataPagamento, detalhes),
      };
    }
    return this.notaModel.findByIdAndUpdate(notaId, update, { new: true });
  }

  async desvincularPagamento(notaId: string, lancamentoId: string, _source?: PagamentoSource) {
    const nota = await this.notaModel.findById(notaId);
    if (!nota) {
      throw new BadRequestException('Nota não encontrada');
    }

    const lancamento = await this.bankLancamentoModel.findById(lancamentoId);
    if (!lancamento) {
      throw new BadRequestException('Lançamento não encontrado');
    }

    const pagamento = (nota.pagamentos || []).find(
      (item: any) =>
        String(item.lancamento_id) === String(lancamentoId) && isBankPaymentSource(item.source),
    );
    if (!pagamento) {
      throw new BadRequestException('Pagamento não está vinculado a esta nota');
    }

    const previousStatus = lancamento.status_conciliacao;
    if (!['conciliado_auto', 'conciliado_manual'].includes(previousStatus)) {
      throw new BadRequestException('Lançamento não está conciliado');
    }

    const remainingPagamentos = (nota.pagamentos || []).filter(
      (item: any) =>
        !(String(item.lancamento_id) === String(lancamentoId) && isBankPaymentSource(item.source)),
    );
    const removedAmount = Number(pagamento.valor ?? 0);
    const newValorPago = remainingPagamentos.reduce(
      (sum: number, item: any) => sum + Number(item.valor ?? 0),
      0,
    );
    const total = Number(nota.valor ?? 0);
    const status_pagamento =
      newValorPago <= 0.01 ? 'em_aberto' : newValorPago >= total - 0.01 ? 'pago' : 'parcial';

    const latestPagamento = [...remainingPagamentos].sort(
      (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    )[0];

    await this.notaModel.findByIdAndUpdate(notaId, {
      $set: {
        valor_pago: newValorPago,
        status_pagamento,
        pagamentos: remainingPagamentos,
        data_pagamento: latestPagamento?.data ?? null,
      },
    });

    const candidatas = await this.findOpenByNameAndValue(
      lancamento.pagador_nome || '',
      lancamento.valor,
      new Date(lancamento.data),
    );

    await this.bankLancamentoModel.findByIdAndUpdate(lancamentoId, {
      $set: {
        status_conciliacao: 'pendente_vinculo',
        nota_id: null,
        candidatas_nota_ids: candidatas.map((item: any) => item._id),
      },
    });

    if (lancamento.importacao_id) {
      const statsInc: Record<string, number> = { 'stats.pendente_vinculo': 1 };
      if (previousStatus === 'conciliado_manual') statsInc['stats.conciliado_manual'] = -1;
      else if (previousStatus === 'conciliado_auto') statsInc['stats.conciliado_auto'] = -1;
      await this.bankImportModel.findByIdAndUpdate(lancamento.importacao_id, { $inc: statsInc });
    }

    const notaAtualizada = await this.notaModel.findById(notaId).lean();
    return {
      ok: true,
      nota_id: notaId,
      lancamento_id: lancamentoId,
      source: 'bank' as const,
      status_pagamento,
      valor_pago: newValorPago,
      nota: notaAtualizada,
    };
  }

  async backfillPagamentosHistorico() {
    return { atualizadas: 0, total_notas: 0 };
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
      date_basis?: 'pagamento' | 'emissao';
    } = {},
  ) {
    await this.enrichNotasMetadata();
    await this.backfillPagamentosHistorico();

    const dateBasis = filters.date_basis === 'emissao' ? 'emissao' : 'pagamento';
    const { from, to } = resolvePaymentDateRange(filters);
    const dateFilter = buildPaymentDateMongoFilter(from, to);

    if (dateBasis === 'emissao') {
      const filter: Record<string, unknown> = {};
      if (dateFilter) {
        filter.data_emissao = dateFilter;
      }
      if (filters.status_pagamento) {
        filter.status_pagamento = filters.status_pagamento;
      }

      const notas = asLeanMany<NotaExtracaoLean>(
        await this.notaModel.find(filter).sort({ data_emissao: -1, numero: -1 }).lean(),
      );

      const items = notas.map((nota) => ({
        ...nota,
        pagamentos: nota.pagamentos,
        saldo_aberto: notaSaldoAberto(nota),
        valor_pago_efetivo: effectiveValorPago(nota),
        qtd_pagamentos: (nota.pagamentos || []).length,
      }));

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

    const filter: Record<string, unknown> = {};
    if (dateFilter) {
      filter.$or = [
        { data_pagamento: dateFilter },
        { pagamentos: { $elemMatch: { data: dateFilter } } },
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

        if (dateFilter && !temPagamentoNoPeriodo) {
          return null;
        }

        const valorPagoEfetivo =
          dateFilter && pagamentosNoPeriodo.length > 0
            ? valorPagoPeriodo
            : effectiveValorPago(nota);

        return {
          ...nota,
          pagamentos: dateFilter ? pagamentosNoPeriodo : nota.pagamentos,
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
    return this.applyPayment(notaId, lancamentoId, amount, dataPagamento, 'bank');
  }

  async findById(id: string) {
    return this.notaModel.findById(id).lean();
  }

  /** Remove notas criadas por uma importação JSON e desvincula pagamentos. */
  async deleteByImportacaoFaturaId(importacaoId: string): Promise<{ deleted: number }> {
    const notas = asLeanMany<{
      _id: unknown;
      pagamentos?: Array<{ lancamento_id?: unknown; source?: string }>;
    }>(await this.notaModel.find({ importacao_fatura_id: importacaoId }).lean());

    for (const nota of notas) {
      const notaId = String(nota._id);
      const seen = new Set<string>();

      for (const pag of nota.pagamentos || []) {
        if (!pag.lancamento_id || !isBankPaymentSource(pag.source)) continue;
        const key = String(pag.lancamento_id);
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          await this.desvincularPagamento(notaId, key, 'bank');
        } catch {
          await this.bankLancamentoModel.updateMany(
            { _id: pag.lancamento_id, nota_id: notaId },
            {
              $set: { nota_id: null, status_conciliacao: 'pendente_vinculo' },
              $pull: { candidatas_nota_ids: notaId },
            },
          );
        }
      }

      await this.bankLancamentoModel.updateMany(
        { candidatas_nota_ids: notaId },
        { $pull: { candidatas_nota_ids: notaId } },
      );
    }

    const result = await this.notaModel.deleteMany({ importacao_fatura_id: importacaoId });
    return { deleted: result.deletedCount ?? 0 };
  }
}
