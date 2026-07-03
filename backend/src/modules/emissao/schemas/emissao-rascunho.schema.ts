import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

export const EmissaoRascunhoSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    lancamento_id: { type: Schema.Types.ObjectId, ref: 'BankLancamento', index: true },
    tomador_id: { type: Schema.Types.ObjectId, ref: 'Tomador', index: true },
    payload: {
      valor: { type: Number },
      codigo_servico: { type: String },
      discriminacao: { type: String },
      aliquota_iss: { type: Number },
      data_competencia: { type: Date },
    },
    status: {
      type: String,
      enum: ['rascunho', 'confirmado', 'emitindo', 'emitida', 'erro'],
      default: 'rascunho',
      index: true,
    },
    nota_id: { type: Schema.Types.ObjectId, ref: 'Nota' },
    erro_mensagem: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

EmissaoRascunhoSchema.plugin(tenantPlugin);
EmissaoRascunhoSchema.index({ tenantId: 1, lancamento_id: 1 });
