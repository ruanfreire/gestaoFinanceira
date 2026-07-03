import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

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

type CookieJar = Map<string, string>;

function jarHeader(jar: CookieJar): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function absorb(jar: CookieJar, response: Response) {
  const list =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean) as string[];
  for (const raw of list) {
    for (const part of String(raw).split(/,(?=\s*[^;]+=)/)) {
      const segment = part.split(';')[0]?.trim();
      const eq = segment.indexOf('=');
      if (eq > 0) jar.set(segment.slice(0, eq), segment.slice(eq + 1));
    }
  }
}

async function fetchJar(url: string, init: RequestInit, jar: CookieJar): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookie = jarHeader(jar);
  if (cookie) headers.set('Cookie', cookie);
  const response = await fetch(url, { ...init, headers, redirect: 'manual' });
  absorb(jar, response);
  return response;
}

async function main() {
  loadEnvFile();

  const login = process.env.TEST_LOGIN?.trim();
  const password = process.env.TEST_SENHA?.trim();
  if (!login || !password) {
    console.error('Defina TEST_LOGIN e TEST_SENHA');
    process.exit(1);
  }

  const authBase = 'https://auth.honest.com.br';
  const realm = 'cliente';
  const clientId = 'back-front';
  const redirectUri = 'https://honest.com.br/oauth2/callback';
  const appBase = 'https://honest.com.br';
  const tokenUrl = `${authBase}/realms/${realm}/protocol/openid-connect/token`;

  // 1) password grant without secret
  {
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      username: login,
      password,
      scope: 'openid email profile offline_access',
    });
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    console.log('1) password grant (sem secret):', response.status, (await response.text()).slice(0, 200));
  }

  // 2) auth code flow
  const keycloakJar: CookieJar = new Map();
  const honestJar: CookieJar = new Map();
  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile offline_access',
    state: 'test',
  });
  let response = await fetchJar(
    `${authBase}/realms/${realm}/protocol/openid-connect/auth?${authParams}`,
    { headers: { Accept: 'text/html' } },
    keycloakJar,
  );
  const html = await response.text();
  const formMatch =
    html.match(/<form[^>]*id="kc-form-login"[^>]*action="([^"]+)"/i) ??
    html.match(/<form[^>]*action="([^"]+)"[^>]*id="kc-form-login"/i);
  if (!formMatch) {
    console.log('2) formulário Keycloak não encontrado');
    return;
  }

  const actionUrl = formMatch[1].replace(/&amp;/g, '&');
  response = await fetchJar(
    actionUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
      body: new URLSearchParams({ username: login, password, login: 'Entrar' }).toString(),
    },
    keycloakJar,
  );

  let location = response.headers.get('location');
  let code = '';
  for (let hop = 0; hop < 12; hop += 1) {
    if (location?.includes('code=')) {
      code = new URL(location).searchParams.get('code') ?? '';
      break;
    }
    if (!location || response.status < 300 || response.status >= 400) break;
    const jar = location.includes('auth.honest.com.br') ? keycloakJar : honestJar;
    const nextUrl = location.startsWith('http') ? location : `${appBase}${location}`;
    response = await fetchJar(nextUrl, { headers: { Accept: 'text/html,application/json,*/*' } }, jar);
    location = response.headers.get('location');
  }

  console.log('2) authorization code:', code ? `${code.slice(0, 24)}...` : 'NÃO OBTIDO');
  if (!code) return;

  // 3) exchange without secret
  {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
    });
    const exchange = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const text = await exchange.text();
    console.log('3) code exchange (sem secret):', exchange.status, text.slice(0, 250));

    try {
      const json = JSON.parse(text) as { access_token?: string };
      if (json.access_token) {
        const gql = await fetch(`${appBase}/api/v1/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${json.access_token}`,
          },
          body: JSON.stringify({ query: 'query Empresas { empresas { id nome cpfcnpj } }' }),
        });
        console.log('4) GraphQL com bearer:', gql.status, (await gql.text()).slice(0, 300));
      }
    } catch {
      // ignore
    }
  }

  // 4) callback status — with and without Keycloak cookies
  if (location) {
    const callbackOnlyHonest = await fetchJar(location, { headers: { Accept: 'text/html' } }, honestJar);
    console.log('5a) callback (só jar honest):', callbackOnlyHonest.status);

    const merged = new Map([...keycloakJar, ...honestJar]);
    const callbackMerged = await fetchJar(location, { headers: { Accept: 'text/html' } }, merged);
    console.log('5b) callback (keycloak+honest cookies):', callbackMerged.status);

    const authCheck = await fetchJar(`${appBase}/oauth2/auth`, { headers: { Accept: 'application/json' } }, merged);
    console.log('6) /oauth2/auth após callback merged:', authCheck.status, (await authCheck.text()).slice(0, 150));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
