// Fresh install with an English browser: every screen, every activity and the
// printed plans must read in Romanian. Lists any line with common English words.
// Run: npm start, then node tests/e2e/romanian.cjs
// Visit every screen with a fresh install (no language chosen) and look for English words.
const { chromium } = require('playwright');
const { BASE, singleDevice, finish } = require('./helpers.cjs');
const EN = ['the', 'and', 'with', 'your', 'you', 'to', 'of', 'for', 'is', 'on', 'at', 'ball', 'player', 'players', 'game', 'minutes', 'add', 'start', 'next', 'back', 'notes', 'session', 'sessions', 'coach', 'team', 'warm-up', 'library', 'settings', 'today', 'round', 'rest', 'play', 'easier', 'harder', 'setup', 'equipment', 'space', 'save', 'delete', 'edit', 'none', 'goal', 'pass', 'shot', 'cone', 'run', 'dribble', 'keeper', 'defender', 'attacker', 'loading', 'print', 'schedule', 'register'];
const re = new RegExp(`(^|[^\\p{L}])(${EN.join('|')})(?=$|[^\\p{L}])`, 'giu');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, locale: 'en-GB' });
  await singleDevice(ctx);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const hits = new Map();
  const scan = async (where) => {
    const text = await page.evaluate(() => {
      const bits = [document.body.innerText];
      document.querySelectorAll('[aria-label],[placeholder],[title]').forEach((el) => bits.push(el.getAttribute('aria-label') || '', el.getAttribute('placeholder') || ''));
      return bits.join('\n');
    });
    for (const line of text.split('\n')) {
      if (/^(Royal Club|English)$/.test(line.trim())) continue;
      const m = line.match(re);
      if (m) hits.set(line.trim(), where);
    }
  };
  await page.goto(BASE);
  await page.waitForSelector('.next-card');
  console.log('lang', await page.evaluate(() => document.documentElement.lang));
  await scan('azi');
  await page.click('.tab >> nth=3');
  await scan('copii-gol');
  await page.click('[data-act="toggle-bulk"]');
  await page.fill('#bulk-names', 'Andrei, 7\nMaria');
  await page.click('[data-act="bulk-add"]');
  await scan('copii');
  await page.click('.list-row >> nth=0');
  await scan('copil');
  await page.click('.tab >> nth=2');
  await scan('biblioteca');
  const n = await page.$$eval('.act-card', (x) => x.length);
  for (let i = 0; i < n; i++) {
    await page.click('.tab >> nth=2');
    await page.click(`.act-card >> nth=${i}`);
    await scan('activitate ' + (await page.textContent('h1')));
  }
  await page.click('.tab >> nth=2');
  await page.click('[data-act="new-activity"]');
  await scan('formular');
  await page.click('.tab >> nth=1');
  await scan('antrenamente');
  await page.click('.plan-card');
  await scan('constructor');
  await page.click('[data-act="open-picker"]');
  await scan('alegere');
  await page.click('.sheet-head button');
  await page.click('[data-to="print"]');
  await scan('tipărire');
  await page.click('.back-link');
  await page.click('.action-bar [data-act="start-run"]');
  await scan('prezență');
  await page.click('[data-act="att-all"]');
  for (let i = 0; i < 9; i++) {
    await page.click('.run-nav [data-act="run-next"]');
    await page.click('summary').catch(() => {});
    await scan('pas ' + i);
  }
  await page.click('.run-nav [data-act="run-prev"]');
  await page.click('[data-act="open-notes"]');
  await scan('notițe');
  await page.click('.sheet .att >> nth=0');
  await scan('notiță copil');
  await page.click('.sheet-head button');
  await page.click('.run-nav [data-act="run-next"]');
  await page.click('.run-nav [data-act="run-next"]');
  await scan('final');
  await page.click('[data-act="finish-run"]');
  await scan('rezumat');
  await page.click('[data-act="nav"][data-to="options"]');
  await scan('setări');
  for (const tpl of ['u5-45', 'u10-75', 'u12-90']) {
    await page.click('.tab >> nth=1');
    await page.click(`[data-id="${tpl}"]`);
    await page.click('[data-to="print"]');
    await scan('tipărire ' + tpl);
  }
  console.log('Possible English text:', hits.size);
  for (const [line, where] of hits) console.log(`  [${where}] ${line.slice(0, 140)}`);
  // Only "start" is allowed through: it is also Romanian ("La start", "con de start").
  const real = [...hits.keys()].filter((line) => line.replace(/start/gi, '').match(re));
  if (real.length) errs.push(...real.map((l) => 'English text: ' + l.slice(0, 120)));
  finish(errs);
  await b.close();
})();
