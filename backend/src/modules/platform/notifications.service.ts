import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import {
  DEFAULT_PUSH_CATEGORIES,
  NOTIFICATION_CATEGORY,
  type NotificationCategory,
  type NotificationType,
} from '../../common/notifications/notification-types';
import { PushService } from './push.service';

export type { NotificationType };

type NotifyParams = {
  type: NotificationType;
  title: string;
  message: string;
  url?: string;
  targetUserId?: string;
};

type PushCategoryPrefs = Record<NotificationCategory, boolean>;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel('Notification') private notificationModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Organization') private organizationModel: Model<any>,
    private readonly pushService: PushService,
  ) {}

  async tenantPath(tenantId: string | Types.ObjectId, path = '/'): Promise<string> {
    const org = asLeanOne<{ slug?: string }>(
      await this.organizationModel.findById(tenantId).select('slug').lean(),
    );
    if (!org?.slug) return path;
    if (path === '/') return `/${org.slug}`;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `/${org.slug}${normalized}`;
  }

  private async filterUsersByCategory(userIds: string[], type: NotificationType): Promise<string[]> {
    const category = NOTIFICATION_CATEGORY[type];
    const users = asLeanMany<{ _id: Types.ObjectId; pushCategories?: Partial<PushCategoryPrefs> }>(
      await this.userModel.find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } }).select('pushCategories').lean(),
    );

    return users
      .filter((user) => {
        const prefs = { ...DEFAULT_PUSH_CATEGORIES, ...(user.pushCategories || {}) };
        return prefs[category] !== false;
      })
      .map((user) => String(user._id));
  }

  async notifyUser(userId: string, params: NotifyParams) {
    const notification = await this.notificationModel.create({
      type: params.type,
      title: params.title,
      message: params.message,
      url: params.url,
      userId: new Types.ObjectId(userId),
      targetUserId: params.targetUserId
        ? new Types.ObjectId(params.targetUserId)
        : new Types.ObjectId(userId),
    });

    const eligible = await this.filterUsersByCategory([userId], params.type);
    if (eligible.length === 0) return;

    const result = await this.pushService.sendToUsers(eligible, {
      title: params.title,
      message: params.message,
      url: params.url || '/',
      type: params.type,
    });
    if (result.deliveredUserIds.includes(userId)) {
      await this.notificationModel.updateOne(
        { _id: notification._id },
        { $set: { pushSentAt: new Date() } },
      );
    }
  }

  async notifyUsers(userIds: string[], params: NotifyParams) {
    if (userIds.length === 0) return;

    const notifications = await this.notificationModel.insertMany(
      userIds.map((userId) => ({
        type: params.type,
        title: params.title,
        message: params.message,
        url: params.url,
        userId: new Types.ObjectId(userId),
        targetUserId: params.targetUserId
          ? new Types.ObjectId(params.targetUserId)
          : undefined,
      })),
    );

    const eligible = await this.filterUsersByCategory(userIds, params.type);
    if (eligible.length === 0) return;

    const result = await this.pushService.sendToUsers(eligible, {
      title: params.title,
      message: params.message,
      url: params.url || '/',
      type: params.type,
    });
    if (result.deliveredUserIds.length === 0) return;

    const deliveredSet = new Set(result.deliveredUserIds);
    const deliveredIds = notifications
      .filter((notification) => deliveredSet.has(String(notification.userId)))
      .map((notification) => notification._id);
    if (deliveredIds.length > 0) {
      await this.notificationModel.updateMany(
        { _id: { $in: deliveredIds } },
        { $set: { pushSentAt: new Date() } },
      );
    }
  }

  async notifyTenantOwners(tenantId: string, params: NotifyParams) {
    const owners = asLeanMany<{ _id: Types.ObjectId }>(
      await this.userModel
        .find({ tenantId: new Types.ObjectId(tenantId), tenantRole: 'owner', status: 'approved' })
        .select('_id')
        .lean(),
    );
    await this.notifyUsers(
      owners.map((o) => String(o._id)),
      params,
    );
  }

  async notifyTenantMembers(tenantId: string, params: NotifyParams) {
    const members = asLeanMany<{ _id: Types.ObjectId }>(
      await this.userModel
        .find({ tenantId: new Types.ObjectId(tenantId), status: 'approved' })
        .select('_id')
        .lean(),
    );
    await this.notifyUsers(
      members.map((m) => String(m._id)),
      params,
    );
  }

  async createForSuperadmins(params: NotifyParams) {
    const superadmins = asLeanMany<{ _id: Types.ObjectId }>(
      await this.userModel.find({ roles: 'superadmin', status: 'approved' }).select('_id').lean(),
    );
    await this.notifyUsers(
      superadmins.map((a) => String(a._id)),
      { ...params, url: params.url || '/superadmin/clients' },
    );
  }

  async createForUser(userId: string, params: Omit<NotifyParams, 'url'> & { url?: string }) {
    const user = asLeanOne<{ tenantId?: Types.ObjectId }>(
      await this.userModel.findById(userId).select('tenantId').lean(),
    );
    const url =
      params.url ||
      (user?.tenantId ? await this.tenantPath(user.tenantId, '/') : '/auth/entrar');
    await this.notifyUser(userId, { ...params, url });
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

  async getPushPreferences(userId: string) {
    const user = asLeanOne<{ pushCategories?: Partial<PushCategoryPrefs> }>(
      await this.userModel.findById(userId).select('pushCategories').lean(),
    );
    return { ...DEFAULT_PUSH_CATEGORIES, ...(user?.pushCategories || {}) };
  }

  async updatePushPreferences(userId: string, prefs: Partial<PushCategoryPrefs>) {
    const merged = { ...DEFAULT_PUSH_CATEGORIES, ...prefs };
    await this.userModel.findByIdAndUpdate(userId, { $set: { pushCategories: merged } });
    return merged;
  }

  async notifyCsvImportComplete(params: {
    userId: string;
    tenantId: string;
    bankLabel: string;
    stats: {
      imported: number;
      skipped: number;
      pendente_vinculo?: number;
      sem_match?: number;
    };
  }) {
    const extratosUrl = await this.tenantPath(params.tenantId, '/arquivos/extratos');
    await this.notifyUser(params.userId, {
      type: 'import_csv_done',
      title: `Extrato ${params.bankLabel} importado`,
      message: `${params.stats.imported} lançamento(s) novo(s), ${params.stats.skipped} já existente(s).`,
      url: extratosUrl,
    });

    if ((params.stats.pendente_vinculo ?? 0) > 0) {
      const recebimentosUrl = await this.tenantPath(params.tenantId, '/recebimentos');
      await this.notifyUser(params.userId, {
        type: 'conciliation_pending',
        title: 'Recebimentos aguardando vínculo',
        message: `${params.stats.pendente_vinculo} lançamento(s) precisam ser associados a notas.`,
        url: recebimentosUrl,
      });
    }

    if ((params.stats.sem_match ?? 0) > 0) {
      const recebimentosUrl = await this.tenantPath(params.tenantId, '/recebimentos/sem-correspondencia');
      await this.notifyUser(params.userId, {
        type: 'conciliation_sem_match',
        title: 'Pagamentos sem correspondência',
        message: `${params.stats.sem_match} lançamento(s) não encontraram nota compatível.`,
        url: recebimentosUrl,
      });
    }
  }

  async notifyJsonImportComplete(params: {
    userId?: string;
    tenantId: string;
    source?: 'honest' | 'upload';
    stats: {
      imported: number;
      ignored: number;
      total_faturas: number;
      vinculadas: number;
    };
  }) {
    const notasUrl = await this.tenantPath(params.tenantId, '/arquivos/notas');
    const title =
      params.source === 'honest' ? 'Sincronização Honest concluída' : 'Importação de notas concluída';
    const parts = [
      `${params.stats.imported} nova(s), ${params.stats.ignored} já existente(s) de ${params.stats.total_faturas} no arquivo.`,
    ];
    if (params.stats.vinculadas > 0) {
      parts.push(`${params.stats.vinculadas} nota(s) vinculada(s) automaticamente a recebimentos.`);
    }

    const payload = {
      type: 'import_json_done' as const,
      title,
      message: parts.join(' '),
      url: notasUrl,
    };

    if (params.userId) {
      await this.notifyUser(params.userId, payload);
      return;
    }

    await this.notifyTenantOwners(params.tenantId, payload);
  }
}
