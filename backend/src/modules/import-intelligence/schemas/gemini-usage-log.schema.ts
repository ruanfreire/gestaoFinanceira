import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

export const GeminiUsageLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    operation: {
      type: String,
      enum: ['csv_analysis', 'json_analysis', 'pdf_analysis', 'embedding', 'pagador_extraction'],
      required: true,
      index: true,
    },
    model: { type: String },
    prompt_version: { type: String },
    success: { type: Boolean, default: true },
    latency_ms: { type: Number },
    estimated_tokens: { type: Number },
    error_message: { type: String },
  },
  { timestamps: true },
);

GeminiUsageLogSchema.plugin(tenantPlugin);
GeminiUsageLogSchema.index({ tenantId: 1, createdAt: -1 });
