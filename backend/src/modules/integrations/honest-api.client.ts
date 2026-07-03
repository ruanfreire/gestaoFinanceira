import { scoreHonestPayload } from './honest-discovery.util';
import { honestPlaywrightLogin, isBrowserLoginEnabled } from './honest-browser-login';

export type HonestSession = {
  baseUrl: string;
  token?: string;
  refreshToken?: string;
  cookie?: string;
  headers?: Record<string, string>;
  loginPath?: string;
  oidcTokenUrl?: string;
  expiresAt?: number;
};

export type HonestOidcConfig = {
  authBaseUrl: string;
  realm: string;
  clientId: string;
  clientSecret?: string;
};

export type HonestLoginOptions = {
  oidc?: HonestOidcConfig;
  appBaseUrl?: string;
  redirectUri?: string;
  clientEntryPath?: string;
  browserLogin?: boolean;
};

export type HonestLoginResult = {
  ok: boolean;
  session?: HonestSession;
  error?: string;
  loginPath?: string;
  attempts?: string[];
};

export type HonestRequestResult = {
  url: string;
  ok: boolean;
  status: number;
  json?: unknown;
  error?: string;
  notaCount?: number;
  score?: number;
};

type LoginAttempt = {
  label: string;
  path: string;
  method?: 'POST';
  body?: Record<string, string> | string;
  contentType?: string;
  tokenPaths: string[];
};

function escapeGraphql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function defaultLoginAttempts(login: string, password: string): LoginAttempt[] {
  const email = login;
  const graphqlLogin = `mutation { login(email: "${escapeGraphql(email)}", password: "${escapeGraphql(password)}") { token accessToken } }`;
  const graphqlSignIn = `mutation { signIn(email: "${escapeGraphql(email)}", password: "${escapeGraphql(password)}") { token } }`;

  return [
    { label: 'POST /api/auth/login', path: '/api/auth/login', body: { email, password }, tokenPaths: ['token', 'accessToken', 'data.token'] },
    { label: 'POST /api/login (email)', path: '/api/login', body: { email, password }, tokenPaths: ['token', 'accessToken', 'data.token'] },
    { label: 'POST /api/login (login/senha)', path: '/api/login', body: { login: email, senha: password }, tokenPaths: ['token', 'accessToken', 'data.token'] },
    { label: 'POST /api/v1/auth/login', path: '/api/v1/auth/login', body: { email, password }, tokenPaths: ['token', 'access_token', 'data.token'] },
    { label: 'POST /auth/login', path: '/auth/login', body: { email, password }, tokenPaths: ['token', 'accessToken', 'data.token'] },
    { label: 'POST /login', path: '/login', body: { email, password }, tokenPaths: ['token', 'accessToken'] },
    {
      label: 'POST /graphql (login)',
      path: '/graphql',
      body: JSON.stringify({ query: graphqlLogin }),
      contentType: 'application/json',
      tokenPaths: ['data.login.token', 'data.login.accessToken', 'data.signIn.token', 'token'],
    },
    {
      label: 'POST /graphql (signIn)',
      path: '/graphql',
      body: JSON.stringify({ query: graphqlSignIn }),
      contentType: 'application/json',
      tokenPaths: ['data.signIn.token', 'data.login.token', 'token'],
    },
    {
      label: 'POST /api/v1/graphql',
      path: '/api/v1/graphql',
      body: JSON.stringify({ query: graphqlLogin }),
      contentType: 'application/json',
      tokenPaths: ['data.login.token', 'data.login.accessToken', 'data.signIn.token', 'token'],
    },
    {
      label: 'POST /api/v2/graphql',
      path: '/api/v2/graphql',
      body: JSON.stringify({ query: graphqlLogin }),
      contentType: 'application/json',
      tokenPaths: ['data.login.token', 'data.login.accessToken', 'data.signIn.token', 'token'],
    },
  ];
}

function readNestedToken(payload: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const parts = path.split('.');
    let current: unknown = payload;
    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (typeof current === 'string' && current.trim()) return current.trim();
  }
  return undefined;
}

