import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

export const NubankLancamentoSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    importacao_id: { type: Schema.Types.ObjectId, ref: 'NubankImportacao', index: true },
    transacao_id: { type: String, required: true, index: true },
    data: { type: Date, index: true },
    descricao: { type: String },
    valor: { type: Number },
    categoria: { type: String },
    origem: { type: String, enum: ['conta', 'cartao'], default: 'conta' },
    tipo_movimento: { type: String, enum: ['entrada', 'saida'], index: true },
    pagador_nome: { type: String, index: true },
    pagador_nome_normalizado: { type: String, index: true },
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

NubankLancamentoSchema.plugin(tenantPlugin);
NubankLancamentoSchema.index({ tenantId: 1, transacao_id: 1 }, { unique: true });
