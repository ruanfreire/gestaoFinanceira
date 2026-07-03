#!/usr/bin/env node
/**
 * Remove dados operacionais (notas, importações, extratos, etc.)
 * mantendo cadastro básico: users, organizations, organizationinvites.
 *
 * Uso:
 *   RESET_DB_CONFIRM=1 node scripts/reset-business-data.mjs
 *   RESET_DB_CONFIRM=1 npm run reset-db --workspace backend
 */
import mongoose from 'mongoose';

const KEEP_COLLECTIONS = new Set(['users', 'organizations', 'organizationinvites']);

async function main() {
  if (process.env.RESET_DB_CONFIRM !== '1') {
    console.error(
      'Confirme com RESET_DB_CONFIRM=1\n' +
        'Exemplo: RESET_DB_CONFIRM=1 node scripts/reset-business-data.mjs',
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  console.log('MongoDB:', db.databaseName);

  const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const toDrop = collections.filter((name) => !KEEP_COLLECTIONS.has(name));

  console.log('\n==> Mantendo:', [...KEEP_COLLECTIONS].sort().join(', '));
  console.log('==> Removendo', toDrop.length, 'coleções...\n');

  for (const name of toDrop) {
    const n = await db.collection(name).countDocuments();
    await db.dropCollection(name);
    console.log(`  drop ${name} (${n} docs)`);
  }

  const users = db.collection('users');
  const userCount = await users.countDocuments();
  const cleared = await users.updateMany(
    {},
    {
      $set: { refreshTokens: [] },
      $unset: { lastLogin: '', lastLoginIp: '' },
    },
  );

  const orgCount = await db.collection('organizations').countDocuments();
  const inviteCount = await db.collection('organizationinvites').countDocuments();

  console.log('\n==> Resumo');
  console.log(`  users: ${userCount} (sessões limpas: ${cleared.modifiedCount})`);
  console.log(`  organizations: ${orgCount}`);
  console.log(`  organizationinvites: ${inviteCount}`);
  console.log('\nBanco pronto para reimportar dados. Logins preservados.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('reset-business-data failed:', err);
  process.exit(1);
});