function extractCookie(setCookieHeader: string | null): string | undefined {
  if (!setCookieHeader) return undefined;
  return setCookieHeader
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

function serializeLoginBody(attempt: LoginAttempt): string {
  if (typeof attempt.body === 'string') return attempt.body;
  return JSON.stringify(attempt.body ?? {});
}

function buildKeycloakTokenUrl(oidc: HonestOidcConfig): string {
  const authBase = oidc.authBaseUrl.replace(/\/$/, '');
  return `${authBase}/realms/${oidc.realm}/protocol/openid-connect/token`;
}

function readExpiresAt(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const expiresIn = (payload as Record<string, unknown>).expires_in;
  if (typeof expiresIn === 'number' && expiresIn > 0) {
    return Date.now() + expiresIn * 1000;
  }
  return undefined;
}

type CookieJar = Map<string, string>;

function absorbSetCookie(jar: CookieJar, header: string | null, response?: Response) {
  const setCookieList =
    response && 'getSetCookie' in response.headers && typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : header
        ? [header]
        : [];

  for (const raw of setCookieList) {
    const parts = raw.split(/,(?=\s*[^;]+=)/);
    for (const part of parts) {
      const segment = part.split(';')[0]?.trim();
      const eq = segment.indexOf('=');
      if (eq > 0) jar.set(segment.slice(0, eq), segment.slice(eq + 1));
    }
  }
}

function jarToHeader(jar: CookieJar): string {
  return Array.from(jar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function mergeCookieJars(...jars: CookieJar[]): CookieJar {
  const merged: CookieJar = new Map();
  for (const jar of jars) {
    for (const [key, value] of jar) merged.set(key, value);
  }
  return merged;
}

function parseKeycloakFormAction(html: string): string | undefined {
  const match =
    html.match(/<form[^>]*id="kc-form-login"[^>]*action="([^"]+)"/i) ??
    html.match(/<form[^>]*action="([^"]+)"[^>]*id="kc-form-login"/i);
  return match?.[1]?.replace(/&amp;/g, '&');
}

function extractCodeFromLocation(location: string): string | undefined {
  try {
    return new URL(location).searchParams.get('code') ?? undefined;
  } catch {
    const match = location.match(/[?&]code=([^&]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  }
}

async function fetchWithCookieJar(
  url: string,
  init: RequestInit,
  jar: CookieJar,
  signal: AbortSignal,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookie = jarToHeader(jar);
  if (cookie) headers.set('Cookie', cookie);
  if (!headers.has('User-Agent')) headers.set('User-Agent', 'GestaoFinanceira-HonestSync/1.0');
  const response = await fetch(url, { ...init, signal, headers, redirect: 'manual' });
  absorbSetCookie(jar, response.headers.get('set-cookie'), response);
  return response;
}

async function exchangeAuthorizationCode(
  oidc: HonestOidcConfig,
  code: string,
  redirectUri: string,
  signal: AbortSignal,
): Promise<{ ok: boolean; json?: unknown; error?: string }> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: oidc.clientId,
    code,
    redirect_uri: redirectUri,
  });
  if (oidc.clientSecret) params.set('client_secret', oidc.clientSecret);

  const response = await fetch(buildKeycloakTokenUrl(oidc), {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GestaoFinanceira-HonestSync/1.0',
    },
    body: params.toString(),
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const errorCode = readNestedToken(json, ['error_description', 'error']) ?? `HTTP ${response.status}`;
    return { ok: false, error: String(errorCode) };
  }

  return { ok: true, json };
}

