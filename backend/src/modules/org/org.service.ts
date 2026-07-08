import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import type { TenantRole } from '../../common/constants/tenant-role';
import type { CreateInviteDto } from './dto/invite.dto';
import { resolveFrontendUrl } from '../../common/frontend-url.util';
import { EntitlementsService } from '../../common/entitlements/entitlements.service';
import { MailService } from '../../common/mail/mail.service';

const INVITE_TTL_DAYS = 7;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class OrgService {
  constructor(
    @InjectModel('Organization') private organizationModel: Model<any>,
    @InjectModel('OrganizationInvite') private inviteModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
    private readonly entitlementsService: EntitlementsService,
    private readonly mailService: MailService,
  ) {}

  async resolveBySlug(slug: string) {
    const org = asLeanOne<{ name: string; slug: string; status: string }>(
      await this.organizationModel.findOne({ slug: slug.toLowerCase().trim() }).select('name slug status').lean(),
    );
    if (!org) throw new NotFoundException('Organização não encontrada');
    return { name: org.name, slug: org.slug, status: org.status };
  }

  async listMembers(tenantId: string) {
    const items = asLeanMany(
      await this.userModel
        .find({ tenantId: new Types.ObjectId(tenantId) })
        .select('name email tenantRole status createdAt lastLogin')
        .sort({ tenantRole: 1, name: 1 })
        .lean(),
    );
    return { items, total: items.length };
  }

  async listInvites(tenantId: string) {
    const items = asLeanMany(
      await this.inviteModel
        .find({ tenantId: new Types.ObjectId(tenantId), status: 'pending', expiresAt: { $gt: new Date() } })
        .select('email tenantRole status expiresAt createdAt invitedBy')
        .sort({ createdAt: -1 })
        .lean(),
    );
    return { items, total: items.length };
  }

  async createInvite(tenantId: string, invitedBy: string, dto: CreateInviteDto) {
    const email = dto.email.toLowerCase().trim();
    const tenantRole: TenantRole = dto.tenantRole ?? 'operator';

    const existingUser = await this.userModel.findOne({ email }).lean();
    if (existingUser) {
      throw new ConflictException('Este e-mail já possui conta no sistema');
    }

    const pending = await this.inviteModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (pending) {
      throw new ConflictException('Já existe um convite pendente para este e-mail');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    const invite = await this.inviteModel.create({
      tenantId: new Types.ObjectId(tenantId),
      email,
      tenantRole,
      tokenHash: hashToken(token),
      status: 'pending',
      invitedBy: new Types.ObjectId(invitedBy),
      expiresAt,
    });

    const frontendUrl = resolveFrontendUrl();
    const inviteUrl = `${frontendUrl}/convite/${token}`;

    const org = asLeanOne<{ name: string }>(
      await this.organizationModel.findById(tenantId).select('name').lean(),
    );
    const inviter = asLeanOne<{ name: string }>(
      await this.userModel.findById(invitedBy).select('name').lean(),
    );

    const emailSent = await this.mailService.sendTeamInvite({
      to: email,
      organizationName: org?.name ?? 'sua organização',
      inviterName: inviter?.name ?? 'Um administrador',
      tenantRole,
      inviteUrl,
      expiresAt,
    });

    return {
      ok: true,
      inviteId: String(invite._id),
      email,
      tenantRole,
      expiresAt,
      inviteUrl,
      emailSent,
    };
  }

  async revokeInvite(tenantId: string, inviteId: string) {
    const invite = await this.inviteModel.findOne({
      _id: inviteId,
      tenantId: new Types.ObjectId(tenantId),
      status: 'pending',
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    invite.status = 'revoked';
    await invite.save();
    return { ok: true };
  }

  async regenerateInviteLink(tenantId: string, inviteId: string) {
    const invite = await this.inviteModel.findOne({
      _id: inviteId,
      tenantId: new Types.ObjectId(tenantId),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    const token = randomBytes(32).toString('hex');
    invite.tokenHash = hashToken(token);
    await invite.save();

    const frontendUrl = resolveFrontendUrl();
    const inviteUrl = `${frontendUrl}/convite/${token}`;

    const org = asLeanOne<{ name: string }>(
      await this.organizationModel.findById(tenantId).select('name').lean(),
    );
    const inviter = asLeanOne<{ name: string }>(
      await this.userModel.findById(invite.invitedBy).select('name').lean(),
    );

    const emailSent = await this.mailService.sendTeamInvite({
      to: invite.email,
      organizationName: org?.name ?? 'sua organização',
      inviterName: inviter?.name ?? 'Um administrador',
      tenantRole: invite.tenantRole,
      inviteUrl,
      expiresAt: invite.expiresAt,
    });

    return { ok: true, inviteUrl, emailSent };
  }

  async removeMember(tenantId: string, actorUserId: string, memberId: string) {
    if (actorUserId === memberId) {
      throw new BadRequestException('Não é possível remover a si mesmo');
    }

    const member = await this.userModel.findOne({
      _id: memberId,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!member) throw new NotFoundException('Membro não encontrado');

    if (member.tenantRole === 'owner') {
      const ownerCount = await this.userModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        tenantRole: 'owner',
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Não é possível remover o único proprietário');
      }
    }

    await this.userModel.deleteOne({ _id: member._id });
    return { ok: true };
  }

  async previewInvite(token: string) {
    const invite = await this.findValidInvite(token);
    const org = asLeanOne<{ name: string; slug: string; status: string }>(
      await this.organizationModel.findById(invite.tenantId).select('name slug status').lean(),
    );
    if (!org) throw new NotFoundException('Organização não encontrada');
    return {
      ok: true,
      email: invite.email,
      tenantRole: invite.tenantRole,
      organization: { name: org.name, slug: org.slug, status: org.status },
      expiresAt: invite.expiresAt,
    };
  }

  async findValidInvite(token: string) {
    const invite = await this.inviteModel.findOne({ tokenHash: hashToken(token) });
    if (!invite || invite.status !== 'pending') {
      throw new NotFoundException('Convite inválido ou expirado');
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      invite.status = 'expired';
      await invite.save();
      throw new BadRequestException('Convite expirado');
    }
    return invite;
  }

  async markInviteAccepted(invite: any, userId: Types.ObjectId) {
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    invite.acceptedUserId = userId;
    await invite.save();
  }

  async getProfile(tenantId: string) {
    const org = asLeanOne<{ name: string; cnpj?: string; phone?: string; slug?: string }>(
      await this.organizationModel.findById(tenantId).select('name cnpj phone slug').lean(),
    );
    if (!org) throw new NotFoundException('Organização não encontrada');
    return {
      name: org.name,
      cnpj: org.cnpj ?? '',
      phone: org.phone ?? '',
      slug: org.slug,
    };
  }

  async updateProfile(tenantId: string, dto: { name?: string; cnpj?: string; phone?: string }) {
    const update: Record<string, string> = {};
    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.cnpj !== undefined) update.cnpj = dto.cnpj.trim();
    if (dto.phone !== undefined) update.phone = dto.phone.trim();

    const org = asLeanOne<{ name: string; cnpj?: string; phone?: string; slug?: string }>(
      await this.organizationModel
        .findByIdAndUpdate(tenantId, { $set: update }, { new: true })
        .select('name cnpj phone slug')
        .lean(),
    );
    if (!org) throw new NotFoundException('Organização não encontrada');
    return {
      name: org.name,
      cnpj: org.cnpj ?? '',
      phone: org.phone ?? '',
      slug: org.slug,
    };
  }

  async getModules(tenantId: string) {
    const modules = await this.entitlementsService.getOrganizationModules(tenantId);
    if (!modules) throw new NotFoundException('Organização não encontrada');
    return modules;
  }

  async getEmissaoConfig(tenantId: string) {
    const org = asLeanOne<{
      emissao_nf_habilitada?: boolean;
      prefeitura_codigo?: string;
      cnpj?: string;
    }>(
      await this.organizationModel
        .findById(tenantId)
        .select('emissao_nf_habilitada prefeitura_codigo cnpj')
        .lean(),
    );
    if (!org) throw new NotFoundException('Organização não encontrada');
    return {
      emissao_nf_habilitada: Boolean(org.emissao_nf_habilitada),
      prefeitura_codigo: org.prefeitura_codigo ?? null,
      org_profile_ready: Boolean(org.cnpj?.trim()),
    };
  }

  async updateEmissaoConfig(
    tenantId: string,
    dto: { emissao_nf_habilitada?: boolean; prefeitura_codigo?: string },
  ) {
    const update: Record<string, unknown> = {};
    if (dto.emissao_nf_habilitada !== undefined) {
      update.emissao_nf_habilitada = dto.emissao_nf_habilitada;
    }
    if (dto.prefeitura_codigo !== undefined) {
      update.prefeitura_codigo = dto.prefeitura_codigo;
    }

    const org = asLeanOne<{
      emissao_nf_habilitada?: boolean;
      prefeitura_codigo?: string;
      cnpj?: string;
    }>(
      await this.organizationModel
        .findByIdAndUpdate(tenantId, { $set: update }, { new: true })
        .select('emissao_nf_habilitada prefeitura_codigo cnpj')
        .lean(),
    );
    if (!org) throw new NotFoundException('Organização não encontrada');

    if (org.emissao_nf_habilitada && !org.prefeitura_codigo) {
      throw new BadRequestException('Selecione a prefeitura antes de ativar a emissão automática.');
    }

    if (dto.emissao_nf_habilitada !== undefined) {
      const current = await this.entitlementsService.getEnabledModules(tenantId);
      const next = dto.emissao_nf_habilitada
        ? [...new Set([...current, 'fiscal_emissao' as const])]
        : current.filter((key) => key !== 'fiscal_emissao');
      await this.entitlementsService.updateOrganizationModules(tenantId, next, 'owner');
    }

    return {
      emissao_nf_habilitada: Boolean(org.emissao_nf_habilitada),
      prefeitura_codigo: org.prefeitura_codigo ?? null,
      org_profile_ready: Boolean(org.cnpj?.trim()),
    };
  }
}
