import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

export const ImportacaoSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    filename: { type: String, required: true },
    originalName: { type: String },
    label: { type: String },
    descricao: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processingTimeMs: { type: Number },
    stats: {
      total_faturas: { type: Number, default: 0 },
      imported: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      ignored: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'finished', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: { type: String },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    originalJson: { type: Object },
  },
  { timestamps: true },
);

ImportacaoSchema.plugin(tenantPlugin);
