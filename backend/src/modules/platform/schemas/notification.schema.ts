import { Schema } from 'mongoose';

export const NotificationSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['signup', 'approved', 'rejected', 'suspended', 'system'],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
