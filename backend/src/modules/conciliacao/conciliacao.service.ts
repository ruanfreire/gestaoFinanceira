import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { sumConciliacaoCounts } from './conciliacao-counts.util';

@Injectable()
export class ConciliacaoService {
  constructor(
    @InjectModel('AsaasLancamento') private asaasLancamentoModel: Model<unknown>,
    @InjectModel('NubankLancamento') private nubankLancamentoModel: Model<unknown>,
  ) {}

  private async countByStatus(model: Model<unknown>, status: string) {
    return model.countDocuments({ status_conciliacao: status });
  }

  async getCounts() {
    const [asaasPendentes, asaasSemMatch, nubankPendentes, nubankSemMatch] = await Promise.all([
      this.countByStatus(this.asaasLancamentoModel, 'pendente_vinculo'),
      this.countByStatus(this.asaasLancamentoModel, 'sem_match'),
      this.countByStatus(this.nubankLancamentoModel, 'pendente_vinculo'),
      this.countByStatus(this.nubankLancamentoModel, 'sem_match'),
    ]);

    const asaas = { pendentes: asaasPendentes, sem_match: asaasSemMatch };
    const nubank = { pendentes: nubankPendentes, sem_match: nubankSemMatch };
    const totals = sumConciliacaoCounts(asaas, nubank);

    return { ...totals, asaas, nubank };
  }
}
