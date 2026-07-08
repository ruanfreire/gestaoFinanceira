import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { asLeanMany, asLeanOne } from '../../../common/mongoose-lean.util';
import { normalizeName } from '../../../common/name-match.util';
import { resolveCreditoMatch } from '../../conciliacao/credito-match.util';
import { NotasService } from '../../notas/notas.service';
import { FreteTituloService } from './frete-titulo.service';
import type { DocumentEnvelopePayload } from '../types/document-envelope.types';

type BankLancamentoLean = {
  _id: unknown;
  importacao_id?: unknown;
  transacao_id?: string;
  data?: Date | string;
  descricao?: string;
  valor?: number;
  pagador_nome?: string;
  status_conciliacao?: string;
  vinculo_tipo?: string;
  nota_id?: unknown;
  frete_titulo_id?: unknown;
  candidatas_nota_ids?: unknown[];
  candidatas_frete_titulo_ids?: unknown[];
};

@Injectable()
export class FreteConciliacaoService {
  constructor(
    @InjectModel('BankLancamento') private readonly lancamentoModel: Model<BankLancamentoLean>,
    @InjectModel('BankImportacao') private readonly importModel: Model<unknown>,
    @InjectModel('FreteTitulo') private readonly freteModel: Model<Record<string, unknown>>,
    @InjectModel('DocumentEnvelope') private readonly envelopeModel: Model<Record<string, unknown>>,
    private readonly freteTituloService: FreteTituloService,
    private readonly notasService: NotasService,
  ) {}

  async resolveEntradaMatch(payerName: string, valor: number, paymentDate: Date) {
    const notaMatch = await resolveCreditoMatch(this.notasService, payerName, valor, paymentDate);
    if (notaMatch.status_conciliacao !== 'sem_match') {
      return { ...notaMatch, vinculo_tipo: 'nota' as const };
    }

    const freteMatch = await this.freteTituloService.resolveMatch(payerName, valor, paymentDate);
    if (freteMatch.status_conciliacao === 'conciliado_auto') {
      return { ...freteMatch, vinculo_tipo: 'frete' as const };
    }
    if (freteMatch.status_conciliacao === 'pendente_vinculo') {
      return { ...freteMatch, vinculo_tipo: 'frete' as const };
    }

    return { ...notaMatch, vinculo_tipo: undefined };
  }

  async tryMatchTituloWithLancamentos(freteTituloId: string) {
    const titulo = await this.freteTituloService.findById(freteTituloId);
    if (!titulo || titulo.status_pagamento === 'pago') return { matched: false };

    const valor = Number(titulo.valor ?? 0);
    const emissao = titulo.data_emissao ? new Date(titulo.data_emissao) : new Date();
    const payerName = titulo.tomador_nome || titulo.tomador_documento || '';

    const lancamentos = asLeanMany<BankLancamentoLean>(
      await this.lancamentoModel
        .find({
          tipo_movimento: 'entrada',
          status_conciliacao: { $in: ['sem_match', 'pendente_vinculo'] },
          vinculo_tipo: { $ne: 'nota' },
        })
        .sort({ data: -1 })
        .limit(200)
        .lean(),
    );

    for (const lancamento of lancamentos) {
      const scored = await this.freteTituloService.findForConciliacao(
        lancamento.pagador_nome || payerName,
        Number(lancamento.valor ?? 0),
        new Date(lancamento.data ?? Date.now()),
      );
      const exact = scored.find((s) => String(s.titulo._id) === freteTituloId && s.valueMatch);
      if (!exact) continue;

      if (exact.nameScore >= 0.8) {
        await this.applyFreteLink(String(lancamento._id), freteTituloId, 'conciliado_auto');
        return { matched: true, lancamento_id: String(lancamento._id) };
      }

      await this.lancamentoModel.findByIdAndUpdate(lancamento._id, {
        $set: {
          status_conciliacao: 'pendente_vinculo',
          vinculo_tipo: 'frete',
          candidatas_frete_titulo_ids: [freteTituloId],
          candidatas_nota_ids: [],
        },
      });
      return { matched: true, pending: true, lancamento_id: String(lancamento._id) };
    }

    return { matched: false };
  }

