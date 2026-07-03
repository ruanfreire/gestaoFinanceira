#!/usr/bin/env node
/** Login + export consolidado sync (sem job) e analisa abas */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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

async function main() {
  loadEnv();
  const baseURL = process.env.CRAWL_BASE_URL || 'https://financeiro.seumovimento.com.br';
  const email = process.env.USERTESTE || process.env.SMOKE_EMAIL;
  const password = process.env.PW || process.env.SMOKE_PW;
  const mes = process.env.SMOKE_MES_PAGAMENTO || '2026-06';

  const loginRes = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginRes.json();
  if (!loginRes.ok || !login.ok) throw new Error(login.message || 'login failed');
  const token = login.accessToken;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  console.log('JWT tenantId:', payload.tenantId);

  const url = new URL(`${baseURL}/api/relatorios/exportacao-fluxo-caixa`);
  url.searchParams.set('banco', 'consolidado');
  url.searchParams.set('mes_pagamento', mes);
  url.searchParams.set('mes_competencia_nf', mes);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  console.log('export status', res.status, res.headers.get('content-disposition'));
  if (!res.ok) {
    console.log(await res.text());
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = join(ROOT, 'tmp', 'e2e-fluxo', `sync-consolidado-${mes}.xlsx`);
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('saved', out, buf.length);

  const analyze = spawnSync('node', [join(ROOT, 'backend/scripts/analyze-fluxo-xlsx.mjs'), out], {
    encoding: 'utf8',
    cwd: ROOT,
  });
  console.log(analyze.stdout);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
