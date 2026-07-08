import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { asLeanOne } from '../../common/mongoose-lean.util';
import { LOGIN_STATUS_MESSAGES, type UserStatus } from '../../common/constants/user-status';
import {
  BILLING_ACCESS_MESSAGES,
  computeBillingAccess,
} from '../../common/billing/organization-billing.util';
import type { PlanId, BillingStatus } from '../../common/billing/plans.config';
import { uniqueOrganizationSlug } from '../../common/tenant/organization-slug.util';
import { NotificationsService } from '../platform/notifications.service';
import { OrgService } from '../org/org.service';
import { EntitlementsService } from '../../common/entitlements/entitlements.service';
import { MailService } from '../../common/mail/mail.service';
import { resolveFrontendUrl } from '../../common/frontend-url.util';
import type { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import { DEFAULT_ENABLED_MODULES } from '../../common/entitlements/module-catalog';
import type { AcceptInviteDto } from '../org/dto/invite.dto';
import type { SignupDto } from './dto/signup.dto';
import type { TenantRole } from '../../common/constants/tenant-role';

type JwtPayload = { sub: any; roles?: string[]; tenantId?: string; tenantRole?: TenantRole; jti?: string };

const PASSWORD_RESET_TTL_MINUTES = 60;

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('UserActionLog') private actionLogModel: Model<any>,
    @InjectModel('Organization') private organizationModel: Model<any>,
    @InjectModel('PasswordReset') private passwordResetModel: Model<any>,
    private readonly notificationsService: NotificationsService,
    private readonly orgService: OrgService,
    private readonly entitlementsService: EntitlementsService,
    private readonly mailService: MailService,
  ) {}

  sanitizeUser(user: Record<string, unknown> | object) {
    const record = user as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshTokens, ...safe } = record;
    return safe;
  }

  assertLoginAllowed(user: { status?: UserStatus }) {
    const status = (user.status || 'approved') as UserStatus;
    if (status === 'approved') return;
    const message = LOGIN_STATUS_MESSAGES[status as keyof typeof LOGIN_STATUS_MESSAGES];
    throw new UnauthorizedException(message);
  }

  async assertOrganizationAllowed(tenantId?: unknown) {
    if (!tenantId) return;
    const org = asLeanOne<{
      status?: UserStatus;
      plan?: PlanId;
      billingStatus?: BillingStatus;
      trialEndsAt?: Date;
      currentPeriodEnd?: Date;
    }>(await this.organizationModel.findById(tenantId).select('status plan billingStatus trialEndsAt currentPeriodEnd').lean());
    if (!org) {
      throw new UnauthorizedException('Organização não encontrada');
    }
    const status = (org.status || 'approved') as UserStatus;
    if (status !== 'approved') {
      const message = LOGIN_STATUS_MESSAGES[status as keyof typeof LOGIN_STATUS_MESSAGES];
      throw new UnauthorizedException(message);
    }

    const access = computeBillingAccess(org);
    if (!access.allowed) {
      const reason = access.reason ?? 'subscription_inactive';
      throw new UnauthorizedException(BILLING_ACCESS_MESSAGES[reason]);
    }
  }

  async validateUser(email: string, password: string) {
    const user = asLeanOne<{ password: string; status?: UserStatus; tenantId?: unknown } & Record<string, unknown>>(
      await this.userModel.findOne({ email: email.toLowerCase().trim() }).lean(),
    );
    if (!user) return null;
    const match = await argon2.verify(user.password, password);
    if (!match) return null;
    this.assertLoginAllowed(user);
    await this.assertOrganizationAllowed(user.tenantId);
    return this.sanitizeUser(user);
  }

  buildAccessPayload(user: Record<string, unknown>) {
    return {
      sub: user._id,
      roles: user.roles,
      tenantId: this.resolveDocumentId(user.tenantId) ?? undefined,
      tenantRole: user.tenantRole as TenantRole | undefined,
    };
  }

  assertClientAppUserReady(user: Record<string, unknown>) {
    const roles = user.roles as string[] | undefined;
    if (roles?.includes('superadmin')) return;
    const org = user.organization as { slug?: string } | undefined;
    if (org?.slug) return;
    throw new UnauthorizedException(
      'Conta sem organização vinculada. Use outro usuário ou peça ao administrador para corrigir o cadastro.',
    );
  }

  private resolveDocumentId(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'object' && value !== null && '_id' in value) {
      return String((value as { _id: unknown })._id);
    }
    return String(value);
  }

  /**
   * Corrige cadastros legados em que o único membro aprovado não é owner
   * (ex.: após reset do banco sem recriar ownerUserId na organização).
   */
  async repairTenantOwnershipIfNeeded(user: { _id: unknown; tenantId?: unknown; tenantRole?: TenantRole }) {
    const tenantId = this.resolveDocumentId(user.tenantId);
    if (!tenantId) return;
    const userId = String(user._id);

    const org = asLeanOne<{ ownerUserId?: unknown }>(
      await this.organizationModel.findById(tenantId).select('ownerUserId').lean(),
    );
    if (!org) return;

    const ownerId = org.ownerUserId ? String(org.ownerUserId) : null;

    if (ownerId === userId && user.tenantRole !== 'owner') {
      await this.userModel.findByIdAndUpdate(userId, { $set: { tenantRole: 'owner' } });
      user.tenantRole = 'owner';
      return;
    }

    if (ownerId) return;

    const approvedMembers = await this.userModel.countDocuments({
      tenantId,
      status: 'approved',
    });
    if (approvedMembers !== 1) return;

    await this.userModel.findByIdAndUpdate(userId, { $set: { tenantRole: 'owner' } });
    await this.organizationModel.findByIdAndUpdate(tenantId, { $set: { ownerUserId: user._id } });
    user.tenantRole = 'owner';
  }

  async getUserById(id: string) {
    const baseUser = asLeanOne<{
      _id: unknown;
      tenantId?: unknown;
      tenantRole?: TenantRole;
      name?: string;
      email?: string;
      roles?: string[];
      status?: UserStatus;
      company?: string;
      cnpj?: string;
      phone?: string;
      createdAt?: Date;
      lastLogin?: Date;
    }>(
      await this.userModel
        .findById(id)
        .select('name email roles tenantRole status company cnpj phone tenantId createdAt lastLogin')
        .lean(),
    );
    if (!baseUser) return null;

    await this.repairTenantOwnershipIfNeeded(baseUser);

    const user = asLeanOne(
      await this.userModel
        .findById(id)
        .select('name email roles tenantRole status company cnpj phone tenantId createdAt lastLogin')
        .populate(
          'tenantId',
          'name slug status cnpj trialEndsAt plan billingStatus currentPeriodEnd stripeSubscriptionId ownerUserId enabled_modules emissao_nf_habilitada',
        )
        .lean(),
    );
    if (!user) return null;

    const safe = this.sanitizeUser(user) as Record<string, unknown>;
    const org = safe.tenantId as Record<string, unknown> | null;
    if (org && typeof org === 'object' && org._id) {
      const enabled_modules = this.entitlementsService.resolveEnabledModules({
        enabled_modules: org.enabled_modules as string[] | undefined,
        emissao_nf_habilitada: org.emissao_nf_habilitada as boolean | undefined,
      });
      safe.organization = {
        _id: String(org._id),
        name: org.name,
        slug: org.slug,
        status: org.status,
        cnpj: org.cnpj,
        trialEndsAt: org.trialEndsAt,
        plan: org.plan,
        billingStatus: org.billingStatus,
        currentPeriodEnd: org.currentPeriodEnd,
        hasSubscription: Boolean(org.stripeSubscriptionId),
        ownerUserId: org.ownerUserId ? String(org.ownerUserId) : undefined,
        enabled_modules,
      };
      safe.tenantId = String(org._id);
    }
    return safe;
  }

  async recordLogin(userId: string, ip?: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { lastLogin: new Date(), lastLoginIp: ip },
    });
  }

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.userModel.findOne({ email }).lean();
    if (exists) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const hashed = await argon2.hash(dto.password);
    const companyName = dto.company.trim();
    const slug = await uniqueOrganizationSlug(this.organizationModel, companyName);

    const organization = await this.organizationModel.create({
      name: companyName,
      slug,
      cnpj: dto.cnpj?.trim(),
      phone: dto.phone?.trim(),
      status: 'pending',
      plan: 'trial',
      billingStatus: 'trialing',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      enabled_modules: [...DEFAULT_ENABLED_MODULES],
    });

    const user = await this.userModel.create({
      name: dto.name.trim(),
      email,
      password: hashed,
      company: companyName,
      cnpj: dto.cnpj?.trim(),
      phone: dto.phone?.trim(),
      roles: ['client'],
      tenantRole: 'owner',
      status: 'pending',
      tenantId: organization._id,
    });

    await this.organizationModel.findByIdAndUpdate(organization._id, {
      ownerUserId: user._id,
    });

    await this.actionLogModel.create({
      userId: user._id,
      action: 'signup',
    });

    await this.notificationsService.createForSuperadmins({
      type: 'signup',
      title: 'Novo cliente aguardando aprovação',
      message: `${user.name} (${user.company}) solicitou acesso.`,
      targetUserId: String(user._id),
    });

    void this.mailService.sendSignupReceived({
      to: email,
      name: user.name,
      company: companyName,
    });

    return {
      ok: true,
      message: 'Cadastro recebido. Aguarde aprovação do administrador.',
      user: this.sanitizeUser(user.toObject()),
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invite = await this.orgService.findValidInvite(dto.token);
    const email = invite.email.toLowerCase().trim();

    const exists = await this.userModel.findOne({ email }).lean();
    if (exists) {
      throw new ConflictException('Este e-mail já possui conta no sistema');
    }

    const org = asLeanOne<{ status?: UserStatus; name?: string }>(
      await this.organizationModel.findById(invite.tenantId).select('status name').lean(),
    );
    if (!org) {
      throw new ConflictException('Organização do convite não encontrada');
    }

    const hashed = await argon2.hash(dto.password);
    const userStatus: UserStatus = org.status === 'approved' ? 'approved' : 'pending';

    const user = await this.userModel.create({
      name: dto.name.trim(),
      email,
      password: hashed,
      company: org.name,
      roles: ['client'],
      tenantRole: invite.tenantRole,
      status: userStatus,
      tenantId: invite.tenantId,
    });

    if (invite.tenantRole === 'owner') {
      await this.organizationModel.findByIdAndUpdate(invite.tenantId, {
        $set: { ownerUserId: user._id },
      });
    }

    await this.orgService.markInviteAccepted(invite, user._id);
    await this.actionLogModel.create({
      userId: user._id,
      action: 'invite_accepted',
    });

    const fullUser = await this.getUserById(String(user._id));
    const safeUser = fullUser ?? this.sanitizeUser(user.toObject());
    let accessToken: string | undefined;
    if (userStatus === 'approved') {
      accessToken = this.signAccessToken(this.buildAccessPayload(safeUser as Record<string, unknown>));
    }

    void this.mailService.sendWelcomeTeam({
      to: email,
      name: user.name,
      organizationName: org.name ?? 'sua organização',
      tenantRole: invite.tenantRole,
      pendingApproval: userStatus !== 'approved',
    });

    return {
      ok: true,
      message: userStatus === 'approved' ? 'Conta criada com sucesso' : 'Conta criada — aguarde aprovação da organização',
      user: safeUser,
      accessToken,
    };
  }

  private readonly passwordResetResponse = {
    ok: true,
    message:
      'Se existir uma conta com este e-mail, você receberá instruções para redefinir a senha em instantes.',
  };

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const email = dto.email.toLowerCase().trim();
    const user = asLeanOne<{ _id: unknown; name: string; email: string }>(
      await this.userModel.findOne({ email }).select('name email').lean(),
    );

    if (!user) {
      return this.passwordResetResponse;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    await this.passwordResetModel.updateMany(
      { userId: user._id, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
    );

    await this.passwordResetModel.create({
      userId: user._id,
      tokenHash: hashResetToken(token),
      expiresAt,
    });

    const resetUrl = `${resolveFrontendUrl()}/auth/redefinir-senha/${token}`;
    void this.mailService.sendPasswordReset({
      to: email,
      name: user.name,
      resetUrl,
      expiresAt,
    });

    return this.passwordResetResponse;
  }

  async previewPasswordReset(token: string) {
    const record = await this.findValidPasswordReset(token);
    const user = asLeanOne<{ email: string }>(
      await this.userModel.findById(record.userId).select('email').lean(),
    );
    if (!user) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    return {
      ok: true,
      email: user.email,
      expiresAt: record.expiresAt,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.findValidPasswordReset(dto.token);
    const user = await this.userModel.findById(record.userId);
    if (!user) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    const hashed = await argon2.hash(dto.password);
    user.password = hashed;
    user.refreshTokens = [];
    await user.save();

    record.usedAt = new Date();
    await record.save();

    return {
      ok: true,
      message: 'Senha redefinida com sucesso. Você já pode entrar com a nova senha.',
    };
  }

  private async findValidPasswordReset(token: string) {
    const record = await this.passwordResetModel.findOne({
      tokenHash: hashResetToken(token),
      usedAt: { $exists: false },
    });
    if (!record) {
      throw new NotFoundException('Link inválido ou expirado');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      record.usedAt = new Date();
      await record.save();
      throw new NotFoundException('Link inválido ou expirado');
    }
    return record;
  }

  signAccessToken(payload: object) {
    const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
    const expiresIn = process.env.JWT_ACCESS_EXP || '15m';
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  signRefreshToken(payload: object) {
    const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
    const expiresIn = process.env.JWT_REFRESH_EXP || '7d';
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  async createAndStoreRefreshToken(userId: any) {
    const jti = randomUUID();
    const token = this.signRefreshToken({ sub: userId, jti });
    await this.userModel.findByIdAndUpdate(userId, { $push: { refreshTokens: jti } });
    return { token, jti };
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
      const payload = jwt.verify(token, secret) as JwtPayload;
      return payload;
    } catch {
      return null;
    }
  }

  async revokeRefreshToken(userId: any, jti: string) {
    await this.userModel.findByIdAndUpdate(userId, { $pull: { refreshTokens: jti } });
  }

  async rotateRefreshToken(userId: any, oldJti: string) {
    await this.userModel.findByIdAndUpdate(userId, { $pull: { refreshTokens: oldJti } });
    const jti = randomUUID();
    await this.userModel.findByIdAndUpdate(userId, { $push: { refreshTokens: jti } });
    const token = this.signRefreshToken({ sub: userId, jti });
    return { token, jti };
  }
}