  async runBatchLink() {
    const openTitulos = await this.freteModel
      .find({ status_pagamento: { $in: ['aguardando_pagamento', 'parcial'] } })
      .lean();
    let autoLinked = 0;
    let pending = 0;

    for (const titulo of openTitulos) {
      const result = await this.tryMatchTituloWithLancamentos(String(titulo._id));
      if (result.matched && !result.pending) autoLinked += 1;
      if (result.pending) pending += 1;
    }

    await this.linkNfeToEnvelopes();

    return { autoLinked, pending, nfeLinks: await this.countNfeLinks() };
  }

  async linkNfeToEnvelopes() {
    const cteEnvelopes = await this.envelopeModel
      .find({ docType: 'cte', 'validation.ok': true })
      .lean();

    for (const env of cteEnvelopes) {
      const linked = (env.linkedDocuments as Array<{ chaveAcesso?: string }>) ?? [];
      const chaves = linked.map((d) => d.chaveAcesso).filter(Boolean);
      if (!chaves.length) continue;

      const nfeEnvelopes = await this.envelopeModel
        .find({
          docType: 'nfe',
          'fiscalKeys.chaveAcesso': { $in: chaves },
        })
        .lean();

      const links = [
        ...((env.links as Array<{ rel: string; targetDocumentId: string }>) ?? []),
        ...nfeEnvelopes.map((nfe) => ({
          rel: 'nfe_carga',
          targetDocumentId: String(nfe._id),
          score: 1,
        })),
      ];

      const unique = links.filter(
        (link, idx, arr) =>
          arr.findIndex((x) => x.targetDocumentId === link.targetDocumentId) === idx,
      );

      await this.envelopeModel.findByIdAndUpdate(env._id, { $set: { links: unique } });

      if (env.fiscalKeys && (env as Record<string, unknown>).fiscalKeys) {
        const chave = (env as { fiscalKeys?: { chaveAcesso?: string } }).fiscalKeys?.chaveAcesso;
        if (chave) {
          await this.freteModel.updateMany({ chave_cte: chave }, { $set: { linked_nfe_chaves: chaves } });
        }
      }
    }
  }

  async countNfeLinks() {
    return this.envelopeModel.countDocuments({
      docType: 'cte',
      'links.rel': 'nfe_carga',
    });
  }

  async listPendentes() {
    const lancamentos = asLeanMany<BankLancamentoLean>(
      await this.lancamentoModel
        .find({
          status_conciliacao: 'pendente_vinculo',
          vinculo_tipo: 'frete',
        })
        .sort({ data: -1 })
        .lean(),
    );

    const results = [];
    for (const lancamento of lancamentos) {
      const candidatas = await this.buildFreteCandidatas(lancamento);
      results.push({ lancamento, candidatas });
    }
    return results;
  }

  async listSemMatch() {
    const lancamentos = asLeanMany<BankLancamentoLean>(
      await this.lancamentoModel
        .find({
          status_conciliacao: 'sem_match',
          tipo_movimento: 'entrada',
        })
        .sort({ data: -1 })
        .lean(),
    );

    const results = [];
    for (const lancamento of lancamentos) {
      const scored = await this.freteTituloService.findForConciliacao(
        lancamento.pagador_nome || '',
        Number(lancamento.valor ?? 0),
        new Date(lancamento.data ?? Date.now()),
      );
      if (!scored.length) continue;
      results.push({
        lancamento,
        candidatas: await this.mapScoredToCandidatas(scored),
      });
    }
    return results;
  }

  async listTitulosParaLancamento(lancamentoId: string, q?: string) {
    const lancamento = asLeanOne<BankLancamentoLean>(await this.lancamentoModel.findById(lancamentoId).lean());
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');

    const scored = await this.freteTituloService.findForConciliacao(
      lancamento.pagador_nome || '',
      Number(lancamento.valor ?? 0),
      new Date(lancamento.data ?? Date.now()),
      q,
    );
    return { candidatas: await this.mapScoredToCandidatas(scored) };
  }

