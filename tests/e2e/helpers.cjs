// Shared setup for the browser tests in this folder.
// They need Playwright with Chromium and the app served locally (npm start).
const fs = require('fs');
const path = require('path');

const BASE = process.env.APP_URL || 'http://localhost:8080/index.html';

/** Where screenshots go: first CLI argument, or ./e2e-shots/<name>. */
function outDir(name) {
  const dir = process.argv[2] || path.join(process.cwd(), 'e2e-shots', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Club mode off: the app runs on one device with no login, whatever js/config.js says. */
async function singleDevice(ctx, { english = false } = {}) {
  await ctx.route('**/js/config.js', (r) =>
    r.fulfill({
      contentType: 'application/javascript',
      body: "export const SUPABASE_URL = ''; export const SUPABASE_ANON_KEY = ''; export const USERNAME_DOMAIN = 'cont.royalclub.ro'; export const SUPABASE_LIB = '';",
    }),
  );
  if (english) {
    await ctx.addInitScript(() => {
      if (!localStorage.getItem('royalclub.v1')) localStorage.setItem('royalclub.v1', JSON.stringify({ settings: { lang: 'en', langChosen: true } }));
    });
  }
}

/** Ends the run with a failing exit code when anything went wrong. */
function finish(errs, checks = []) {
  if (checks.length) console.log(checks.join('\n'));
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  process.exitCode = errs.length || checks.some((c) => c.startsWith('FAIL')) ? 1 : 0;
}

module.exports = { BASE, outDir, singleDevice, finish };
