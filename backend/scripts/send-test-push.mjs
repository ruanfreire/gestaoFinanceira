#!/usr/bin/env node
/**
 * Broadcast de teste: notificação in-app para todos os usuários aprovados + push nos dispositivos inscritos.
 * Uso: node scripts/send-test-push.mjs [titulo] [mensagem] [url]
 * Env: ENV_FILE=/caminho/.env (default prod: /opt/gestao-financeira/.env)
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return false;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (process.env[k] === undefined) process.env[k] = t.slice(eq + 1).trim();
  }
  return true;
}

const envCandidates = [
  process.env.ENV_FILE,
  '/opt/gestao-financeira/.env',
  resolve(__dirname, '../.env'),
].filter(Boolean);

for (const path of envCandidates) {
  if (loadEnvFile(path)) {
    console.log('Env carregado:', path);
    break;
  }
}

const title = process.argv[2] || 'Fecho — teste';
const body = process.argv[3] || 'Mensagem de teste do sistema.';
const url = process.argv[4] || '/';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, MONGO_URI } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('VAPID não configurado no .env');
  process.exit(1);
}

await mongoose.connect(MONGO_URI || 'mongodb://127.0.0.1:27017/finance');
const db = mongoose.connection.db;

const users = await db
  .collection('users')
  .find({ status: 'approved' })
  .project({ _id: 1, tenantId: 1, email: 1 })
  .toArray();

console.log('Usuários aprovados:', users.length);

if (users.length > 0) {
  const now = new Date();
  const notifications = users.map((user) => ({
    userId: user._id,
    tenantId: user.tenantId,
    type: 'system',
    title,
    message: body,
    url,
    read: false,
    createdAt: now,
    updatedAt: now,
  }));
  const { insertedCount } = await db.collection('notifications').insertMany(notifications);
  console.log('Notificações in-app criadas:', insertedCount);
}

const subs = await db.collection('pushsubscriptions').find({}).toArray();
console.log('Dispositivos push inscritos:', subs.length);

if (subs.length === 0) {
  console.warn('Nenhum dispositivo push. No app: Ctrl+K → "Ativar notificações push".');
  await mongoose.disconnect();
  process.exit(0);
}

const webpush = (await import('web-push')).default;
webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@finance.local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

let ok = 0;
let fail = 0;
for (const sub of subs) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify({ title, body, url, type: 'system' }),
    );
    ok += 1;
    console.log('✓ push →', String(sub.userId), sub.endpoint.slice(0, 55) + '...');
  } catch (e) {
    fail += 1;
    const code = e?.statusCode;
    console.warn('✗ falha push', code ?? e?.message);
    if (code === 404 || code === 410) {
      await db.collection('pushsubscriptions').deleteOne({ _id: sub._id });
    }
  }
}

console.log(`\nResumo push: ${ok} enviado(s), ${fail} falha(s)`);
await mongoose.disconnect();
