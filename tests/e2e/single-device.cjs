// One coach on one device (no club database): players, library, building a
// session, running it with timer, calls and notes, finishing, reload, Romanian
// in dark mode, desktop layout and phone-width overflow.
// Run: npm start, then node tests/e2e/single-device.cjs
const { chromium } = require('playwright');
const { BASE, outDir, singleDevice, finish } = require('./helpers.cjs');
(async () => {
  const out = outDir('single-device');
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
  await page.screenshot({ path: out + '/01-today.png', fullPage: true });

  await step('players', async () => {
    await page.click('.tab:has-text("Players")');
    await page.click('text=Add several');
    await page.fill('#bulk-names', 'Andrei, 7\nMaria, 4\nLuca, 10\nIoana\nDavid, 9\nSofia, 2');
    await page.click('[data-act="bulk-add"]');
    await page.screenshot({ path: out + '/02-players.png', fullPage: true });
  });

  await step('library', async () => {
    await page.click('.tab:has-text("Library")');
    await page.screenshot({ path: out + '/03-library.png' });
    await page.click('.act-card:has-text("Sharks")');
    await page.screenshot({ path: out + '/04-activity.png', fullPage: true });
  });

  await step('plan', async () => {
    await page.click('.tab:has-text("Sessions")');
    await page.click('.plan-card');
    await page.screenshot({ path: out + '/05-plan.png', fullPage: true });
    await page.click('[data-act="open-picker"]');
    await page.fill('#pick-search', 'pirate');
    await page.click('.pick-row button');
    await page.screenshot({ path: out + '/06-picker.png' });
    await page.click('.sheet-head button');
    console.log('total after add', await page.textContent('.big-num'));
    const removes = await page.$$('[data-act="remove-block"]');
    await removes[removes.length - 1].click();
    console.log('total after remove', await page.textContent('.big-num'));
  });

  await step('run', async () => {
    await page.click('.action-bar [data-act="start-run"]');
    await page.click('.att:has-text("Andrei")');
    await page.click('.att:has-text("Maria")');
    await page.screenshot({ path: out + '/07-attendance.png', fullPage: true });
    await page.click('.run-nav [data-act="run-next"]');
    // The timer starts by itself when an activity begins.
    if (!(await page.$('.timer.running'))) throw new Error('timer did not start by itself');
    await page.waitForTimeout(1300);
    console.log('digits', await page.textContent('.t-digits'));
    await page.screenshot({ path: out + '/08-run-step.png', fullPage: true });
    await page.click('button.call >> nth=0');
    await page.screenshot({ path: out + '/09-flash.png' });
    await page.click('.flash');
  });

  await step('notes', async () => {
    await page.click('[data-act="open-notes"]');
    await page.click('.sheet .att:has-text("Andrei")');
    await page.click('.sheet .chip:has-text("Brave dribble")');
    await page.screenshot({ path: out + '/10-note.png' });
    await page.click('[data-act="save-run-note"]');
    await page.click('.sheet-head button');
  });

  await step('rounds', async () => {
    for (let i = 0; i < 4; i++) await page.click('.run-nav [data-act="run-next"]');
    if (!(await page.$('.timer.running'))) throw new Error('rounds timer did not start by itself');
    await page.waitForTimeout(600);
    await page.screenshot({ path: out + '/11-rounds.png', fullPage: true });
    await page.click('.t-controls [data-act="t-big"]');
    await page.screenshot({ path: out + '/12-bigtimer.png' });
    await page.click('[data-act="t-big-close"]');
  });

  await step('finish', async () => {
    await page.click('.seg-btn >> nth=-1');
    await page.click('.run-nav [data-act="run-next"]');
    await page.fill('#reflection', 'Sharks was a hit. Gate passing needs wider gates.');
    await page.screenshot({ path: out + '/13-finish.png', fullPage: true });
    await page.click('[data-act="finish-run"]');
    await page.screenshot({ path: out + '/14-summary.png', fullPage: true });
  });

  await step('persist', async () => {
    await page.reload();
    await page.click('.tab:has-text("Players")');
    await page.click('.list-row:has-text("Andrei")');
    await page.screenshot({ path: out + '/15-player.png', fullPage: true });
  });

  await step('ro-dark', async () => {
    await page.click('[data-act="nav"][data-to="options"]');
    await page.click('[data-l="ro"]');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.click('.tab >> nth=0');
    await page.screenshot({ path: out + '/16-ro-dark.png', fullPage: true });
    await page.click('.tab >> nth=2');
    await page.click('.act-card:has-text("piraților")');
    await page.screenshot({ path: out + '/17-ro-dark-activity.png', fullPage: true });
  });

  await step('desktop', async () => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.click('.tab >> nth=0');
    await page.click('[data-act="start-run"]');
    await page.click('.run-nav [data-act="run-next"]');
    await page.click('.run-nav [data-act="run-next"]');
    await page.screenshot({ path: out + '/18-desktop-run.png' });
    console.log('overflow desktop', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  });

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
