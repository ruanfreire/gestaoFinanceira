import { connect, connection } from 'mongoose';

/** Coleções preservadas ao zerar o banco (cadastro básico para login). */
const KEEP_COLLECTIONS = new Set(['users', 'organizations', 'organizationinvites']);

async function resetDatabase() {
  if (process.env.RESET_DB_CONFIRM !== '1') {
    console.error(
      'Confirme a operação definindo RESET_DB_CONFIRM=1.\n' +
        'Exemplo: RESET_DB_CONFIRM=1 npm run reset-db --workspace backend',
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
  await connect(mongoUri);
  console.log('Conectado ao MongoDB:', mongoUri);

  const db = connection.db;
  if (!db) throw new Error('Conexão com o banco indisponível');

  const collections = await db.listCollections().toArray();
  const toDrop = collections
    .map((c) => c.name)
    .filter((name) => !KEEP_COLLECTIONS.has(name))
    .sort();

  if (toDrop.length === 0) {
    console.log('Nenhuma coleção para remover (apenas users).');
  } else {
    for (const name of toDrop) {
      await db.dropCollection(name);
      console.log('Removida:', name);
    }
  }

  const users = db.collection('users');
  const userCount = await users.countDocuments();
  const clearedSessions = await users.updateMany(
    {},
    {
      $set: { refreshTokens: [] },
      $unset: { lastLogin: '', lastLoginIp: '' },
    },
  );
  const orgCount = await db.collection('organizations').countDocuments();
  const inviteCount = await db.collection('organizationinvites').countDocuments();
  console.log(
    `Usuários mantidos: ${userCount} · organizações: ${orgCount} · convites: ${inviteCount} · sessões refresh limpas: ${clearedSessions.modifiedCount}`,
  );

  console.log('\nBanco zerado. Mantidos users, organizations e organizationinvites.');
  await connection.close();
}

if (require.main === module) {
  resetDatabase().catch((err) => {
    console.error('Falha ao zerar banco:', err);
    process.exit(1);
  });
}