async function completeHonestOAuthCallback(
  callbackUrl: string,
  jar: CookieJar,
  appBaseUrl: string,
  signal: AbortSignal,
): Promise<HonestLoginResult> {
  const appBase = appBaseUrl.replace(/\/$/, '');
  let response = await fetchWithCookieJar(
    callbackUrl,
    { method: 'GET', headers: { Accept: 'text/html,application/json,*/*' } },
    jar,
    signal,
  );

  for (let hop = 0; hop < 10; hop += 1) {
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      const nextUrl = location.startsWith('http') ? location : `${appBase}${location.startsWith('/') ? '' : '/'}${location}`;
      response = await fetchWithCookieJar(
        nextUrl,
        { method: 'GET', headers: { Accept: 'text/html,application/json,*/*' } },
        jar,
        signal,
      );
      continue;
    }
    break;
  }

  const authCheck = await fetchWithCookieJar(
    `${appBase}/oauth2/auth`,
    { method: 'GET', headers: { Accept: 'application/json' } },
    jar,
    signal,
  );

  if (authCheck.status !== 200 && authCheck.status !== 202) {
    return {
      ok: false,
      error: `Honest /oauth2/auth: HTTP ${authCheck.status}`,
      attempts: [`Honest callback: sessão não confirmada (HTTP ${authCheck.status})`],
    };
  }

  const cookie = jarToHeader(jar);
  if (!cookie) {
    return {
      ok: false,
      error: 'Honest callback: nenhum cookie de sessão recebido',
      attempts: ['Honest callback: sem cookies'],
    };
  }

  let token: string | undefined;
  const authText = await authCheck.text();
  if (authText.trim()) {
    try {
      const body = JSON.parse(authText) as unknown;
      token = readNestedToken(body, ['access_token', 'token', 'data.access_token', 'data.token']);
    } catch {
      // resposta vazia ou não-json é aceitável quando cookies bastam
    }
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  return {
    ok: true,
    loginPath: '/oauth2/callback',
    session: {
      baseUrl: appBase,
      token,
      cookie,
      headers,
      loginPath: '/oauth2/callback',
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    },
  };
}

function buildSessionFromTokenPayload(
  json: unknown,
  appBaseUrl: string,
  tokenPath: string,
  tokenUrl: string,
): HonestSession | undefined {
  const token = readNestedToken(json, ['access_token']);
  if (!token) return undefined;
  const refreshToken = readNestedToken(json, ['refresh_token']);
  return {
    baseUrl: appBaseUrl.replace(/\/$/, ''),
    token,
    refreshToken,
    headers: { Authorization: `Bearer ${token}` },
    loginPath: tokenPath,
    oidcTokenUrl: tokenUrl,
    expiresAt: readExpiresAt(json),
  };
}