  async confirmFretePayment(
    lancamentoId: string,
    freteTituloId: string,
    paymentAmount: number,
    paymentDate: Date,
  ) {
    await this.freteTituloService.applyPayment(
      freteTituloId,
      lancamentoId,
      paymentAmount,
      paymentDate,
    );
  }

  async vincularManual(lancamentoId: string, freteTituloId: string) {
    const lancamento = await this.lancamentoModel.findById(lancamentoId);
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');
    if (!['pendente_vinculo', 'sem_match'].includes(String(lancamento.status_conciliacao))) {
      throw new BadRequestException('Lançamento não está disponível para vínculo');
    }

    const titulo = await this.freteTituloService.findById(freteTituloId);
    if (!titulo) throw new NotFoundException('Título de frete não encontrado');

    await this.applyFreteLink(lancamentoId, freteTituloId, 'conciliado_manual');
    return { ok: true };
  }

  async getCounts() {
    const [pendentes, aguardando] = await Promise.all([
      this.lancamentoModel.countDocuments({
        status_conciliacao: 'pendente_vinculo',
        vinculo_tipo: 'frete',
      }),
      this.freteModel.countDocuments({ status_pagamento: 'aguardando_pagamento' }),
    ]);
    return { pendentes, aguardando_pagamento: aguardando };
  }

  private async applyFreteLink(
    lancamentoId: string,
    freteTituloId: string,
    status: 'conciliado_auto' | 'conciliado_manual',
  ) {
    const lancamento = await this.lancamentoModel.findById(lancamentoId).lean();
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');

    await this.freteTituloService.applyPayment(
      freteTituloId,
      lancamentoId,
      Number(lancamento.valor ?? 0),
      new Date(lancamento.data ?? Date.now()),
    );

    await this.lancamentoModel.findByIdAndUpdate(lancamentoId, {
      $set: {
        status_conciliacao: status,
        vinculo_tipo: 'frete',
        frete_titulo_id: freteTituloId,
        candidatas_frete_titulo_ids: [],
        nota_id: undefined,
        candidatas_nota_ids: [],
      },
    });
  }

  private async buildFreteCandidatas(lancamento: BankLancamentoLean) {
    const ids = (lancamento.candidatas_frete_titulo_ids ?? []).map(String);
    if (ids.length) {
      const titulos = await this.freteModel.find({ _id: { $in: ids } }).lean();
      return titulos.map((t) => this.mapTituloCandidata(t));
    }

    const scored = await this.freteTituloService.findForConciliacao(
      lancamento.pagador_nome || '',
      Number(lancamento.valor ?? 0),
      new Date(lancamento.data ?? Date.now()),
    );
    return this.mapScoredToCandidatas(scored);
  }

  private async mapScoredToCandidatas(scored: Awaited<ReturnType<FreteTituloService['findForConciliacao']>>) {
    return scored.map((s) => ({
      ...this.mapTituloCandidata(s.titulo),
      match: {
        nameScore: s.nameScore,
        valueMatch: s.valueMatch,
        daysDiff: s.daysDiff,
        dateClose: s.dateClose,
        totalScore: s.totalScore,
      },
    }));
  }

  private mapTituloCandidata(titulo: Record<string, unknown>) {
    return {
      _id: String(titulo._id),
      numero: titulo.numero as string | undefined,
      chave_cte: titulo.chave_cte as string | undefined,
      tomador_nome: titulo.tomador_nome as string | undefined,
      valor: titulo.valor as number | undefined,
      data_emissao: titulo.data_emissao as string | undefined,
      status_pagamento: titulo.status_pagamento as string | undefined,
    };
  }

  enrichEnvelopeWithNfeLinks(envelope: DocumentEnvelopePayload): DocumentEnvelopePayload {
    return envelope;
  }
}
