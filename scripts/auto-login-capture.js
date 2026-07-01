const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  page.on('console', (msg) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log('[browser:error]', err.stack || err.message || String(err));
  });
  page.on('requestfailed', (req) => {
    console.log('[browser:requestfailed]', req.url(), req.failure()?.errorText);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('[browser:http-error]', res.status(), res.url());
    }
  });

  try {
    // First, perform login directly against backend to obtain accessToken (bypass frontend /api proxy)
    let accessToken = null;
    try {
      const fetch = require('node-fetch');
      const resp = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@finance.local', password: '123456' }),
      });
      const body = await resp.json();
      if (body?.ok && body.accessToken) {
        accessToken = body.accessToken;
        console.log('Obtained accessToken from backend');
      } else {
        console.log('Backend login did not return accessToken', body);
      }
    } catch (err) {
      console.error('Backend login failed:', err && err.message ? err.message : err);
    }

    const signinUrl = 'http://localhost:5173/auth/signin';
    console.log('Navigating to', signinUrl);
    await page.goto(signinUrl, { waitUntil: 'networkidle2' });
    if (accessToken) {
      // set token in localStorage and navigate to dashboard
      await page.evaluate((t) => {
        localStorage.setItem('accessToken', t);
      }, accessToken);
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    } else {
      // fallback: try to submit UI form
      await page.waitForSelector('input[placeholder=\"info@gmail.com\"]', { timeout: 5000 });
      await page.type('input[placeholder=\"info@gmail.com\"]', 'admin@finance.local', { delay: 50 });
      await page.type('input[placeholder=\"Enter your password\"]', '123456', { delay: 50 });
      await page.focus('input[placeholder=\"Enter your password\"]');
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    }

    // allow time for any console logs
    await new Promise((r) => setTimeout(r, 1500));
    console.log('Current URL:', page.url());
  } catch (e) {
    console.error('Navigation/login failed:', e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }
})();

