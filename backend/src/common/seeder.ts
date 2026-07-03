import { connect, connection, Model, model, Types } from 'mongoose';
import * as argon2 from 'argon2';
import type { UserRole, UserStatus } from './constants/user-status';
import type { TenantRole } from './constants/tenant-role';
import { OrganizationSchema } from '../modules/platform/schemas/organization.schema';
import { UserSchema } from '../modules/auth/schemas/user.schema';
import { slugifyOrganization, uniqueOrganizationSlug } from './tenant/organization-slug.util';
import { asLeanOne } from './mongoose-lean.util';

type OrgSeed = {
  key: string;
  name: string;
  status: UserStatus;
  plan: 'trial' | 'starter' | 'pro';
  billingStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'none';
  trialDaysLeft?: number;
};

type UserSeed = {
  name: string;
  email: string;
  roles: UserRole[];
  tenantRole?: TenantRole;
  status: UserStatus;
  orgKey?: string;
  company?: string;
  cnpj?: string;
  phone?: string;
};

const ORG_SEEDS: OrgSeed[] = [
  {
    key: 'demo',
    name: 'Empresa Demo',
    status: 'approved',
    plan: 'pro',
    billingStatus: 'active',
  },
  {
    key: 'acme',
    name: 'Acme Consultoria',
    status: 'approved',
    plan: 'starter',
    billingStatus: 'active',
  },
  {
    key: 'startup-beta',
    name: 'Startup Beta',
    status: 'pending',
    plan: 'trial',
    billingStatus: 'trialing',
    trialDaysLeft: 14,
  },
  {
    key: 'suspensa',
    name: 'Org Suspensa',
    status: 'suspended',
    plan: 'trial',
    billingStatus: 'none',
    trialDaysLeft: -1,
  },
  {
    key: 'trial-ending',
    name: 'Consultoria Trial',
    status: 'approved',
    plan: 'trial',
    billingStatus: 'trialing',
    trialDaysLeft: 3,
  },
];

const USER_SEEDS: UserSeed[] = [
  {
    name: 'Super Administrador',
    email: 'superadmin@finance.local',
    roles: ['superadmin'],
    status: 'approved',
    company: 'Gestão Financeira',
  },
  {
    name: 'Administrador',
    email: 'admin@finance.local',
    roles: ['admin'],
    tenantRole: 'owner',
    status: 'approved',
    orgKey: 'demo',
    company: 'Empresa Demo',
    cnpj: '00.000.000/0001-91',
    phone: '(11) 99999-0001',
  },
  {
    name: 'Cliente Aprovado',
    email: 'client@finance.local',
    roles: ['client'],
    tenantRole: 'operator',
    status: 'approved',
    orgKey: 'demo',
    company: 'Empresa Demo',
    phone: '(11) 99999-0002',
  },
  {
    name: 'Operador (user)',
    email: 'user@finance.local',
    roles: ['user'],
    tenantRole: 'operator',
    status: 'approved',
    orgKey: 'demo',
    company: 'Empresa Demo',
    phone: '(11) 99999-0003',
  },
  {
    name: 'Admin Acme',
    email: 'admin@acme.local',
    roles: ['admin'],
    tenantRole: 'owner',
    status: 'approved',
    orgKey: 'acme',
    company: 'Acme Consultoria',
    cnpj: '11.222.333/0001-44',
  },
  {
    name: 'Cliente Acme',
    email: 'client@acme.local',
    roles: ['client'],
    tenantRole: 'operator',
    status: 'approved',
    orgKey: 'acme',
    company: 'Acme Consultoria',
  },
  {
    name: 'Cadastro Pendente',
    email: 'pending@finance.local',
    roles: ['client'],
    tenantRole: 'owner',
    status: 'pending',
    orgKey: 'startup-beta',
    company: 'Startup Beta',
  },
  {
    name: 'Cadastro Rejeitado',
    email: 'rejected@finance.local',
    roles: ['client'],
    tenantRole: 'operator',
    status: 'rejected',
    orgKey: 'startup-beta',
    company: 'Startup Beta',
  },
  {
    name: 'Usuário Suspenso',
    email: 'suspended@finance.local',
    roles: ['client'],
    tenantRole: 'owner',
    status: 'suspended',
    orgKey: 'suspensa',
    company: 'Org Suspensa',
  },
  {
    name: 'Trial Expirando',
    email: 'trial@finance.local',
    roles: ['client'],
    tenantRole: 'owner',
    status: 'approved',
    orgKey: 'trial-ending',
    company: 'Consultoria Trial',
  },
];

