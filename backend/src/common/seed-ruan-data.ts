import { connect, connection, model, Types } from 'mongoose';
import { UserSchema } from '../modules/auth/schemas/user.schema';
import { OrganizationSchema } from '../modules/platform/schemas/organization.schema';
import { asLeanOne } from './mongoose-lean.util';
import { seedRuanSantanaDemo, RUAN_TARGET_EMAIL } from './seeds/ruan-santana-demo';

async function runSeedRuanData() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
  await connect(mongoUri);
  console.log('Connected to MongoDB');

  const User = model('User', UserSchema);
  const Organization = model('Organization', OrganizationSchema);

  const user = asLeanOne<{
    _id: Types.ObjectId;
    name?: string;
    email: string;
    tenantId?: Types.ObjectId;
    company?: string;
    cnpj?: string;
  }>(await User.findOne({ email: RUAN_TARGET_EMAIL.toLowerCase() }).lean());

  if (!user) {
    throw new Error(`Usuário não encontrado: ${RUAN_TARGET_EMAIL}`);
  }
  if (!user.tenantId) {
    throw new Error(`Usuário ${RUAN_TARGET_EMAIL} não possui organização (tenantId)`);
  }

  const org = asLeanOne<{ _id: Types.ObjectId; name?: string; slug?: string }>(
    await Organization.findById(user.tenantId).lean(),
  );
  if (!org) {
    throw new Error(`Organização não encontrada para ${RUAN_TARGET_EMAIL}`);
  }

  console.log(`==> Conta: ${user.name ?? user.email} · ${user.company ?? org.name ?? '—'}`);

  await seedRuanSantanaDemo({
    tenantId: new Types.ObjectId(String(user.tenantId)),
    ownerUserId: new Types.ObjectId(String(user._id)),
    empresaNome: user.company ?? org.name ?? 'Ruan SantanaLTDA',
    empresaCnpj: user.cnpj,
  });

  await connection.close();
  console.log('Massa de dados concluída.');
}

if (require.main === module) {
  runSeedRuanData().catch((err) => {
    console.error('seed:ruan falhou', err);
    process.exit(1);
  });
}
