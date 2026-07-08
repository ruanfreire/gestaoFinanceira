import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizeName } from '../../../common/name-match.util';
import {
  OPEN_FRETE_FILTER,
  resolveFreteMatchFromScored,
  scoreFreteTitulos,
  type FreteMatchResult,
  type FreteTituloLean,
  type ScoredFreteMatch,
} from '../utils/frete-match.util';

@Injectable()
export class FreteTituloService {
  constructor(@InjectModel('FreteTitulo') private readonly freteModel: Model<FreteTituloLean>) {}

  async resolveMatch(payerName: string, valor: number, paymentDate: Date): Promise<FreteMatchResult> {
    const titulos = await this.freteModel.find(OPEN_FRETE_FILTER).lean();
    const scored = scoreFreteTitulos(titulos, payerName, valor, paymentDate);
    return resolveFreteMatchFromScored(scored, paymentDate);
  }

  async findForConciliacao(
    payerName: string,
    valor: number,
    paymentDate: Date,
    search?: string,
  ): Promise<ScoredFreteMatch[]> {
    const filter: Record<string, unknown> = { ...OPEN_FRETE_FILTER };
    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { tomador_nome: { $regex: q, $options: 'i' } },
        { numero: { $regex: q, $options: 'i' } },
        { chave_cte: { $regex: q, $options: 'i' } },
      ];
    }
    const titulos = await this.freteModel.find(filter).lean();
    return scoreFreteTitulos(titulos, payerName, valor, paymentDate, search?.trim() ? 0.3 : 0.55);
  }

  async findById(id: string) {
    return this.freteModel.findById(id).lean();
  }

  async applyPayment(
    freteTituloId: string,
    lancamentoId: string,
    paymentAmount: number,
    paymentDate: Date,
  ) {
    const titulo = await this.freteModel.findById(freteTituloId);
    if (!titulo) throw new NotFoundException('Título de frete não encontrado');

    const valorTotal = Number(titulo.valor ?? 0);
    const valorPago = Number(titulo.valor_pago ?? 0) + paymentAmount;
    const status =
      valorPago >= valorTotal - 0.01 ? 'pago' : valorPago > 0 ? 'parcial' : 'aguardando_pagamento';

    await this.freteModel.findByIdAndUpdate(freteTituloId, {
      $set: {
        lancamento_id: lancamentoId,
        valor_pago: valorPago,
        data_pagamento: paymentDate,
        status_pagamento: status,
      },
    });
  }

  stampTomadorNormalizado(tomadorNome?: string) {
    return tomadorNome ? normalizeName(tomadorNome) : undefined;
  }
}
