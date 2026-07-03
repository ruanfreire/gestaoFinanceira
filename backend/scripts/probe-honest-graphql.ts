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

async function loginContext() {
  loadEnvFile();
  const login = process.env.TEST_LOGIN?.trim();
  const password = process.env.TEST_SENHA?.trim();
  if (!login || !password) throw new Error('Defina TEST_LOGIN e TEST_SENHA');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const authUrl =
    'https://auth.honest.com.br/realms/cliente/protocol/openid-connect/auth?client_id=back-front&redirect_uri=https%3A%2F%2Fhonest.com.br%2Foauth2%2Fcallback&response_type=code&scope=openid+email+profile+offline_access&state=test';

  await page.goto(authUrl, { waitUntil: 'domcontentloaded' });
  await page.fill('#username, input[name="username"]', login);
  await page.fill('#password, input[name="password"]', password);
  await page.click('#kc-login, input[type="submit"]');
  await page.waitForURL(/honest\.com\.br/, { timeout: 60_000 });
  await page.waitForTimeout(2000);
  await page.goto('https://honest.com.br/u/acesso', { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => undefined);
  await page.waitForTimeout(2000);
  const authCheck = await context.request.get('https://honest.com.br/oauth2/auth');
  console.log('auth check:', authCheck.status());
  return { browser, context };
}

async function main() {
  const { browser, context } = await loginContext();
  const queries = [
    'query { empresa_list { id nome cpfcnpj } }',
    'query { empresa_list { id nome cnpj cpfCnpj } }',
    'query { empresa { id nome cpfcnpj } }',
    `query Empresas { empresa_list { id nome cpfcnpj } }`,
  ];

  for (const query of queries) {
    const response = await context.request.post('https://honest.com.br/api/v1/graphql', {
      headers: { 'Content-Type': 'application/json' },
      data: { query },
    });
    console.log('---');
    console.log(query);
    console.log(response.status(), (await response.text()).slice(0, 500));
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
