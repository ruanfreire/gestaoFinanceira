#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv() {
  const envPath = join(ROOT, 'backend/.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();
const base = process.env.CRAWL_BASE_URL || 'https://financeiro.seumovimento.com.br';
const profileId = process.env.PROFILE_ID || '6a4809e125268c176fa6995b';
const mes = process.env.SMOKE_MES_PAGAMENTO || '2026-06';

const login = await (
  await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.USERTESTE, password: process.env.PW }),
  })
).json();
const token = login.accessToken;
const url = new URL(`${base}/api/relatorios/exportacao-fluxo-caixa`);
url.searchParams.set('banco', 'custom');
url.searchParams.set('profile_id', profileId);
url.searchParams.set('mes_pagamento', mes);
url.searchParams.set('mes_competencia_nf', mes);

const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
console.log('status', res.status, res.headers.get('content-disposition'));
if (!res.ok) {
  console.log(await res.text());
  process.exit(1);
}
const out = join(ROOT, 'tmp/e2e-fluxo/asaas-only.xlsx');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
const analyze = spawnSync('node', [join(ROOT, 'backend/scripts/analyze-fluxo-xlsx.mjs'), out], {
  encoding: 'utf8',
  cwd: ROOT,
});
console.log(analyze.stdout);
