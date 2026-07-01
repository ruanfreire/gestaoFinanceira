const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    logs.push({ type: msg.type(), text });
    console.log(`[browser:${msg.type()}] ${text}`);
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
    const routes = ['/', '/auth/signin'];
    for (const route of routes) {
      console.log(`\n--- Navigating to ${route} ---`);
      await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (e) {
    console.error('Navigation failed:', e.message || e);
  }

  await browser.close();
  // exit with code 0
})();

