import { Schema } from 'mongoose';

export const AuditLogSchema = new Schema(
  {
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

