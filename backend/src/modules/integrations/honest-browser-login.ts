type HonestOidcConfig = {
  authBaseUrl: string;
  realm: string;
  clientId: string;
  clientSecret?: string;
};

type HonestSession = {
  baseUrl: string;
  token?: string;
  cookie?: string;
  loginPath?: string;
  expiresAt?: number;
};

type HonestLoginResult = {
  ok: boolean;
  session?: HonestSession;
  error?: string;
  loginPath?: string;
  attempts?: string[];
};

type BrowserLoginOptions = {
  browserLogin?: boolean;
};

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return null;
  }
}

function buildAuthUrl(oidc: HonestOidcConfig, redirectUri: string, clientEntryPath: string): string {
  const authBase = oidc.authBaseUrl.replace(/\/$/, '');
  const state = Buffer.from(clientEntryPath).toString('base64url');
  const authParams = new URLSearchParams({
    client_id: oidc.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile offline_access',
    state,
  });
  return `${authBase}/realms/${oidc.realm}/protocol/openid-connect/auth?${authParams}`;
}

async function launchChromium(playwright: NonNullable<Awaited<ReturnType<typeof loadPlaywright>>>) {
  const serverArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
  const useBundled =
    process.platform === 'linux' && (process.env.HONEST_BROWSER_BUNDLED ?? 'true').trim().toLowerCase() !== 'false';

  if (useBundled) {
    try {
      const bundled = await import('@sparticuz/chromium');
      const chromium = bundled.default ?? bundled;
      return playwright.chromium.launch({
        headless: true,
        args: [...(chromium.args ?? []), ...serverArgs],
        executablePath: await chromium.executablePath(),
      });
    } catch {
      // fallback: playwright cache local
    }
  }

  return playwright.chromium.launch({
    headless: true,
    args: serverArgs,
  });
}

export async function honestPlaywrightLogin(
  oidc: HonestOidcConfig,
  username: string,
  password: string,
  timeoutMs: number,
  appBaseUrl: string,
  redirectUri: string,
  clientEntryPath = '/u/acesso',
): Promise<HonestLoginResult> {
  const playwright = await loadPlaywright();
  if (!playwright) {
    return {
      ok: false,
      error: 'Playwright não instalado. Rode npm install playwright no backend ou configure HONEST_KEYCLOAK_CLIENT_SECRET.',
      attempts: ['browser login: playwright ausente'],
    };
  }

  const appBase = appBaseUrl.replace(/\/$/, '');
  const authUrl = buildAuthUrl(oidc, redirectUri, clientEntryPath);
  let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | undefined;

  try {
    browser = await launchChromium(playwright);
    const context = await browser.newContext();
    const page = await context.newPage();
    const deadline = Date.now() + timeoutMs;

    await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.fill('#username, input[name="username"]', username);
    await page.fill('#password, input[name="password"]', password);
    await page.click('#kc-login, input[type="submit"], button[type="submit"]');
    await page.waitForURL(/honest\.com\.br/, { timeout: Math.max(5_000, deadline - Date.now()) });

    const entryUrl = `${appBase}${clientEntryPath.startsWith('/') ? clientEntryPath : `/${clientEntryPath}`}`;
    await page
      .goto(entryUrl, { waitUntil: 'networkidle', timeout: Math.max(5_000, deadline - Date.now()) })
      .catch(() => undefined);

    const authCheck = await context.request.get(`${appBase}/oauth2/auth`);
    if (authCheck.status() !== 200 && authCheck.status() !== 202) {
      return {
        ok: false,
        error: `Honest /oauth2/auth após login no navegador: HTTP ${authCheck.status()}`,
        attempts: [`browser login: /oauth2/auth HTTP ${authCheck.status()}`],
      };
    }

    const cookies = await context.cookies();
    const cookie = cookies.map((item) => `${item.name}=${item.value}`).join('; ');
    if (!cookie) {
      return {
        ok: false,
        error: 'Login no navegador não gerou cookies de sessão',
        attempts: ['browser login: sem cookies'],
      };
    }

    return {
      ok: true,
      loginPath: '/browser-login',
      session: {
        baseUrl: appBase,
        cookie,
        loginPath: '/browser-login',
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha no login via navegador';
    return {
      ok: false,
      error: `browser login: ${message}`,
      attempts: [`browser login: ${message}`],
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export function isBrowserLoginEnabled(options?: BrowserLoginOptions): boolean {
  if (options?.browserLogin === false) return false;
  if (options?.browserLogin === true) return true;
  const mode = (process.env.HONEST_BROWSER_LOGIN ?? 'false').trim().toLowerCase();
  return mode === 'true' || mode === '1' || mode === 'docker';
}
