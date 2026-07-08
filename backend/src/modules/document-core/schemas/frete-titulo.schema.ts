import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

export const FreteTituloSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    documentEnvelopeId: { type: Schema.Types.ObjectId, ref: 'DocumentEnvelope', index: true },
    chave_cte: { type: String, index: true },
    numero: String,
    serie: String,
    emitente_nome: String,
    emitente_cnpj: String,
    tomador_nome: String,
    tomador_documento: String,
    tomador_nome_normalizado: { type: String, index: true },
    valor: { type: Number, index: true },
    data_emissao: { type: Date, index: true },
    competencia: String,
    linked_nfe_chaves: { type: [String], default: [] },
    lancamento_id: { type: Schema.Types.ObjectId, ref: 'BankLancamento', sparse: true },
    status_pagamento: {
      type: String,
      enum: ['aguardando_pagamento', 'parcial', 'pago'],
      default: 'aguardando_pagamento',
      index: true,
    },
    valor_pago: { type: Number, default: 0 },
    data_pagamento: Date,
  },
  { timestamps: true },
);

FreteTituloSchema.plugin(tenantPlugin);
FreteTituloSchema.index({ tenantId: 1, chave_cte: 1 }, { unique: true });
