import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import { PushService } from './push.service';

export type NotificationType = 'signup' | 'approved' | 'rejected' | 'suspended' | 'system';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel('Notification') private notificationModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    private readonly pushService: PushService,
  ) {}

  async createForSuperadmins(params: {
    type: NotificationType;
    title: string;
    message: string;
    targetUserId?: string;
  }) {
    const superadmins = asLeanMany<{ _id: Types.ObjectId }>(
      await this.userModel.find({ roles: 'superadmin', status: 'approved' }).select('_id').lean(),
    );

    if (superadmins.length === 0) return;

    await this.notificationModel.insertMany(
      superadmins.map((admin) => ({
        type: params.type,
        title: params.title,
        message: params.message,
        userId: admin._id,
        targetUserId: params.targetUserId ? new Types.ObjectId(params.targetUserId) : undefined,
      })),
    );

    await this.pushService.sendToSuperadmins(
      {
        title: params.title,
        message: params.message,
        url: '/superadmin/clients',
      },
      superadmins.map((a) => String(a._id)),
    );
  }

  async createForUser(userId: string, params: { type: NotificationType; title: string; message: string }) {
    await this.notificationModel.create({
      type: params.type,
      title: params.title,
      message: params.message,
      userId: new Types.ObjectId(userId),
      targetUserId: new Types.ObjectId(userId),
    });

    await this.pushService.sendToUsers([userId], {
      title: params.title,
      message: params.message,
      url: '/auth/entrar',
    });
  }

  async listForUser(userId: string, limit = 30) {
    return asLeanMany(
      await this.notificationModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    );
  }

  async unreadCount(userId: string) {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const updated = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId: new Types.ObjectId(userId) },
      { $set: { read: true, readAt: new Date() } },
      { new: true },
    );
    return asLeanOne(updated?.toObject());
  }

  async markAllRead(userId: string) {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true, readAt: new Date() } },
    );
    return { ok: true };
  }
}
