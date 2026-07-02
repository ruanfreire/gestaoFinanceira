import { Schema } from 'mongoose';
import { NOTIFICATION_TYPES } from '../../../common/notifications/notification-types';

export const NotificationSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: NOTIFICATION_TYPES,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    url: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
