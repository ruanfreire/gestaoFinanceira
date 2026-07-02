import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

const importacaoBancariaBase = {
  tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  filename: { type: String, required: true },
  originalName: { type: String },
  label: { type: String },
  descricao: { type: String },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  periodo: { type: String },
  status: {
    type: String,
    enum: ['pending', 'processing', 'finished', 'failed'],
    default: 'finished',
    index: true,
  },
  errorMessage: { type: String },
  originalCsv: { type: String, select: false },
  /** IDs de todas as linhas lidas do CSV (inclui já importadas anteriormente) */
  transacao_ids: { type: [String], default: [] },
};

export const AsaasImportacaoSchema = new Schema(
  {
    ...importacaoBancariaBase,
    saldo_inicial: { type: Number },
    saldo_final: { type: Number },
    stats: {
      total_linhas: { type: Number, default: 0 },
      cobrancas: { type: Number, default: 0 },
      entradas: { type: Number, default: 0 },
      saidas: { type: Number, default: 0 },
      conciliado_auto: { type: Number, default: 0 },
      pendente_vinculo: { type: Number, default: 0 },
      conciliado_manual: { type: Number, default: 0 },
      sem_match: { type: Number, default: 0 },
      extrato: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      imported: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

AsaasImportacaoSchema.plugin(tenantPlugin);
