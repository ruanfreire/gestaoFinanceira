#!/usr/bin/env node
/** Testa login Honest com Chromium no servidor (usa dist compilado). */
import { honestLogin } from '../dist/modules/integrations/honest-api.client.js';

const login = process.env.TEST_LOGIN?.trim();
const password = process.env.TEST_SENHA?.trim();
if (!login || !password) {
  console.error('Defina TEST_LOGIN e TEST_SENHA');
  process.exit(1);
}

const appBaseUrl = process.env.HONEST_APP_BASE_URL?.trim() || 'https://honest.com.br';
const timeoutMs = Number(process.env.HONEST_REQUEST_TIMEOUT_MS ?? 45_000);

const result = await honestLogin(appBaseUrl, login, password, timeoutMs, undefined, {
  browserLogin: process.env.HONEST_BROWSER_LOGIN !== 'false',
  appBaseUrl,
  redirectUri: process.env.HONEST_OAUTH_REDIRECT_URI?.trim() || 'https://honest.com.br/oauth2/callback',
  oidc: {
    authBaseUrl: process.env.HONEST_AUTH_BASE_URL?.trim() || 'https://auth.honest.com.br',
    realm: process.env.HONEST_KEYCLOAK_REALM?.trim() || 'cliente',
    clientId: process.env.HONEST_KEYCLOAK_CLIENT_ID?.trim() || 'back-front',
    clientSecret: process.env.HONEST_KEYCLOAK_CLIENT_SECRET?.trim() || undefined,
  },
});

if (!result.ok || !result.session) {
  console.error('HONEST_FAIL', result.error);
  if (result.attempts?.length) console.error(result.attempts.join('; '));
  process.exit(1);
}

console.log('HONEST_OK', result.session.loginPath);
