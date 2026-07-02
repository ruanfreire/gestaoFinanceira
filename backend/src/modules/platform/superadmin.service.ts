import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import type { UserStatus } from '../../common/constants/user-status';
import { NotificationsService } from './notifications.service';

function sanitizeClient(user: object) {
  const record = user as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, refreshTokens, ...safe } = record;
  return safe;
}

@Injectable()
export class SuperadminService {
  constructor(
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Organization') private organizationModel: Model<any>,
    @InjectModel('UserActionLog') private actionLogModel: Model<any>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboard() {
    const clients = await this.userModel
      .find({ roles: { $in: ['client', 'user', 'admin'] } })
      .select('status')
      .lean();

    const counts = { total: clients.length, pending: 0, approved: 0, rejected: 0, suspended: 0 };
    for (const client of clients) {
      const status = (client.status as UserStatus) || 'approved';
      if (status in counts) counts[status as keyof typeof counts] += 1;
    }

    const recent = asLeanMany(
      await this.userModel
        .find({ roles: { $in: ['client'] } })
        .select('name email company status createdAt')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    );

    return { counts, recent };
  }

  async listClients(status?: UserStatus) {
    const filter: Record<string, unknown> = { roles: { $in: ['client'] } };
    if (status) filter.status = status;

    const items = asLeanMany(
      await this.userModel
        .find(filter)
        .select('name email company cnpj phone status tenantId createdAt lastLogin lastLoginIp')
        .populate('tenantId', 'name slug status cnpj trialEndsAt')
        .sort({ createdAt: -1 })
        .lean(),
    );

    return { items: items.map((item) => sanitizeClient(item as object)), total: items.length };
  }

  async getClient(id: string) {
    const user = asLeanOne(
      await this.userModel
        .findOne({ _id: id, roles: { $in: ['client'] } })
        .select('name email company cnpj phone status tenantId createdAt lastLogin lastLoginIp')
        .populate('tenantId', 'name slug status cnpj trialEndsAt ownerUserId')
        .lean(),
    );
    if (!user) throw new NotFoundException('Cliente não encontrado');

    const history = asLeanMany(
      await this.actionLogModel
        .find({ userId: new Types.ObjectId(id) })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    );

    return { client: sanitizeClient(user), history };
  }

  private async logAction(
    userId: string,
    action: string,
    performedBy: string,
    note?: string,
    ip?: string,
  ) {
    await this.actionLogModel.create({
      userId: new Types.ObjectId(userId),
      action,
      performedBy: new Types.ObjectId(performedBy),
      note,
      ip,
    });
  }

  async updateStatus(
    clientId: string,
    status: UserStatus,
    performedBy: string,
    ip?: string,
    note?: string,
  ) {
    const user = await this.userModel.findOne({ _id: clientId, roles: { $in: ['client'] } });
    if (!user) throw new NotFoundException('Cliente não encontrado');

    if (user.status === status) {
      throw new BadRequestException('Cliente já está neste status');
    }

    user.status = status;
    if (status === 'rejected' || status === 'suspended') {
      user.refreshTokens = [];
    }
    await user.save();

    if (user.tenantId) {
      await this.organizationModel.findByIdAndUpdate(user.tenantId, { $set: { status } });
    }

    const actionMap: Record<UserStatus, string> = {
      approved: 'approved',
      rejected: 'rejected',
      suspended: 'suspended',
      pending: 'reactivated',
    };
    await this.logAction(clientId, actionMap[status], performedBy, note, ip);

    const messages: Record<UserStatus, { title: string; message: string; type: 'approved' | 'rejected' | 'suspended' | 'system' }> = {
      approved: {
        type: 'approved',
        title: 'Acesso aprovado',
        message: 'Seu cadastro foi aprovado. Você já pode entrar no sistema.',
      },
      rejected: {
        type: 'rejected',
        title: 'Cadastro não aprovado',
        message: 'Seu cadastro não foi aprovado. Entre em contato com o suporte.',
      },
      suspended: {
        type: 'suspended',
        title: 'Acesso suspenso',
        message: 'Seu acesso foi suspenso temporariamente.',
      },
      pending: {
        type: 'system',
        title: 'Cadastro em análise',
        message: 'Seu cadastro voltou para análise.',
      },
    };

    if (status !== 'pending') {
      await this.notificationsService.createForUser(clientId, messages[status]);
    }

    return { ok: true, client: sanitizeClient(user.toObject()) };
  }

  async approve(clientId: string, performedBy: string, ip?: string) {
    return this.updateStatus(clientId, 'approved', performedBy, ip);
  }

  async reject(clientId: string, performedBy: string, ip?: string, note?: string) {
    return this.updateStatus(clientId, 'rejected', performedBy, ip, note);
  }

  async suspend(clientId: string, performedBy: string, ip?: string, note?: string) {
    return this.updateStatus(clientId, 'suspended', performedBy, ip, note);
  }
}
