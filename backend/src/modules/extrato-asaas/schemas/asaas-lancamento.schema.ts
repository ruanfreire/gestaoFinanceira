import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

export const AsaasLancamentoSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    importacao_id: { type: Schema.Types.ObjectId, ref: 'AsaasImportacao', index: true },
    transacao_id: { type: String, required: true, index: true },
    data: { type: Date, index: true },
    tipo_transacao: { type: String, index: true },
    descricao: { type: String },
    valor: { type: Number },
    saldo: { type: Number },
    fatura_parcelamento_id: { type: String, index: true },
    fatura_cobranca_id: { type: String, index: true },
    pagador_nome: { type: String, index: true },
    pagador_nome_normalizado: { type: String, index: true },
    tipo_lancamento: { type: String },
    tipo_movimento: { type: String, enum: ['entrada', 'saida'], index: true },
    status_conciliacao: {
      type: String,
      enum: ['extrato', 'conciliado_auto', 'pendente_vinculo', 'conciliado_manual', 'sem_match'],
      default: 'extrato',
      index: true,
    },
    nota_id: { type: Schema.Types.ObjectId, ref: 'Nota', index: true },
    candidatas_nota_ids: [{ type: Schema.Types.ObjectId, ref: 'Nota' }],
    json_original: { type: Object },
  },
  { timestamps: true },
);

AsaasLancamentoSchema.plugin(tenantPlugin);
AsaasLancamentoSchema.index({ tenantId: 1, transacao_id: 1 }, { unique: true });
