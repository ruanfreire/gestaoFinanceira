#!/usr/bin/env node
import { chromium } from 'playwright';

const serverArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];

async function launch() {
  const useBundled =
    process.platform === 'linux' && (process.env.HONEST_BROWSER_BUNDLED ?? 'true').trim().toLowerCase() !== 'false';

  if (useBundled) {
    try {
      const bundled = await import('@sparticuz/chromium');
      const pack = bundled.default ?? bundled;
      return chromium.launch({
        headless: true,
        args: [...(pack.args ?? []), ...serverArgs],
        executablePath: await pack.executablePath(),
      });
    } catch (error) {
      console.warn('bundled chromium indisponível, tentando playwright cache:', error.message);
    }
  }

  return chromium.launch({ headless: true, args: serverArgs });
}

try {
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto('about:blank');
  console.log('OK chromium', await browser.version());
  await browser.close();
} catch (e) {
  console.error('FAIL', e.message);
  process.exit(1);
}
