import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotasService } from '../notas/notas.service';
import { FreteConciliacaoService } from '../document-core/services/frete-conciliacao.service';
import { EntitlementsService } from '../../common/entitlements/entitlements.service';
import { resolveCreditoMatch } from './credito-match.util';

type BankLancamentoLean = {
  _id: unknown;
  importacao_id?: unknown;
  transacao_id?: string;
  data?: Date;
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
export class ConciliacaoService {
  constructor(
    @InjectModel('BankLancamento') private bankLancamentoModel: Model<unknown>,
    @InjectModel('BankImportacao') private bankImportModel: Model<unknown>,
    private readonly notasService: NotasService,
    private readonly freteConciliacao: FreteConciliacaoService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  private async countByStatus(status: string) {
    return this.bankLancamentoModel.countDocuments({ status_conciliacao: status });
  }

  async getCounts() {
    const logisticsEnabled = await this.entitlementsService.hasModuleForCurrentTenant('logistics_frete');
    const [pendentes, sem_match, frete] = await Promise.all([
      this.countByStatus('pendente_vinculo'),
      this.countByStatus('sem_match'),
      logisticsEnabled
        ? this.freteConciliacao.getCounts()
        : Promise.resolve({ pendentes: 0, aguardando_pagamento: 0 }),
    ]);

    return { pendentes, sem_match, frete_pendentes: frete.pendentes, frete_aguardando: frete.aguardando_pagamento };
  }

  /** Reavalia recebimentos pendentes após novas notas ou CT-e entrarem no sistema. */
  async rematchPendingLancamentos(): Promise<{ vinculadas: number }> {
    const logisticsEnabled = await this.entitlementsService.hasModuleForCurrentTenant('logistics_frete');
    const pending = (await this.bankLancamentoModel
      .find({
        status_conciliacao: { $in: ['sem_match', 'pendente_vinculo'] },
        tipo_movimento: 'entrada',
      })
      .lean()) as BankLancamentoLean[];

    let vinculadas = 0;

    for (const lancamento of pending) {
      const previousStatus = lancamento.status_conciliacao;
      const match = logisticsEnabled
        ? await this.freteConciliacao.resolveEntradaMatch(
            lancamento.pagador_nome || '',
            Number(lancamento.valor ?? 0),
            new Date(lancamento.data ?? Date.now()),
          )
        : {
            ...(await resolveCreditoMatch(
              this.notasService,
              lancamento.pagador_nome || '',
              Number(lancamento.valor ?? 0),
              new Date(lancamento.data ?? Date.now()),
            )),
            vinculo_tipo: 'nota' as const,
          };

      if (match.vinculo_tipo === 'nota' && match.status_conciliacao === 'conciliado_auto' && 'nota_id' in match) {
        await this.notasService.applyPayment(
          match.nota_id,
          String(lancamento._id),
          Number(lancamento.valor ?? 0),
          new Date(lancamento.data ?? Date.now()),
          'bank',
          {
            transacao_id: lancamento.transacao_id,
            descricao: lancamento.descricao,
            pagador_nome: lancamento.pagador_nome,
          },
        );

        await this.bankLancamentoModel.findByIdAndUpdate(lancamento._id, {
          $set: {
            status_conciliacao: 'conciliado_auto',
            vinculo_tipo: 'nota',
            nota_id: match.nota_id,
            candidatas_nota_ids: [],
            frete_titulo_id: undefined,
            candidatas_frete_titulo_ids: [],
          },
        });

        vinculadas += 1;
        await this.adjustImportStats(lancamento, previousStatus, 'conciliado_auto');
        continue;
      }

      if (
        match.vinculo_tipo === 'frete' &&
        match.status_conciliacao === 'conciliado_auto' &&
        'frete_titulo_id' in match
      ) {
        await this.freteConciliacao.confirmFretePayment(
          String(lancamento._id),
          match.frete_titulo_id,
          Number(lancamento.valor ?? 0),
          new Date(lancamento.data ?? Date.now()),
        );

        await this.bankLancamentoModel.findByIdAndUpdate(lancamento._id, {
          $set: {
            status_conciliacao: 'conciliado_auto',
            vinculo_tipo: 'frete',
            frete_titulo_id: match.frete_titulo_id,
            candidatas_frete_titulo_ids: [],
            nota_id: undefined,
            candidatas_nota_ids: [],
          },
        });

        vinculadas += 1;
        await this.adjustImportStats(lancamento, previousStatus, 'conciliado_auto');
        continue;
      }

      if (match.status_conciliacao === 'pendente_vinculo') {
        const isFrete = match.vinculo_tipo === 'frete';
        const newIds = isFrete
          ? [...(('candidatas_frete_titulo_ids' in match && match.candidatas_frete_titulo_ids) || [])].sort().join(',')
          : [...(('candidatas_nota_ids' in match && match.candidatas_nota_ids) || [])].sort().join(',');
        const oldIds = isFrete
          ? (lancamento.candidatas_frete_titulo_ids || []).map(String).sort().join(',')
          : (lancamento.candidatas_nota_ids || []).map(String).sort().join(',');

        if (newIds === oldIds && previousStatus === 'pendente_vinculo') continue;

        await this.bankLancamentoModel.findByIdAndUpdate(lancamento._id, {
          $set: isFrete
            ? {
                status_conciliacao: 'pendente_vinculo',
                vinculo_tipo: 'frete',
                candidatas_frete_titulo_ids: match.candidatas_frete_titulo_ids,
                candidatas_nota_ids: [],
                nota_id: undefined,
              }
            : {
                status_conciliacao: 'pendente_vinculo',
                vinculo_tipo: 'nota',
                candidatas_nota_ids: match.candidatas_nota_ids,
                candidatas_frete_titulo_ids: [],
                frete_titulo_id: undefined,
              },
        });

        if (previousStatus === 'sem_match' && lancamento.importacao_id) {
          await this.bankImportModel.findByIdAndUpdate(lancamento.importacao_id, {
            $inc: { 'stats.sem_match': -1, 'stats.pendente_vinculo': 1 },
          });
        }
      }
    }

    if (logisticsEnabled) {
      await this.freteConciliacao.runBatchLink();
    }

    return { vinculadas };
  }

  private async adjustImportStats(
    lancamento: BankLancamentoLean,
    previousStatus: string | undefined,
    nextStatus: string,
  ) {
    if (!lancamento.importacao_id || previousStatus === nextStatus) return;
    const statsInc: Record<string, number> = { [`stats.${nextStatus}`]: 1 };
    if (previousStatus === 'pendente_vinculo') statsInc['stats.pendente_vinculo'] = -1;
    else if (previousStatus === 'sem_match') statsInc['stats.sem_match'] = -1;
    await this.bankImportModel.findByIdAndUpdate(lancamento.importacao_id, { $inc: statsInc });
  }
}
