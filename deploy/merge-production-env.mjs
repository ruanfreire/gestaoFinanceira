#!/usr/bin/env node
/**
 * Mescla .env local (features) com .env de produção (segredos JWT existentes).
 * Uso: node deploy/merge-production-env.mjs [local.env] [prod.env] [output]
 */
import { readFileSync, writeFileSync } from 'fs';

const localPath = process.argv[2] || 'backend/.env';
const prodPath = process.argv[3] || process.env.PROD_ENV_PATH;
const outPath = process.argv[4] || 'deploy/.env.production';

if (!prodPath) {
  console.error('Informe o .env de produção: PROD_ENV_PATH ou argv[3]');
  process.exit(1);
}

const PLACEHOLDER = /^(replace_with|troque_|change-me|dev-integrations-secret$)/i;
const SKIP_ON_PROD = new Set([
  'USERTESTE',
  'PW',
  'TEST_LOGIN',
  'TEST_SENHA',
  'OLLAMA_ENABLED',
  'OLLAMA_BASE_URL',
  'OLLAMA_MODEL',
]);

function parseEnv(text) {
  const map = new Map();
  const order = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1);
    if (!map.has(key)) order.push(key);
    map.set(key, value);
  }
  return { map, order };
}

const local = parseEnv(readFileSync(localPath, 'utf8'));
const prod = parseEnv(readFileSync(prodPath, 'utf8'));
const out = new Map(prod.map);

// Base de produção
out.set('NODE_ENV', 'production');
out.set('MONGO_URI', 'mongodb://127.0.0.1:27017/finance');
out.set('APP_DOMAIN', 'financeiro.seumovimento.com.br');
out.set('FRONTEND_URL', 'https://financeiro.seumovimento.com.br');
out.set('API_PUBLIC_URL', 'https://financeiro.seumovimento.com.br/api');
out.set('COOKIE_SAME_SITE', out.get('COOKIE_SAME_SITE') || 'lax');
out.set('INTEGRATIONS_WORKER_INTERVAL_MS', '300000');
out.set('HONEST_REQUEST_TIMEOUT_MS', '45000');

for (const [key, value] of local.map) {
  if (SKIP_ON_PROD.has(key)) continue;
  const prodVal = prod.map.get(key);
  const isPlaceholder = !value || PLACEHOLDER.test(value.trim());
  if (prodVal && !PLACEHOLDER.test(prodVal.trim()) && (key.startsWith('JWT_') || key === 'SEED_ADMIN_PASSWORD' || key === 'INTEGRATIONS_CRON_SECRET')) {
    continue;
  }
  if (isPlaceholder && prodVal) continue;
  if (!isPlaceholder || !prodVal) out.set(key, value);
}

const keys = [...new Set([...prod.order, ...local.order, ...out.keys()])];
const lines = [
  '# Gerado por deploy/merge-production-env.mjs — não commitar',
  `# ${new Date().toISOString()}`,
  '',
];
for (const key of keys) {
  if (!out.has(key)) continue;
  lines.push(`${key}=${out.get(key)}`);
}
lines.push('');

writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath} (${out.size} vars)`);
