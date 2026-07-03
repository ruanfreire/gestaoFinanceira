import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanMany } from '../../common/mongoose-lean.util';
import type { NotificationType } from '../../common/notifications/notification-types';

type PushPayload = {
  title: string;
  message: string;
  url?: string;
  type?: NotificationType;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(@InjectModel('PushSubscription') private subscriptionModel: Model<any>) {}

  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    await this.subscriptionModel.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: new Types.ObjectId(userId),
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
      },
      { upsert: true, new: true },
    );
    return { ok: true };
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.subscriptionModel.deleteOne({ userId: new Types.ObjectId(userId), endpoint });
    return { ok: true };
  }

  async removeAllForUser(userId: string) {
    await this.subscriptionModel.deleteMany({ userId: new Types.ObjectId(userId) });
    return { ok: true };
  }

  private loadWebPush():
    | {
        setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
        sendNotification: (subscription: object, payload: string) => Promise<{ statusCode?: number }>;
      }
    | null {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      this.logger.debug('VAPID keys not configured — push skipped');
      return null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('web-push');
    } catch {
      this.logger.warn('web-push package not installed — push skipped');
      return null;
    }
  }

  async sendToUsers(
    userIds: string[],
    payload: PushPayload,
  ): Promise<{ delivered: number; deliveredUserIds: string[] }> {
    const webpush = this.loadWebPush();
    if (!webpush) return { delivered: 0, deliveredUserIds: [] };

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@finance.local',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    const subs = asLeanMany<{
      _id: Types.ObjectId;
      userId: Types.ObjectId;
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }>(
      await this.subscriptionModel
        .find({ userId: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
        .lean(),
    );

    const deliveredUserIds = new Set<string>();
    let delivered = 0;

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: payload.title,
              body: payload.message,
              url: payload.url || '/',
              type: payload.type,
            }),
          );
          delivered += 1;
          deliveredUserIds.add(String(sub.userId));
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.subscriptionModel.deleteOne({ _id: sub._id });
          } else {
            this.logger.warn(`Push falhou (${statusCode ?? 'unknown'}): ${sub.endpoint}`);
          }
        }
      }),
    );

    return { delivered, deliveredUserIds: [...deliveredUserIds] };
  }

  async sendToSuperadmins(payload: PushPayload, superadminIds: string[]) {
    await this.sendToUsers(superadminIds, payload);
  }
}
