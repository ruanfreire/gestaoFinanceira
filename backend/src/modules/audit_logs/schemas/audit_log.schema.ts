import { Schema } from 'mongoose';
import { tenantPlugin } from '../../../common/tenant/tenant.plugin';

export const AuditLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    action: { type: String },
    collection: { type: String },
    recordId: { type: Schema.Types.ObjectId },
    oldValues: { type: Object },
    newValues: { type: Object },
  },
  { timestamps: true }
);

AuditLogSchema.plugin(tenantPlugin);

