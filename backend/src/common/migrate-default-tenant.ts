/**
 * Migração Fase 2A — cria organização padrão e associa dados existentes.
 *
 * Uso: npm --workspace backend run migrate:tenant
 */
import { connect, connection, model, Schema, Types } from 'mongoose';
import { USER_STATUSES } from './constants/user-status';
import { slugifyOrganization } from './tenant/organization-slug.util';

const TENANT_COLLECTIONS = [
  'notas',
  'importacaos',
  'asaasimportacaos',
  'asaaslancamentos',
  'nubankimportacaos',
  'nubanklancamentos',
  'auditlogs',
] as const;

async function migrateDefaultTenant() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
  await connect(mongoUri);
  console.log('Connected to MongoDB for tenant migration');

  const organizationSchema = new Schema(
    {
      name: String,
      slug: { type: String, unique: true, sparse: true },
      cnpj: String,
      phone: String,
      status: { type: String, enum: USER_STATUSES, default: 'approved' },
      ownerUserId: Schema.Types.ObjectId,
      trialEndsAt: Date,
    },
    { timestamps: true },
  );
  const Organization = model('Organization', organizationSchema);

  const userSchema = new Schema(
    {
      name: String,
      email: { type: String, unique: true },
      password: String,
      roles: [String],
      status: String,
      tenantId: Schema.Types.ObjectId,
      company: String,
      refreshTokens: [String],
    },
    { timestamps: true },
  );
  const User = model('User', userSchema);

  let organization = await Organization.findOne({ slug: 'empresa-demo' }).lean();
  if (!organization) {
    organization = (
      await Organization.create({
        name: 'Empresa Demo',
        slug: slugifyOrganization('Empresa Demo'),
        status: 'approved',
      })
    ).toObject();
    console.log('Created default organization:', organization._id);
  } else {
    console.log('Default organization exists:', organization._id);
  }

  const tenantId = new Types.ObjectId(String(organization._id));

  const userResult = await User.updateMany(
    {
      roles: { $nin: ['superadmin'] },
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    },
    { $set: { tenantId } },
  );
  console.log(`Users linked to default tenant: ${userResult.modifiedCount}`);

  const db = connection.db;
  if (!db) throw new Error('Database connection unavailable');

  for (const collectionName of TENANT_COLLECTIONS) {
    const collection = db.collection(collectionName);
    const result = await collection.updateMany(
      { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
      { $set: { tenantId } },
    );
    console.log(`${collectionName}: ${result.modifiedCount} documents updated`);
  }

  const admin = await User.findOne({ email: 'admin@finance.local' }).lean();
  if (admin && !organization.ownerUserId) {
    await Organization.findByIdAndUpdate(tenantId, { ownerUserId: admin._id });
    console.log('Set default org owner to admin@finance.local');
  }

  await connection.close();
  console.log('Tenant migration completed.');
}

if (require.main === module) {
  migrateDefaultTenant().catch((err) => {
    console.error('Tenant migration failed', err);
    process.exit(1);
  });
}

export { migrateDefaultTenant };
