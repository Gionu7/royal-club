// Age filter, templates, custom activity ages, print view (writes PDFs), U10 run.
// Run: npm start, then node tests/e2e/features.cjs
const { chromium } = require('playwright');
const { BASE, outDir, singleDevice, finish } = require('./helpers.cjs');
(async () => {
  const out = outDir('features');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 1, locale: 'en-GB' });
  await singleDevice(ctx, { english: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push('console ' + m.text()));
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      errs.push(`STEP ${name}: ${e.message.split('\n')[0]}`);
    }
  };
  await page.goto(BASE);
  await page.waitForSelector('.next-card');

  await step('players', async () => {
    await page.click('.tab:has-text("Players")');
    await page.click('text=Add several');
    await page.fill('#bulk-names', 'Andrei, 7\nMaria, 4\nLuca, 10\nIoana\nDavid, 9\nSofia, 2\nMatei, 5\nElena, 8');
    await page.click('[data-act="bulk-add"]');
  });

  await step('library age filter', async () => {
    await page.click('.tab:has-text("Library")');
    console.log('all', await page.$$eval('.act-card', (x) => x.length));
    await page.selectOption('#lib-age', '11');
    console.log('U11', await page.$$eval('.act-card', (x) => x.length));
    await page.screenshot({ path: out + '/a1-library-u11.png' });
    await page.selectOption('#lib-age', '5');
    console.log('U5', await page.$$eval('.act-card', (x) => x.length));
    await page.selectOption('#lib-age', '');
    await page.click('.act-card:has-text("Possession 4 v 4")');
    await page.screenshot({ path: out + '/a2-possession.png', fullPage: true });
  });

  await step('templates', async () => {
    await page.click('.tab:has-text("Sessions")');
    await page.screenshot({ path: out + '/a3-sessions.png', fullPage: true });
    await page.click('.tpl:has-text("U10")');
    console.log('u10 total', await page.textContent('.big-num'));
    await page.click('[data-act="open-picker"]');
    console.log('picker age', await page.$eval('#pick-age', (e) => e.value), 'rows', await page.$$eval('.pick-row', (x) => x.length));
    await page.click('.sheet-head button');
  });

  await step('print view', async () => {
    await page.click('[data-to="print"]');
    await page.screenshot({ path: out + '/a4-print-screen.png', fullPage: true });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: out + '/session-plan-u10.pdf', format: 'A4', printBackground: true });
    await page.emulateMedia({ media: 'screen' });
  });

  await step('editor ages', async () => {
    await page.click('.tab:has-text("Library")');
    await page.click('[data-act="new-activity"]');
    await page.fill('#d-title', 'Crossbar challenge');
    await page.selectOption('#d-aMin', '10');
    await page.selectOption('#d-aMax', '12');
    await page.click('form button[type="submit"]');
    console.log('custom ages', await page.textContent('.ac-age'));
  });

  await step('run U10', async () => {
    await page.click('.tab:has-text("Sessions")');
    await page.click('.plan-card:has-text("U9")');
    await page.click('.action-bar [data-act="start-run"]');
    await page.click('[data-act="att-all"]');
    for (let i = 0; i < 4; i++) await page.click('.run-nav [data-act="run-next"]');
    await page.click('summary');
    await page.screenshot({ path: out + '/a5-run-rondo.png', fullPage: true });
  });

  await step('ro', async () => {
    await page.click('[data-act="nav"][data-to="today"]');
    await page.click('[data-act="nav"][data-to="options"]');
    await page.click('[data-l="ro"]');
    await page.click('.tab >> nth=1');
    await page.click('.plan-card:has-text("U9")');
    await page.click('[data-to="print"]');
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: out + '/session-plan-u10-ro.pdf', format: 'A4', printBackground: true });
  });

  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 360, height: 780 });
  for (const tab of [0, 1, 2, 3]) {
    await page.goto(BASE);
    await page.click(`.tab >> nth=${tab}`).catch(() => {});
    const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (o > 0) errs.push(`overflow tab ${tab}: ${o}px`);
  }
  finish(errs);
  await b.close();
})();
