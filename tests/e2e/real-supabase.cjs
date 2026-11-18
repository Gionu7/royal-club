// Checks the app against the real club project in js/config.js with the real
// supabase-js library, with club mode switched on whatever CLUB_MODE says: the login screen appears and a wrong password is refused.
// With E2E_LOGIN and E2E_PASSWORD set, it also signs in and checks the Today screen.
//
// The browser normally loads supabase-js from cdn.jsdelivr.net. Where that host
// is blocked, install it once (npm install --no-save @supabase/supabase-js@2.45.4)
// and this test serves the local copy instead.
// Run: npm start, then node tests/e2e/real-supabase.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { BASE, outDir, finish } = require('./helpers.cjs');

(async () => {
  const out = outDir('real-supabase');
  const errs = [];
  const checks = [];
  const check = (name, ok, extra = '') => checks.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  let umdDir = null;
  try {
    umdDir = path.join(path.dirname(require.resolve('@supabase/supabase-js/package.json')), 'dist/umd');
  } catch {
    /* use the CDN */
  }
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 } });
  // Login may be switched off in js/config.js (CLUB_MODE); switch it on here to reach the real project.
  const realConfig = fs.readFileSync(path.join(__dirname, '../../js/config.js'), 'utf8').replace(/^export const CLUB_MODE = .*$/m, 'export const CLUB_MODE = true;');
  await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'application/javascript', body: realConfig }));
  if (umdDir) {
    const esm = `${fs.readFileSync(path.join(umdDir, 'supabase.js'), 'utf8')}\nexport const createClient = globalThis.supabase.createClient;`;
    await ctx.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@*/**', (r) => {
      const file = r.request().url().split('/').pop();
      if (file.endsWith('.supabase.js')) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(umdDir, file), 'utf8') });
      return r.fulfill({ contentType: 'application/javascript', body: esm });
    });
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE);
  await page.waitForSelector('#login-id', { timeout: 20000 });
  check('login screen appears', true);
  await page.fill('#login-id', 'nobody@example.com');
  await page.fill('#login-pw', 'not-a-real-password');
  await page.click('form[data-form="login"] button[type="submit"]');
  await page.waitForSelector('.error', { timeout: 20000 });
  check('a wrong password is refused by the real project', /corecte|not right/.test(await page.textContent('.error')));
  if (process.env.E2E_LOGIN && process.env.E2E_PASSWORD) {
    await page.fill('#login-id', process.env.E2E_LOGIN);
    await page.fill('#login-pw', process.env.E2E_PASSWORD);
    await page.click('form[data-form="login"] button[type="submit"]');
    await page.waitForSelector('.tabbar, .login-card h1', { timeout: 20000 });
    check('signs in with E2E_LOGIN', (await page.$('.tabbar')) !== null, await page.textContent('h1').catch(() => ''));
    await page.screenshot({ path: `${out}/today.png`, fullPage: true });
  }
  await b.close();
  finish(errs, checks);
})();