function trialEndsAt(daysLeft: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysLeft);
  date.setHours(23, 59, 59, 999);
  return date;
}

async function upsertOrganization(Organization: Model<any>, seed: OrgSeed) {
  const slug = slugifyOrganization(seed.name);
  const trialEnds =
    seed.trialDaysLeft != null ? trialEndsAt(seed.trialDaysLeft) : undefined;

  const payload = {
    name: seed.name,
    slug,
    status: seed.status,
    plan: seed.plan,
    billingStatus: seed.billingStatus,
    ...(trialEnds ? { trialEndsAt: trialEnds } : {}),
  };

  const existing = asLeanOne<{ _id: Types.ObjectId }>(await Organization.findOne({ slug }).lean());
  if (existing) {
    await Organization.updateOne({ _id: existing._id }, { $set: payload });
    console.log(`Organization updated: ${seed.name} (${seed.key})`);
    return { key: seed.key, id: new Types.ObjectId(String(existing._id)) };
  }

  const created = await Organization.create(payload);
  console.log(`Organization created: ${seed.name} (${seed.key})`);
  return { key: seed.key, id: created._id as Types.ObjectId };
}

async function upsertUser(
  User: Model<any>,
  seed: UserSeed,
  passwordHash: string,
  orgIds: Map<string, Types.ObjectId>,
  resetPassword: boolean,
) {
  const tenantId = seed.orgKey ? orgIds.get(seed.orgKey) : undefined;
  const payload: Record<string, unknown> = {
    name: seed.name,
    email: seed.email.toLowerCase(),
    roles: seed.roles,
    tenantRole: seed.tenantRole ?? (seed.roles.includes('admin') ? 'owner' : 'operator'),
    status: seed.status,
    company: seed.company ?? seed.orgKey,
    cnpj: seed.cnpj,
    phone: seed.phone,
    tenantId,
  };

  const existing = asLeanOne<{ _id: Types.ObjectId }>(
    await User.findOne({ email: seed.email.toLowerCase() }).lean(),
  );
  if (existing) {
    const update: Record<string, unknown> = { ...payload };
    if (resetPassword) update.password = passwordHash;
    await User.updateOne({ _id: existing._id }, { $set: update });
    console.log(`User updated: ${seed.email} [${seed.roles.join(', ')} / ${seed.status}]`);
    return existing._id;
  }

  await User.create({ ...payload, password: passwordHash, refreshTokens: [] });
  console.log(`User created: ${seed.email} [${seed.roles.join(', ')} / ${seed.status}]`);
  const created = asLeanOne<{ _id: Types.ObjectId }>(
    await User.findOne({ email: seed.email.toLowerCase() }).select('_id').lean(),
  );
  return created?._id;
}

async function repairOrphanedTenantLinks(Organization: Model<any>, User: Model<any>) {
  const users = await User.find({ tenantId: { $exists: true, $ne: null } }).lean();
  let repaired = 0;

  for (const user of users) {
    const orgExists = await Organization.exists({ _id: user.tenantId });
    if (orgExists) continue;

    const companyName =
      (user.company as string | undefined)?.trim() ||
      (user.name as string | undefined)?.trim() ||
      String(user.email);
    const slug = await uniqueOrganizationSlug(Organization, companyName);
    const status = ((user.status as UserStatus) || 'approved') as UserStatus;

    const org = await Organization.create({
      name: companyName,
      slug,
      status,
      plan: 'trial',
      billingStatus: status === 'approved' ? 'active' : 'trialing',
      ownerUserId: user.tenantRole === 'owner' ? user._id : undefined,
      ...(user.cnpj ? { cnpj: user.cnpj } : {}),
      ...(user.phone ? { phone: user.phone } : {}),
    });

    await User.updateOne({ _id: user._id }, { $set: { tenantId: org._id } });
    console.log(`Repaired orphaned tenant for ${user.email} → ${companyName} (${slug})`);
    repaired += 1;
  }

  if (repaired > 0) {
    console.log(`Repaired ${repaired} user(s) with missing organization.`);
  }
}

