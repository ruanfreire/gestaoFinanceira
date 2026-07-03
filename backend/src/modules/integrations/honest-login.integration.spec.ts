import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { honestLogin } from './honest-api.client';

function loadEnvFile() {
  const envPath = resolve(__dirname, '../../../.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

describe('honest login integration', () => {
  it.skipIf(process.env.TEST_HONEST_INTEGRATION !== 'true')(
    'autentica com TEST_LOGIN e TEST_SENHA do .env',
    async () => {
    loadEnvFile();

    const login = process.env.TEST_LOGIN?.trim();
    const password = process.env.TEST_SENHA?.trim();
    if (!login || !password) return;

    const appBaseUrl = process.env.HONEST_APP_BASE_URL?.trim() || 'https://honest.com.br';
    const result = await honestLogin(appBaseUrl, login, password, 45_000, undefined, {
      oidc: {
        authBaseUrl: process.env.HONEST_AUTH_BASE_URL?.trim() || 'https://auth.honest.com.br',
        realm: process.env.HONEST_KEYCLOAK_REALM?.trim() || 'cliente',
        clientId: process.env.HONEST_KEYCLOAK_CLIENT_ID?.trim() || 'back-front',
        clientSecret: process.env.HONEST_KEYCLOAK_CLIENT_SECRET?.trim() || undefined,
      },
      appBaseUrl,
      redirectUri: process.env.HONEST_OAUTH_REDIRECT_URI?.trim() || 'https://honest.com.br/oauth2/callback',
    });

    expect(result.ok, result.error).toBe(true);
    expect(result.session?.cookie || result.session?.token).toBeTruthy();
    },
    60_000,
  );
});
