import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { honestLogin } from '../src/modules/integrations/honest-api.client';

function loadEnvFile() {
  const envPath = resolve(__dirname, '../.env');
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

async function main() {
  loadEnvFile();

  const login = process.env.TEST_LOGIN?.trim();
  const password = process.env.TEST_SENHA?.trim();
  if (!login || !password) {
    console.error('Defina TEST_LOGIN e TEST_SENHA no backend/.env');
    process.exit(1);
  }

  const appBaseUrl = process.env.HONEST_APP_BASE_URL?.trim() || 'https://honest.com.br';
  const timeoutMs = Number(process.env.HONEST_REQUEST_TIMEOUT_MS ?? 30_000);
  const oidc = {
    authBaseUrl: process.env.HONEST_AUTH_BASE_URL?.trim() || 'https://auth.honest.com.br',
    realm: process.env.HONEST_KEYCLOAK_REALM?.trim() || 'cliente',
    clientId: process.env.HONEST_KEYCLOAK_CLIENT_ID?.trim() || 'back-front',
    clientSecret: process.env.HONEST_KEYCLOAK_CLIENT_SECRET?.trim() || undefined,
  };
  const redirectUri =
    process.env.HONEST_OAUTH_REDIRECT_URI?.trim() || 'https://honest.com.br/oauth2/callback';

  console.log(`Testando login Honest como ${login} em ${appBaseUrl}...`);
  console.log(`Senha carregada: ${password.length} caracteres, começa com "${password.slice(0, 2)}..."`);

  const result = await honestLogin(appBaseUrl, login, password, timeoutMs, undefined, {
    oidc,
    appBaseUrl,
    redirectUri,
  });

  if (!result.ok || !result.session) {
    console.error('Falha:', result.error);
    if (result.attempts?.length) {
      console.error('Tentativas:', result.attempts.join('; '));
    }
    process.exit(1);
  }

  console.log('OK — sessão obtida');
  console.log('  loginPath:', result.session.loginPath);
  console.log('  token:', result.session.token ? `${result.session.token.slice(0, 24)}...` : '(cookie only)');
  console.log('  cookie:', result.session.cookie ? 'sim' : 'não');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
