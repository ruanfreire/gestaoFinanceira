import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import type { UserStatus } from '../../common/constants/user-status';
import type { PlanId } from '../../common/billing/plans.config';
import { buildAdminPlanOverride } from '../../common/billing/admin-plan-override.util';
import { NotificationsService } from './notifications.service';
import { EntitlementsService } from '../../common/entitlements/entitlements.service';
import type { ModuleKey } from '../../common/entitlements/module-catalog';

function sanitizeClient(user: object) {
  const record = user as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, refreshTokens, ...safe } = record;
  return safe;
}

function mapOrganization(tenantId: unknown) {
  const org = tenantId as Record<string, unknown> | null;
  if (!org || typeof org !== 'object' || !org._id) return null;
  return {
    _id: String(org._id),
    name: org.name as string,
    slug: org.slug as string | undefined,
    status: org.status as UserStatus | undefined,
    cnpj: org.cnpj as string | undefined,
    plan: org.plan as PlanId | undefined,
    billingStatus: org.billingStatus as string | undefined,
    trialEndsAt: org.trialEndsAt as Date | string | undefined,
    enabled_modules: org.enabled_modules as string[] | undefined,
  };
}

function withOrganization(user: Record<string, unknown>) {
  const organization = mapOrganization(user.tenantId);
  const safe = sanitizeClient(user) as Record<string, unknown>;
  if (organization) {
    safe.organization = organization;
    safe.tenantId = organization._id;
  }
  return safe;
}

@Injectable()
export class SuperadminService {
  constructor(
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Organization') private organizationModel: Model<any>,
    @InjectModel('UserActionLog') private actionLogModel: Model<any>,
    private readonly notificationsService: NotificationsService,
    private readonly entitlementsService: EntitlementsService,
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
        .populate('tenantId', 'name slug status cnpj trialEndsAt plan billingStatus')
        .sort({ createdAt: -1 })
        .lean(),
    );

    return {
      items: items.map((item) => withOrganization(item as Record<string, unknown>)),
      total: items.length,
    };
  }

  async getClient(id: string) {
    const user = asLeanOne(
      await this.userModel
        .findOne({ _id: id, roles: { $in: ['client'] } })
        .select('name email company cnpj phone status tenantId createdAt lastLogin lastLoginIp')
        .populate('tenantId', 'name slug status cnpj trialEndsAt plan billingStatus ownerUserId')
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

    const client = withOrganization(user as Record<string, unknown>);
    const orgId = (client.organization as { _id?: string } | undefined)?._id;
    if (orgId) {
      const modules = await this.entitlementsService.getOrganizationModules(orgId);
      if (modules && client.organization) {
        (client.organization as Record<string, unknown>).enabled_modules = modules.enabled_modules;
      }
    }

    return { client, history };
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

    await this.notificationsService.createForUser(clientId, messages[status]);

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

  async setClientPlan(clientId: string, plan: PlanId, performedBy: string, ip?: string) {
    const user = await this.userModel.findOne({ _id: clientId, roles: { $in: ['client'] } });
    if (!user) throw new NotFoundException('Cliente não encontrado');
    if (!user.tenantId) {
      throw new BadRequestException('Cliente sem organização vinculada');
    }

    const org = await this.organizationModel.findById(user.tenantId);
    if (!org) throw new NotFoundException('Organização não encontrada');

    const override = buildAdminPlanOverride(plan);
    org.plan = override.plan;
    org.billingStatus = override.billingStatus;
    if (override.trialEndsAt) {
      org.trialEndsAt = override.trialEndsAt;
    }
    if (override.planActivatedAt) {
      org.planActivatedAt = override.planActivatedAt;
    }
    await org.save();

    await this.logAction(clientId, `plan_set_${plan}`, performedBy, undefined, ip);

    await this.notificationsService.createForUser(clientId, {
      type: 'system',
      title: 'Plano atualizado',
      message: `Seu plano foi alterado para ${plan} pelo administrador.`,
      url: '/configuracoes/plano',
    });

    const updated = asLeanOne(
      await this.userModel
        .findById(clientId)
        .select('name email company cnpj phone status tenantId createdAt lastLogin lastLoginIp')
        .populate('tenantId', 'name slug status cnpj trialEndsAt plan billingStatus ownerUserId')
        .lean(),
    );

    return { ok: true, client: withOrganization(updated as Record<string, unknown>) };
  }

  private async resolveClientOrganizationId(clientId: string) {
    const user = asLeanOne<{ tenantId?: unknown }>(
      await this.userModel.findOne({ _id: clientId, roles: { $in: ['client'] } }).select('tenantId').lean(),
    );
    if (!user) throw new NotFoundException('Cliente não encontrado');
    if (!user.tenantId) throw new BadRequestException('Cliente sem organização vinculada');
    return String(user.tenantId);
  }

  async getClientModules(clientId: string) {
    const tenantId = await this.resolveClientOrganizationId(clientId);
    const modules = await this.entitlementsService.getOrganizationModules(tenantId);
    if (!modules) throw new NotFoundException('Organização não encontrada');
    return modules;
  }

  async updateClientModules(
    clientId: string,
    enabledModules: string[],
    performedBy: string,
    ip?: string,
  ) {
    const tenantId = await this.resolveClientOrganizationId(clientId);
    const updated = await this.entitlementsService.updateOrganizationModules(
      tenantId,
      enabledModules,
      performedBy,
    );
    if (!updated) throw new NotFoundException('Organização não encontrada');

    await this.logAction(
      clientId,
      'modules_updated',
      performedBy,
      updated.enabled_modules.join(','),
      ip,
    );

    return updated;
  }

  async toggleClientModule(
    clientId: string,
    moduleKey: ModuleKey,
    enabled: boolean,
    performedBy: string,
    ip?: string,
  ) {
    const tenantId = await this.resolveClientOrganizationId(clientId);
    const updated = await this.entitlementsService.toggleOrganizationModule(
      tenantId,
      moduleKey,
      enabled,
      performedBy,
    );
    if (!updated) throw new NotFoundException('Organização não encontrada');

    await this.logAction(
      clientId,
      enabled ? `module_enabled_${moduleKey}` : `module_disabled_${moduleKey}`,
      performedBy,
      moduleKey,
      ip,
    );

    return updated;
  }
}