export async function honestOAuthLogin(
  oidc: HonestOidcConfig,
  username: string,
  password: string,
  timeoutMs: number,
  appBaseUrl: string,
  redirectUri: string,
  clientEntryPath = '/u/acesso',
): Promise<HonestLoginResult> {
  const authBase = oidc.authBaseUrl.replace(/\/$/, '');
  const tokenPath = `/realms/${oidc.realm}/protocol/openid-connect/token`;
  const state = Buffer.from(clientEntryPath).toString('base64url');
  const authParams = new URLSearchParams({
    client_id: oidc.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile offline_access',
    state,
  });
  const authUrl = `${authBase}/realms/${oidc.realm}/protocol/openid-connect/auth?${authParams}`;

  const keycloakJar: CookieJar = new Map();
  const honestJar: CookieJar = new Map();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetchWithCookieJar(
      authUrl,
      { method: 'GET', headers: { Accept: 'text/html' } },
      keycloakJar,
      controller.signal,
    );
    const html = await response.text();
    const actionUrl = parseKeycloakFormAction(html);
    if (!actionUrl) {
      return {
        ok: false,
        error: 'Keycloak: formulário de login não encontrado',
        attempts: ['Keycloak auth code: formulário ausente'],
      };
    }

    const loginBody = new URLSearchParams({
      username,
      password,
      login: 'Entrar',
    });
    response = await fetchWithCookieJar(
      actionUrl,
      {
        method: 'POST',
        headers: {
          Accept: 'text/html,application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: loginBody.toString(),
      },
      keycloakJar,
      controller.signal,
    );

    let location = response.headers.get('location');
    for (let hop = 0; hop < 12; hop += 1) {
      if (location) {
        const code = extractCodeFromLocation(location);
        if (code) {
          const callbackUrl = location.startsWith('http')
            ? location
            : `${appBaseUrl.replace(/\/$/, '')}${location.startsWith('/') ? '' : '/'}${location}`;

          const sessionJar = mergeCookieJars(keycloakJar, honestJar);
          const honestResult = await completeHonestOAuthCallback(
            callbackUrl,
            sessionJar,
            appBaseUrl,
            controller.signal,
          );
          if (honestResult.ok && honestResult.session) return honestResult;

          const exchanged = await exchangeAuthorizationCode(oidc, code, redirectUri, controller.signal);
          if (exchanged.ok && exchanged.json) {
            const tokenPath = `/realms/${oidc.realm}/protocol/openid-connect/token`;
            const session = buildSessionFromTokenPayload(
              exchanged.json,
              appBaseUrl,
              tokenPath,
              buildKeycloakTokenUrl(oidc),
            );
            if (!session) {
              return {
                ok: false,
                error: 'Keycloak auth code: token endpoint não retornou access_token',
                attempts: ['Keycloak auth code: sem access_token'],
              };
            }
            return { ok: true, loginPath: tokenPath, session };
          }

          const exchangeHint = oidc.clientSecret
            ? exchanged.error
              ? ` Troca do code: ${exchanged.error}.`
              : ''
            : ' Configure HONEST_KEYCLOAK_CLIENT_SECRET no .env (client back-front é confidencial).';

          return {
            ok: false,
            error: `${honestResult.error ?? 'Honest /oauth2/callback falhou'}.${exchangeHint}`,
            attempts: [
              ...(honestResult.attempts ?? ['Honest callback: falhou']),
              ...(exchanged.error ? [`Keycloak code exchange: ${exchanged.error}`] : []),
            ],
          };
        }
      }

      if (!location || response.status < 300 || response.status >= 400) break;
      const followJar = location.includes('auth.honest.com.br') ? keycloakJar : honestJar;
      response = await fetchWithCookieJar(
        location.startsWith('http') ? location : `${appBaseUrl.replace(/\/$/, '')}${location}`,
        { method: 'GET', headers: { Accept: 'text/html,application/json,*/*' } },
        followJar,
        controller.signal,
      );
      location = response.headers.get('location');
    }

    if (response.status >= 400) {
      return {
        ok: false,
        error: `Keycloak auth code: HTTP ${response.status} após envio de credenciais`,
        attempts: [`Keycloak auth code: HTTP ${response.status}`],
      };
    }

    return {
      ok: false,
      error: 'Keycloak auth code: credenciais inválidas ou fluxo de redirect inesperado',
      attempts: ['Keycloak auth code: sem authorization code'],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha no login Keycloak';
    return {
      ok: false,
      error: `Keycloak auth code: ${message}`,
      attempts: [`Keycloak auth code: ${message}`],
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function keycloakPasswordLogin(
  oidc: HonestOidcConfig,
  username: string,
  password: string,
  timeoutMs: number,
  appBaseUrl: string,
): Promise<HonestLoginResult> {
  const tokenUrl = buildKeycloakTokenUrl(oidc);
  const tokenPath = `/realms/${oidc.realm}/protocol/openid-connect/token`;
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: oidc.clientId,
    username,
    password,
    scope: 'openid email profile offline_access',
  });
  if (oidc.clientSecret) params.set('client_secret', oidc.clientSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GestaoFinanceira-HonestSync/1.0',
      },
      body: params.toString(),
    });

    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const errorCode = readNestedToken(json, ['error_description', 'error']) ?? `HTTP ${response.status}`;
      return {
        ok: false,
        error: `Keycloak (${tokenPath}): ${errorCode}`,
        attempts: [`Keycloak password grant: ${errorCode}`],
      };
    }

    const session = buildSessionFromTokenPayload(json, appBaseUrl, tokenPath, tokenUrl);
    if (!session) {
      return {
        ok: false,
        error: `Keycloak (${tokenPath}) não retornou access_token`,
        attempts: [`Keycloak password grant: sem access_token`],
      };
    }

    return {
      ok: true,
      loginPath: tokenPath,
      session,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha no login Keycloak';
    return {
      ok: false,
      error: `Keycloak: ${message}`,
      attempts: [`Keycloak password grant: ${message}`],
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function keycloakRefreshLogin(
  oidc: HonestOidcConfig,
  refreshToken: string,
  timeoutMs: number,
  appBaseUrl: string,
): Promise<HonestLoginResult> {
  const tokenUrl = buildKeycloakTokenUrl(oidc);
  const tokenPath = `/realms/${oidc.realm}/protocol/openid-connect/token`;
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: oidc.clientId,
    refresh_token: refreshToken,
  });
  if (oidc.clientSecret) params.set('client_secret', oidc.clientSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GestaoFinanceira-HonestSync/1.0',
      },
      body: params.toString(),
    });

    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const errorCode = readNestedToken(json, ['error_description', 'error']) ?? `HTTP ${response.status}`;
      return { ok: false, error: `Keycloak refresh: ${errorCode}` };
    }

    const token = readNestedToken(json, ['access_token']);
    if (!token) return { ok: false, error: 'Keycloak refresh não retornou access_token' };

    const nextRefresh = readNestedToken(json, ['refresh_token']) ?? refreshToken;
    const session = buildSessionFromTokenPayload(json, appBaseUrl, tokenPath, tokenUrl);
    if (!session) return { ok: false, error: 'Keycloak refresh não retornou access_token' };
    session.refreshToken = nextRefresh;

    return {
      ok: true,
      loginPath: tokenPath,
      session,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha no refresh Keycloak';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function honestLogin(
  baseUrl: string,
  login: string,
  password: string,
  timeoutMs: number,
  customLoginPath?: string,
  options?: HonestLoginOptions,
): Promise<HonestLoginResult> {
  const base = baseUrl.replace(/\/$/, '');
  const appBaseUrl = (options?.appBaseUrl ?? base).replace(/\/$/, '');
  const attemptLog: string[] = [];
  let lastError = 'Não foi possível autenticar na Honest';

  if (options?.oidc && !customLoginPath) {
    const redirectUri = options.redirectUri ?? 'https://honest.com.br/oauth2/callback';

    const honestOAuthResult = await honestOAuthLogin(
      options.oidc,
      login,
      password,
      timeoutMs,
      appBaseUrl,
      redirectUri,
      options.clientEntryPath ?? '/u/acesso',
    );
    if (honestOAuthResult.ok && honestOAuthResult.session) return honestOAuthResult;
    if (honestOAuthResult.attempts?.length) attemptLog.push(...honestOAuthResult.attempts);
    if (honestOAuthResult.error) lastError = honestOAuthResult.error;

    if (options.oidc.clientSecret) {
      const keycloakResult = await keycloakPasswordLogin(options.oidc, login, password, timeoutMs, appBaseUrl);
      if (keycloakResult.ok && keycloakResult.session) return keycloakResult;
      if (keycloakResult.attempts?.length) attemptLog.push(...keycloakResult.attempts);
      if (keycloakResult.error) lastError = keycloakResult.error;
    }

    if (isBrowserLoginEnabled(options)) {
      const browserResult = await honestPlaywrightLogin(
        options.oidc,
        login,
        password,
        timeoutMs,
        appBaseUrl,
        redirectUri,
        options.clientEntryPath ?? '/u/acesso',
      );
      if (browserResult.ok && browserResult.session) return browserResult;
      if (browserResult.attempts?.length) attemptLog.push(...browserResult.attempts);
      if (browserResult.error) lastError = browserResult.error;
    }

    const summary = attemptLog.length ? ` Tentativas: ${attemptLog.join('; ')}.` : '';
    const browserOff = !isBrowserLoginEnabled(options);
    const secretHint = options.oidc.clientSecret
      ? ''
      : browserOff
        ? ' Login Honest em servidor exige HONEST_KEYCLOAK_CLIENT_SECRET (sem Chromium). Solicite o secret do client back-front à Honest.'
        : ' Para login sem navegador, configure HONEST_KEYCLOAK_CLIENT_SECRET. Com HONEST_BROWSER_LOGIN=true é necessário Playwright + Chromium no servidor.';
    return {
      ok: false,
      error: `${lastError}.${summary}${secretHint}`,
      attempts: attemptLog,
    };
  }

  const attempts: LoginAttempt[] = customLoginPath
    ? [
        {
          label: `POST ${customLoginPath}`,
          path: customLoginPath,
          body: { email: login, password },
          tokenPaths: ['token', 'accessToken', 'data.token', 'data.login.token'],
        },
      ]
    : defaultLoginAttempts(login, password);

  for (const attempt of attempts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const contentType = attempt.contentType ?? 'application/json';
      const response = await fetch(`${base}${attempt.path}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': contentType,
          'User-Agent': 'GestaoFinanceira-HonestSync/1.0',
        },
        body: serializeLoginBody(attempt),
      });

      const text = await response.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!response.ok) {
        lastError = `HTTP ${response.status} em ${attempt.label}`;
        attemptLog.push(`${attempt.label}: HTTP ${response.status}`);
        continue;
      }

      const token = readNestedToken(json, attempt.tokenPaths);
      const cookie = extractCookie(response.headers.get('set-cookie'));
      if (!token && !cookie) {
        lastError = `${attempt.label} não retornou token nem cookie`;
        attemptLog.push(`${attempt.label}: sem token/cookie`);
        continue;
      }

      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      return {
        ok: true,
        loginPath: attempt.path,
        session: {
          baseUrl: appBaseUrl,
          token,
          cookie,
          headers,
          loginPath: attempt.path,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no login';
      lastError = `${attempt.label}: ${message}`;
      attemptLog.push(lastError);
    } finally {
      clearTimeout(timeout);
    }
  }

  const summary = attemptLog.length ? ` Tentativas: ${attemptLog.join('; ')}.` : '';
  return { ok: false, error: `${lastError}.${summary}`, attempts: attemptLog };
}

export async function honestAuthenticatedRequest(
  session: HonestSession,
  url: string,
  method: string,
  timeoutMs: number,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<HonestRequestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'GestaoFinanceira-HonestSync/1.0',
      ...(session.headers ?? {}),
      ...(extraHeaders ?? {}),
    };
    if (session.cookie) headers.Cookie = session.cookie;
    if (body != null && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      return { url, ok: false, status: response.status, error: `HTTP ${response.status}` };
    }

    if (!text.trim()) {
      return { url, ok: false, status: response.status, error: 'Resposta vazia' };
    }

    try {
      const json = JSON.parse(text) as unknown;
      const scored = scoreHonestPayload(json);
      return {
        url,
        ok: true,
        status: response.status,
        json,
        notaCount: scored.notaCount,
        score: scored.score,
      };
    } catch {
      return { url, ok: false, status: response.status, error: 'JSON inválido' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na requisição';
    return { url, ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildBrowseInjectionScript(captureUrl: string): string {
  return `
<script>
(function () {
  if (window.__gestaoHonestCaptureInstalled) return;
  window.__gestaoHonestCaptureInstalled = true;
  const captureUrl = ${JSON.stringify(captureUrl)};

  function report(url, method, status, body) {
    try {
      fetch(captureUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: String(url), method: method || 'GET', status: status || 0, body }),
      }).catch(function () {});
    } catch (_) {}
  }

  const originalFetch = window.fetch;
  window.fetch = function () {
    const args = arguments;
    const req = args[0];
    const method = (args[1] && args[1].method) || 'GET';
    const url = typeof req === 'string' ? req : (req && req.url) || '';
    return originalFetch.apply(this, args).then(function (response) {
      try {
        const clone = response.clone();
        const contentType = clone.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          clone.json().then(function (body) {
            report(url, method, response.status, body);
          }).catch(function () {});
        }
      } catch (_) {}
      return response;
    });
  };

  const openOriginal = XMLHttpRequest.prototype.open;
  const sendOriginal = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__gestaoMethod = method;
    this.__gestaoUrl = url;
    return openOriginal.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', function () {
      try {
        const contentType = this.getResponseHeader('content-type') || '';
        if (!contentType.includes('json')) return;
        const body = JSON.parse(this.responseText);
        report(this.__gestaoUrl, this.__gestaoMethod, this.status, body);
      } catch (_) {}
    });
    return sendOriginal.apply(this, arguments);
  };
})();
</script>`;
}
