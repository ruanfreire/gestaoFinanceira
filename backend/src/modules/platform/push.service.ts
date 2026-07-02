import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanMany } from '../../common/mongoose-lean.util';

type PushPayload = {
  title: string;
  message: string;
  url?: string;
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

  async sendToUsers(userIds: string[], payload: PushPayload) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      this.logger.debug('VAPID keys not configured — push skipped');
      return;
    }

    let webpush: {
      setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
      sendNotification: (subscription: object, payload: string) => Promise<void>;
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      webpush = require('web-push');
    } catch {
      this.logger.warn('web-push package not installed — push skipped');
      return;
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@finance.local',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    const subs = asLeanMany<{ endpoint: string; keys: { p256dh: string; auth: string } }>(
      await this.subscriptionModel
        .find({ userId: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
        .lean(),
    );

    await Promise.allSettled(
      subs.map(async (sub) => {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify({
            title: payload.title,
            body: payload.message,
            url: payload.url || '/',
          }),
        );
      }),
    );
  }

  async sendToSuperadmins(payload: PushPayload, superadminIds: string[]) {
    await this.sendToUsers(superadminIds, payload);
  }
}
