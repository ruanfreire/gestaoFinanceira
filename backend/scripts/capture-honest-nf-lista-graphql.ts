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
  if (!login || !password) throw new Error('Defina TEST_LOGIN e TEST_SENHA');

  const empresaId = Number(process.env.HONEST_PROBE_EMPRESA_ID ?? 6148);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const captured: Array<{ url: string; body: unknown; response?: unknown }> = [];

  page.on('request', async (request) => {
    if (request.url().includes('/api/v1/graphql') && request.method() === 'POST') {
      try {
        const body = request.postDataJSON();
        const response = await request.response();
        const responseText = response ? await response.text() : '';
        let responseJson: unknown = null;
        try {
          responseJson = responseText ? JSON.parse(responseText) : null;
        } catch {
          responseJson = responseText.slice(0, 500);
        }
        captured.push({ url: request.url(), body, response: responseJson });
      } catch {
        // ignore
      }
    }
  });

  const authUrl =
    'https://auth.honest.com.br/realms/cliente/protocol/openid-connect/auth?client_id=back-front&redirect_uri=https%3A%2F%2Fhonest.com.br%2Foauth2%2Fcallback&response_type=code&scope=openid+email+profile+offline_access&state=test';

  await page.goto(authUrl);
  await page.fill('#username, input[name="username"]', login);
  await page.fill('#password, input[name="password"]', password);
  await page.click('#kc-login, input[type="submit"]');
  await page.waitForURL(/honest\.com\.br/, { timeout: 60_000 });
  await page.goto(`https://honest.com.br/u/empresa/${empresaId}/nf/lista`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.waitForTimeout(3000);

  console.log(`Capturadas ${captured.length} chamadas GraphQL na nf/lista`);
  for (const [index, item] of captured.entries()) {
    console.log(`\n=== GraphQL #${index + 1} ===`);
    console.log('Request:', JSON.stringify(item.body, null, 2));
    console.log('Response:', JSON.stringify(item.response, null, 2)?.slice(0, 2000));
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
