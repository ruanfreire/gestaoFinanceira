import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotasService } from '../notas/notas.service';
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
  nota_id?: unknown;
  candidatas_nota_ids?: unknown[];
};

@Injectable()
export class ConciliacaoService {
  constructor(
    @InjectModel('BankLancamento') private bankLancamentoModel: Model<unknown>,
    @InjectModel('BankImportacao') private bankImportModel: Model<unknown>,
    private readonly notasService: NotasService,
  ) {}

  private async countByStatus(status: string) {
    return this.bankLancamentoModel.countDocuments({ status_conciliacao: status });
  }

  async getCounts() {
    const [pendentes, sem_match] = await Promise.all([
      this.countByStatus('pendente_vinculo'),
      this.countByStatus('sem_match'),
    ]);

    return { pendentes, sem_match };
  }

  /** Reavalia recebimentos pendentes após novas notas fiscais entrarem no sistema. */
  async rematchPendingLancamentos(): Promise<{ vinculadas: number }> {
    const pending = (await this.bankLancamentoModel
      .find({
        status_conciliacao: { $in: ['sem_match', 'pendente_vinculo'] },
        tipo_movimento: 'entrada',
      })
      .lean()) as BankLancamentoLean[];

    let vinculadas = 0;

    for (const lancamento of pending) {
      const previousStatus = lancamento.status_conciliacao;
      const match = await resolveCreditoMatch(
        this.notasService,
        lancamento.pagador_nome || '',
        Number(lancamento.valor ?? 0),
        new Date(lancamento.data ?? Date.now()),
      );

      if (match.status_conciliacao === 'conciliado_auto' && 'nota_id' in match) {
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
            nota_id: match.nota_id,
            candidatas_nota_ids: [],
          },
        });

        vinculadas += 1;

        if (lancamento.importacao_id) {
          const statsInc: Record<string, number> = { 'stats.conciliado_auto': 1 };
          if (previousStatus === 'pendente_vinculo') statsInc['stats.pendente_vinculo'] = -1;
          else if (previousStatus === 'sem_match') statsInc['stats.sem_match'] = -1;
          await this.bankImportModel.findByIdAndUpdate(lancamento.importacao_id, { $inc: statsInc });
        }
        continue;
      }

      if (match.status_conciliacao === 'pendente_vinculo') {
        const newIds = [...match.candidatas_nota_ids].sort().join(',');
        const oldIds = (lancamento.candidatas_nota_ids || []).map(String).sort().join(',');
        if (newIds === oldIds && previousStatus === 'pendente_vinculo') continue;

        await this.bankLancamentoModel.findByIdAndUpdate(lancamento._id, {
          $set: {
            status_conciliacao: 'pendente_vinculo',
            candidatas_nota_ids: match.candidatas_nota_ids,
            nota_id: undefined,
          },
        });

        if (previousStatus === 'sem_match' && lancamento.importacao_id) {
          await this.bankImportModel.findByIdAndUpdate(lancamento.importacao_id, {
            $inc: { 'stats.sem_match': -1, 'stats.pendente_vinculo': 1 },
          });
        }
      }
    }

    return { vinculadas };
  }
}
