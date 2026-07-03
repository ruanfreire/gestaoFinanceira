#!/usr/bin/env node
/**
 * Cria notificação in-app + envia Web Push para um usuário (produção).
 * Uso: node scripts/send-prod-push.mjs <email> [titulo] [mensagem]
 */
import { readFileSync, existsSync } from 'fs';
import mongoose from 'mongoose';

const envPath = process.env.ENV_FILE || '/opt/gestao-financeira/.env';
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (process.env[k] === undefined) process.env[k] = t.slice(eq + 1).trim();
  }
}

const email = process.argv[2];
const title = process.argv[3] || 'Fecho — produção';
const message = process.argv[4] || 'Push de teste enviado com sucesso.';
const url = process.argv[5] || '/';

if (!email) {
  console.error('Uso: node scripts/send-prod-push.mjs <email> [titulo] [mensagem]');
  process.exit(1);
}

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, MONGO_URI } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('VAPID não configurado');
  process.exit(1);
}

await mongoose.connect(MONGO_URI || 'mongodb://127.0.0.1:27017/finance');
const db = mongoose.connection.db;

const user = await db.collection('users').findOne({ email: email.toLowerCase() });
if (!user) {
  console.error('Usuário não encontrado:', email);
  process.exit(1);
}

const notif = {
  userId: user._id,
  tenantId: user.tenantId,
  type: 'system',
  title,
  message,
  url,
  read: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const { insertedId } = await db.collection('notifications').insertOne(notif);
console.log('Notificação in-app criada:', insertedId);

const subs = await db.collection('pushsubscriptions').find({ userId: user._id }).toArray();
console.log('Dispositivos push do usuário:', subs.length);

if (subs.length === 0) {
  console.warn('');
  console.warn('Nenhum dispositivo inscrito. No app em produção:');
  console.warn('  Ctrl+K → "Ativar notificações push" → Permitir no navegador');
  console.warn('Depois rode este script de novo.');
  await mongoose.disconnect();
  process.exit(0);
}

const webpush = (await import('web-push')).default;
webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@finance.local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

let ok = 0;
for (const sub of subs) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify({ title, body: message, url, type: 'system' }),
    );
    ok += 1;
    console.log('✓ Push enviado →', sub.endpoint.slice(0, 60) + '...');
  } catch (e) {
    console.warn('✗ Falha push:', e?.statusCode ?? e?.message);
    if (e?.statusCode === 404 || e?.statusCode === 410) {
      await db.collection('pushsubscriptions').deleteOne({ _id: sub._id });
    }
  }
}

if (ok > 0) {
  await db.collection('notifications').updateOne({ _id: insertedId }, { $set: { pushSentAt: new Date() } });
}
console.log(`\nPush entregue em ${ok}/${subs.length} dispositivo(s).`);
await mongoose.disconnect();