function printSummary(password: string) {
  const lines = [
    '',
    '══════════════════════════════════════════════════════════════',
    '  Contas de desenvolvimento (senha única para todas)',
    '══════════════════════════════════════════════════════════════',
    `  Senha: ${password}`,
    '',
    '  Papel          E-mail                      Acesso',
    '  ─────────────────────────────────────────────────────────',
    '  SuperAdmin     superadmin@finance.local    /superadmin',
    '  Admin          admin@finance.local         app (Empresa Demo)',
    '  Client         client@finance.local        app (Empresa Demo)',
    '  User           user@finance.local          app (Empresa Demo)',
    '  Admin (2ª org) admin@acme.local            app (Acme)',
    '  Client (2ª org) client@acme.local           app (Acme)',
    '  Pendente       pending@finance.local       bloqueado',
    '  Rejeitado      rejected@finance.local      bloqueado',
    '  Suspenso       suspended@finance.local     bloqueado',
    '  Trial          trial@finance.local         app (trial 3 dias)',
    '══════════════════════════════════════════════════════════════',
    '',
  ];
  console.log(lines.join('\n'));
}

async function runSeeder() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
  await connect(mongoUri);
  console.log('Connected to MongoDB for seeding');

  const Organization: Model<any> = model('Organization', OrganizationSchema);
  const User: Model<any> = model('User', UserSchema);

  const password = process.env.SEED_ADMIN_PASSWORD || '123456';
  const hashed = await argon2.hash(password);
  const resetPassword = process.env.SEED_RESET_PASSWORD === 'true';

  const orgIds = new Map<string, Types.ObjectId>();
  for (const orgSeed of ORG_SEEDS) {
    const { key, id } = await upsertOrganization(Organization, orgSeed);
    orgIds.set(key, id);
  }

  const userIds = new Map<string, Types.ObjectId>();
  for (const userSeed of USER_SEEDS) {
    const id = await upsertUser(User, userSeed, hashed, orgIds, resetPassword);
    if (id) userIds.set(userSeed.email, new Types.ObjectId(String(id)));
  }

  const demoOrgId = orgIds.get('demo');
  const demoAdminId = userIds.get('admin@finance.local');
  if (demoOrgId && demoAdminId) {
    await Organization.findByIdAndUpdate(demoOrgId, { $set: { ownerUserId: demoAdminId } });
  }

  const acmeOrgId = orgIds.get('acme');
  const acmeAdminId = userIds.get('admin@acme.local');
  if (acmeOrgId && acmeAdminId) {
    await Organization.findByIdAndUpdate(acmeOrgId, { $set: { ownerUserId: acmeAdminId } });
  }

  const startupOrgId = orgIds.get('startup-beta');
  const pendingUserId = userIds.get('pending@finance.local');
  if (startupOrgId && pendingUserId) {
    await Organization.findByIdAndUpdate(startupOrgId, { $set: { ownerUserId: pendingUserId } });
  }

  const trialOrgId = orgIds.get('trial-ending');
  const trialUserId = userIds.get('trial@finance.local');
  if (trialOrgId && trialUserId) {
    await Organization.findByIdAndUpdate(trialOrgId, { $set: { ownerUserId: trialUserId } });
  }

  await repairOrphanedTenantLinks(Organization, User);

  printSummary(password);
  await connection.close();
}

if (require.main === module) {
  runSeeder().catch((err) => {
    console.error('Seeder failed', err);
    process.exit(1);
  });
}
