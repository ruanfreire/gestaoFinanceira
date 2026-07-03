#!/usr/bin/env node
/**
 * Smoke test de produção: login, job de fluxo de caixa e status Honest.
 * Uso: node scripts/prod-smoke-test.mjs
 * Env: API_BASE (default https://financeiro.seumovimento.com.br/api)
 *      USERTESTE, PW — login app
 */
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../.env');
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function api(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { res, json, text };
}

async function main() {
  loadEnv();
  const base = (process.env.API_BASE || 'https://financeiro.seumovimento.com.br/api').replace(/\/$/, '');
  const email = process.env.USERTESTE;
  const password = process.env.PW;
  if (!email || !password) throw new Error('Defina USERTESTE e PW');

  const failures = [];

  console.log('=== 1. Health ===');
  const health = await api(base, '/health');
  console.log(health.res.status, health.json?.status ?? health.json);
  if (!health.res.ok) failures.push('health');

  console.log('\n=== 2. Login ===');
  const login = await api(base, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  console.log(login.res.status, login.json?.ok ? 'ok' : login.json?.message);
  if (!login.res.ok || !login.json?.ok || !login.json?.accessToken) {
    failures.push('login');
    throw new Error('Login falhou');
  }
  const authHeader = { Authorization: `Bearer ${login.json.accessToken}` };

  console.log('\n=== 3. Integrações Honest (GET) ===');
  const honest = await api(base, '/integrations/honest', { headers: authHeader });
  console.log(honest.res.status, {
    connected: honest.json?.is_connected,
    has_credentials: honest.json?.has_credentials,
    last_sync_status: honest.json?.last_sync_status,
  });
  if (!honest.res.ok) failures.push('honest-get');

  console.log('\n=== 4. Job fluxo de caixa ===');
  const mes = process.env.SMOKE_MES_PAGAMENTO || '2026-06';
  const create = await api(
    base,
    `/relatorios/fluxo-caixa/jobs?banco=consolidado&mes_pagamento=${encodeURIComponent(mes)}`,
    { method: 'POST', headers: authHeader },
  );
  console.log('create', create.res.status, create.json?.status, create.json?.id);
  if (!create.res.ok || !create.json?.id) {
    failures.push('fluxo-create');
  } else {
    const jobId = create.json.id;
    let final = create.json;
    const deadline = Date.now() + 8 * 60 * 1000;
    while ((final.status === 'queued' || final.status === 'running') && Date.now() < deadline) {
      await sleep(2000);
      const poll = await api(base, `/relatorios/fluxo-caixa/jobs/${jobId}`, { headers: authHeader });
      final = poll.json;
      process.stdout.write(`  poll ${final?.status} ${final?.progressMessage ?? ''}\n`);
    }
    console.log('final', final?.status, final?.error ?? '');
    if (final?.status !== 'succeeded') {
      failures.push('fluxo-job');
    } else {
      const dl = await fetch(`${base}/relatorios/fluxo-caixa/jobs/${jobId}/download`, {
        headers: authHeader,
      });
      const buf = await dl.arrayBuffer();
      console.log('download', dl.status, `${buf.byteLength} bytes`);
      if (!dl.ok || buf.byteLength < 1000) failures.push('fluxo-download');
    }
  }

  console.log('\n========== RESULTADO ==========');
  if (failures.length) {
    console.error('FALHAS:', failures.join(', '));
    process.exit(1);
  }
  console.log('OK — todos os passos passaram');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
