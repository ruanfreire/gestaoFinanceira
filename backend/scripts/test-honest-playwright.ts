import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { chromium } from 'playwright';

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
    console.error('Defina TEST_LOGIN e TEST_SENHA');
    process.exit(1);
  }

  const authBase = process.env.HONEST_AUTH_BASE_URL?.trim() || 'https://auth.honest.com.br';
  const realm = process.env.HONEST_KEYCLOAK_REALM?.trim() || 'cliente';
  const clientId = process.env.HONEST_KEYCLOAK_CLIENT_ID?.trim() || 'back-front';
  const redirectUri =
    process.env.HONEST_OAUTH_REDIRECT_URI?.trim() || 'https://honest.com.br/oauth2/callback';
  const appBase = process.env.HONEST_APP_BASE_URL?.trim() || 'https://honest.com.br';

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile offline_access',
    state: Buffer.from('/u/acesso').toString('base64url'),
  });
  const authUrl = `${authBase}/realms/${realm}/protocol/openid-connect/auth?${authParams}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let capturedToken: string | undefined;
  page.on('request', (request) => {
    const auth = request.headers()['authorization'];
    if (auth?.startsWith('Bearer ') && auth.length > 20) capturedToken = auth.slice(7);
  });

  try {
    await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.fill('#username, input[name="username"]', login);
    await page.fill('#password, input[name="password"]', password);
    await page.click('#kc-login, input[type="submit"], button[type="submit"]');
    await page.waitForURL(/honest\.com\.br/, { timeout: 60_000 });
    console.log('URL após login:', page.url());

    await page.goto(`${appBase}/u/acesso`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => undefined);
    await page.waitForTimeout(3000);

    const authResponse = await context.request.get(`${appBase}/oauth2/auth`);
    console.log('/oauth2/auth status:', authResponse.status());
    const authBody = await authResponse.text();
    console.log('/oauth2/auth body:', authBody.slice(0, 200));

    let token = capturedToken;
    if (!token && authBody.trim()) {
      try {
        const json = JSON.parse(authBody) as { access_token?: string; token?: string };
        token = json.access_token ?? json.token;
      } catch {
        // ignore
      }
    }

    if (token) {
      const gql = await context.request.post(`${appBase}/api/v1/graphql`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: { query: 'query Empresas { empresas { id nome cpfcnpj } }' },
      });
      console.log('GraphQL com bearer status:', gql.status());
      console.log('GraphQL com bearer body:', (await gql.text()).slice(0, 400));
    }

    const gqlCookies = await context.request.post(`${appBase}/api/v1/graphql`, {
      headers: { 'Content-Type': 'application/json' },
      data: { query: 'query Empresas { empresas { id nome cpfcnpj } }' },
    });
    console.log('GraphQL com cookies status:', gqlCookies.status());
    console.log('GraphQL com cookies body:', (await gqlCookies.text()).slice(0, 400));

    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    console.log('Cookie header length:', cookieHeader.length);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
