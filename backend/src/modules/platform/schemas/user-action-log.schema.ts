import { Schema } from 'mongoose';

export const UserActionLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: ['signup', 'approved', 'rejected', 'suspended', 'reactivated'],
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
    ip: { type: String },
  },
  { timestamps: true },
);
