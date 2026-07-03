#!/usr/bin/env node
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';
const TENANT_ID = process.argv[2];

async function main() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const sample = await db
    .collection('notas')
    .find({ $or: [{ tenantId: null }, { tenantId: { $exists: false } }] })
    .limit(5)
    .project({ empresa: 1, numero: 1, valor: 1, status: 1, nota_api_id: 1, tenantId: 1, createdAt: 1 })
    .toArray();
  console.log('=== Sample notas sem tenant (5) ===');
  sample.forEach((n) => console.log(JSON.stringify(n)));

  const byEmpresa = await db
    .collection('notas')
    .aggregate([
      { $match: { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] } },
      { $group: { _id: '$empresa', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 15 },
    ])
    .toArray();
  console.log('\n=== Top empresas (notas sem tenant) ===');
  byEmpresa.forEach((r) => console.log(r._id || '(vazio)', ':', r.n));

  const imp = await db.collection('importacaos').findOne({ filename: 'inicial.json' });
  console.log('\n=== importacao inicial.json ===');
  console.log(JSON.stringify(imp));

  if (TENANT_ID) {
    const oid = new mongoose.Types.ObjectId(TENANT_ID);
    const org = await db.collection('organizations').findOne({ _id: oid });
    if (!org) {
      console.error('Org not found:', TENANT_ID);
      process.exit(1);
    }
    const confirm = process.env.REPAIR_CONFIRM === '1';
    const filter = { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] };
    const count = await db.collection('notas').countDocuments(filter);
    console.log('\n=== Repair preview ===');
    console.log('Assign', count, 'notas →', org.slug, org.name, '(' + TENANT_ID + ')');
    if (!confirm) {
      console.log('Set REPAIR_CONFIRM=1 to apply');
    } else {
      const r = await db.collection('notas').updateMany(filter, { $set: { tenantId: oid } });
      console.log('Updated notas:', r.modifiedCount);
      if (imp && !imp.tenantId) {
        const ri = await db.collection('importacaos').updateOne(
          { _id: imp._id },
          { $set: { tenantId: oid } },
        );
        console.log('Updated importacao inicial.json tenantId:', ri.modifiedCount);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
