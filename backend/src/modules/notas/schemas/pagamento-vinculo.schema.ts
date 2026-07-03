import { Schema } from 'mongoose';

export const PagamentoVinculoSchema = new Schema(
  {
    source: { type: String, enum: ['bank'], required: true },
    lancamento_id: { type: Schema.Types.ObjectId, required: true, index: true },
    transacao_id: { type: String, index: true },
    valor: { type: Number, required: true },
    data: { type: Date, index: true },
    descricao: { type: String },
    pagador_nome: { type: String },
    fatura_cobranca_id: { type: String, index: true },
    fatura_parcelamento_id: { type: String },
    tipo_transacao: { type: String },
    tipo_lancamento: { type: String },
    categoria: { type: String },
    identificador: { type: String },
    saldo_pos_lancamento: { type: Number },
  },
  { timestamps: true },
);

export type PagamentoVinculoDetalhes = {
  transacao_id?: string;
  descricao?: string;
  pagador_nome?: string;
  fatura_cobranca_id?: string;
  fatura_parcelamento_id?: string;
  tipo_transacao?: string;
  tipo_lancamento?: string;
  categoria?: string;
  identificador?: string;
  saldo_pos_lancamento?: number;
};
