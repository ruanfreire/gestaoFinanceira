#!/usr/bin/env node
/**
 * Diagnóstico read-only do MongoDB (local ou produção).
 * Uso: set -a && source .env && set +a && node scripts/diagnose-db.mjs
 */
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';

async function main() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const cols = (await db.listCollections().toArray()).map((c) => c.name).sort();

  console.log('=== DB:', db.databaseName, '===');
  console.log('Collections (' + cols.length + '):', cols.join(', '));

  const orgs = await db
    .collection('organizations')
    .find({})
    .project({ name: 1, slug: 1, status: 1, ownerUserId: 1, plan: 1, billingStatus: 1 })
    .toArray();
  console.log('\n=== Organizations (' + orgs.length + ') ===');
  for (const o of orgs) console.log(JSON.stringify(o));

  const users = await db
    .collection('users')
    .find({})
    .project({ email: 1, name: 1, status: 1, tenantId: 1, tenantRole: 1, roles: 1, company: 1 })
    .toArray();
  console.log('\n=== Users (' + users.length + ') ===');
  for (const u of users) console.log(JSON.stringify(u));

  const orgIds = new Set(orgs.map((o) => String(o._id)));
  let orphans = 0;
  console.log('\n=== Orphan tenantIds ===');
  for (const u of users) {
    if (u.tenantId && !orgIds.has(String(u.tenantId))) {
      orphans += 1;
      console.log('ORPHAN:', u.email, 'tenantId=', u.tenantId, 'company=', u.company);
    }
  }
  console.log('Total orphans:', orphans);

  const noTenant = users.filter((u) => !u.tenantId);
  console.log('\n=== Users without tenantId (' + noTenant.length + ') ===');
  for (const u of noTenant) {
    console.log(JSON.stringify({ email: u.email, roles: u.roles, status: u.status }));
  }

  const orgsNoOwner = orgs.filter((o) => !o.ownerUserId);
  console.log('\n=== Orgs without ownerUserId (' + orgsNoOwner.length + ') ===');
  for (const o of orgsNoOwner) console.log(JSON.stringify({ slug: o.slug, name: o.name }));

  const countNames = [
    'organizations',
    'users',
    'notas',
    'bankimportacaos',
    'banklancamentos',
    'importacaos',
    'pagamentovinculos',
    'honestintegrations',
    'notifications',
    'asaasimportacaos',
    'asaaslancamentos',
    'nubankimportacaos',
    'nubanklancamentos',
    'importprofiles',
    'importanalysissessions',
  ];
  console.log('\n=== Document counts ===');
  for (const c of countNames) {
    if (cols.includes(c)) console.log(c + ':', await db.collection(c).countDocuments());
  }

  async function countMissingOrg(collection) {
    if (!cols.includes(collection)) return null;
    const r = await db
      .collection(collection)
      .aggregate([
        { $lookup: { from: 'organizations', localField: 'tenantId', foreignField: '_id', as: 'org' } },
        { $match: { org: { $size: 0 }, tenantId: { $exists: true, $ne: null } } },
        { $count: 'n' },
      ])
      .toArray();
    return r[0]?.n ?? 0;
  }

  console.log('\n=== Data integrity ===');
  for (const c of ['notas', 'banklancamentos', 'bankimportacaos', 'pagamentovinculos', 'importacaos']) {
    const n = await countMissingOrg(c);
    if (n !== null) console.log(c + ' with missing org:', n);
  }

  console.log('\n=== Notas por tenant ===');
  const byTenant = await db
    .collection('notas')
    .aggregate([{ $group: { _id: '$tenantId', n: { $sum: 1 } } }, { $sort: { n: -1 } }])
    .toArray();
  const orgById = new Map(orgs.map((o) => [String(o._id), o]));
  for (const row of byTenant) {
    const o = orgById.get(String(row._id));
    console.log((o ? o.slug : 'NO_ORG') + ' (' + (o ? o.name : row._id) + '):', row.n);
  }

  const notasNoTenant = await db.collection('notas').countDocuments({
    $or: [{ tenantId: null }, { tenantId: { $exists: false } }],
  });
  console.log('Notas sem tenantId:', notasNoTenant);

  console.log('\n=== Importacaos ===');
  const importacaos = await db.collection('importacaos').find({}).toArray();
  for (const i of importacaos) {
    const o = i.tenantId ? orgById.get(String(i.tenantId)) : null;
    console.log(
      JSON.stringify({
        id: i._id,
        tenant: o ? o.slug : i.tenantId,
        tipo: i.tipo,
        filename: i.filename ?? i.originalName,
        status: i.status,
      }),
    );
  }

  console.log('\n=== Legacy extrato counts (if any) ===');
  for (const c of ['asaasimportacaos', 'asaaslancamentos', 'nubankimportacaos', 'nubanklancamentos']) {
    if (cols.includes(c)) {
      const n = await db.collection(c).countDocuments();
      if (n > 0) {
        const byT = await db
          .collection(c)
          .aggregate([{ $group: { _id: '$tenantId', n: { $sum: 1 } } }])
          .toArray();
        console.log(c + ':', n, byT);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('diagnose-db failed', err);
  process.exit(1);
});
