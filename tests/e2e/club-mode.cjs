// End-to-end test of club mode with three people (admin, trainee coach, parent)
// on three browsers, against a fake Supabase that lives in this test process and
// applies the same role rules as supabase/schema.sql.
//
// Needs Playwright with Chromium. Run:
//   npm start                       (in one terminal)
//   node tests/e2e/club-mode.cjs    (in another; screenshots go to ./e2e-shots/club-mode)
const { chromium } = require('playwright');
const crypto = require('crypto');

const OUT = process.argv[2] || require('path').join(process.cwd(), 'e2e-shots', 'club-mode');
require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.APP_URL || 'http://localhost:8080/index.html';

// ---------------------------------------------------------------- fake server
const db = { users: [], profiles: [], invites: [], activities: [], plans: [], players: [], runs: [], notes: [] };
const roleOf = (uid) => db.profiles.find((p) => p.id === uid)?.role || 'none';
const READ = {
  profiles: (r, uid, row) => row.id === uid || r === 'admin',
  invites: (r) => r === 'admin',
  activities: (r) => ['admin', 'coach', 'viewer'].includes(r),
  plans: (r) => ['admin', 'coach', 'viewer'].includes(r),
  players: (r) => ['admin', 'coach'].includes(r),
  runs: (r) => ['admin', 'coach'].includes(r),
  notes: (r) => ['admin', 'coach'].includes(r),
};
const WRITE = {
  insert: {
    invites: (r) => r === 'admin',
    activities: (r) => r === 'admin',
    plans: (r) => r === 'admin',
    players: (r) => r === 'admin',
    runs: (r) => ['admin', 'coach'].includes(r),
    notes: (r, uid, row) => r === 'admin' || (r === 'coach' && row.created_by === uid),
  },
  update: {
    profiles: (r) => r === 'admin',
    invites: (r) => r === 'admin',
    activities: (r) => r === 'admin',
    plans: (r) => r === 'admin',
    players: (r) => r === 'admin',
    runs: (r) => ['admin', 'coach'].includes(r),
    notes: (r, uid, row) => r === 'admin' || (r === 'coach' && row.created_by === uid),
  },
  delete: {
    profiles: (r) => r === 'admin',
    invites: (r) => r === 'admin',
    activities: (r) => r === 'admin',
    plans: (r) => r === 'admin',
    players: (r) => r === 'admin',
    runs: (r) => r === 'admin',
    notes: (r, uid, row) => r === 'admin' || (r === 'coach' && row.created_by === uid),
  },
};
const denied = { code: '42501', message: 'new row violates row-level security policy' };
let refused = 0;

function createUser(email, password, name = '') {
  email = email.toLowerCase();
  if (db.users.find((u) => u.email === email)) return { error: { message: 'User already registered' } };
  const user = { id: crypto.randomUUID(), email, password };
  db.users.push(user);
  const inv = db.invites.find((i) => i.email === email);
  db.profiles.push({ id: user.id, email, name: inv?.name || name, role: inv?.role || 'pending', created_at: new Date().toISOString() });
  db.invites = db.invites.filter((i) => i.email !== email);
  return { user: { id: user.id, email } };
}

function handle(op) {
  if (op.t === 'signIn') {
    const u = db.users.find((x) => x.email === op.email.toLowerCase() && x.password === op.password);
    return u ? { data: { user: { id: u.id, email: u.email }, session: { access_token: u.id, user: { id: u.id, email: u.email } } } } : { error: { message: 'Invalid login credentials' } };
  }
  if (op.t === 'signUp') {
    const r = createUser(op.email, op.password, op.name);
    if (r.error) return { error: r.error };
    return { data: { user: r.user, session: { access_token: r.user.id, user: r.user } } };
  }
  if (op.t === 'updateUser') {
    const u = db.users.find((x) => x.id === op.token);
    if (!u) return { error: { message: 'no session' } };
    u.password = op.password;
    return { data: { user: { id: u.id } } };
  }
  // database
  const uid = op.token;
  const r = roleOf(uid);
  const table = db[op.table];
  const match = (row) => op.filters.every(([kind, col, val]) => (kind === 'eq' ? row[col] === val : val.includes(row[col])));
  const key = op.table === 'invites' ? 'email' : 'id';
  if (op.op === 'select') {
    if (!uid) return { error: denied };
    let rows = table.filter((row) => READ[op.table](r, uid, row) && match(row));
    rows = rows.map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => op.cols === '*' || op.cols.split(',').includes(k))));
    if (op.single) return { data: rows[0] || null };
    return { data: structuredClone(rows) };
  }
  if (op.op === 'upsert' || op.op === 'insert') {
    for (const raw of [].concat(op.payload)) {
      const existing = table.find((x) => x[key] === raw[key]);
      const row = existing ? { ...existing, ...raw } : { created_by: uid, ...raw, updated_by: uid };
      const ok = existing ? WRITE.update[op.table]?.(r, uid, existing) : WRITE.insert[op.table]?.(r, uid, row);
      if (!ok) {
        refused++;
        return { error: denied };
      }
      if (existing) Object.assign(existing, raw, { updated_by: uid });
      else table.push(row);
    }
    return { data: null };
  }
  if (op.op === 'update') {
    for (const row of table.filter(match)) if (WRITE.update[op.table]?.(r, uid, row)) Object.assign(row, op.payload);
    return { data: null };
  }
  if (op.op === 'delete') {
    db[op.table] = table.filter((row) => !(match(row) && WRITE.delete[op.table]?.(r, uid, row)));
    return { data: null };
  }
  return { error: { message: 'unknown op' } };
}

// ---------------------------------------------------------------- fake browser library
const FAKE_LIB = `
const call = (op) => window.__fakeSb(op);
export function createClient(url, key, opts = {}) {
  const auth = opts.auth || {};
  const store = auth.storageKey || 'sb';
  let mem = null;
  const getS = () => (auth.persistSession === false ? mem : JSON.parse(localStorage.getItem(store) || 'null'));
  const setS = (s) => { if (auth.persistSession === false) mem = s; else if (s) localStorage.setItem(store, JSON.stringify(s)); else localStorage.removeItem(store); };
  function q(table) {
    const st = { table, op: 'select', cols: '*', filters: [], single: false, payload: null };
    const b = {
      select(cols) { st.cols = cols || '*'; return b; },
      eq(c, v) { st.filters.push(['eq', c, v]); return b; },
      in(c, v) { st.filters.push(['in', c, v]); return b; },
      maybeSingle() { st.single = true; return b; },
      upsert(p) { st.op = 'upsert'; st.payload = p; return b; },
      insert(p) { st.op = 'insert'; st.payload = p; return b; },
      update(p) { st.op = 'update'; st.payload = p; return b; },
      delete() { st.op = 'delete'; return b; },
      then(res, rej) {
        if (window.__offline) return Promise.resolve({ data: null, error: { message: 'TypeError: Failed to fetch' } }).then(res, rej);
        return call({ ...st, t: 'db', token: getS()?.access_token || null }).then((r) => ({ data: r.data ?? null, error: r.error || null })).then(res, rej);
      },
    };
    return b;
  }
  return {
    from: q,
    auth: {
      async getSession() { return { data: { session: getS() } }; },
      async signInWithPassword({ email, password }) { const r = await call({ t: 'signIn', email, password }); if (!r.error) setS(r.data.session); return { data: r.data || {}, error: r.error || null }; },
      async signUp({ email, password, options }) { const r = await call({ t: 'signUp', email, password, name: options?.data?.name }); return { data: r.data || {}, error: r.error || null }; },
      async signOut() { setS(null); return { error: null }; },
      async updateUser({ password }) { const r = await call({ t: 'updateUser', token: getS()?.access_token, password }); return { data: r.data, error: r.error || null }; },
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
    },
  };
}`;

const CONFIG = `export const SUPABASE_URL = 'https://fake.supabase.test';
export const SUPABASE_ANON_KEY = 'anon';
export const USERNAME_DOMAIN = 'cont.royalclub.ro';
export const SUPABASE_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';`;

// ---------------------------------------------------------------- helpers
const errs = [];
const checks = [];
function check(name, ok, extra = '') {
  checks.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
}

async function person(browser, label) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, locale: 'ro-RO' });
  await ctx.exposeFunction('__fakeSb', (op) => handle(op));
  await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'application/javascript', body: CONFIG }));
  await ctx.route('**/supabase-js@*/**', (r) => r.fulfill({ contentType: 'application/javascript', body: FAKE_LIB }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${label}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errs.push(`${label} console: ${m.text()}`));
  return { ctx, page };
}

async function login(page, id, pw) {
  await page.goto(BASE);
  await page.waitForSelector('#login-id');
  await page.fill('#login-id', id);
  await page.fill('#login-pw', pw);
  await page.click('form[data-form="login"] button[type="submit"]');
  await page.waitForSelector('.tabbar, .login-card h1', { timeout: 10000 });
}

async function until(fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

async function settled(page) {
  await page.waitForTimeout(1000);
  await page.waitForFunction(() => document.getElementById('sync-badge')?.classList.contains('sync-synced'), null, { timeout: 10000 });
}

const tabs = (page) => page.$$eval('.tab', (x) => x.map((e) => e.textContent.trim()));

(async () => {
  // The club's first admin, created the way README tells them to.
  db.invites.push({ email: 'admin@club.ro', role: 'admin', name: 'Gionu' });
  createUser('admin@club.ro', 'parola-admin');

  const browser = await chromium.launch();
  const A = await person(browser, 'admin');
  const C = await person(browser, 'coach');
  const V = await person(browser, 'viewer');

  try {
    // ------------------------------------------------ admin
    await A.page.goto(BASE);
    await A.page.waitForSelector('#login-id');
    await A.page.screenshot({ path: `${OUT}/c1-login.png` });
    await A.page.fill('#login-id', 'admin@club.ro');
    await A.page.fill('#login-pw', 'greșită');
    await A.page.click('form[data-form="login"] button[type="submit"]');
    await A.page.waitForSelector('.error');
    check('wrong password is refused with a message', (await A.page.textContent('.error')).includes('nu sunt corecte'));

    await login(A.page, 'admin@club.ro', 'parola-admin');
    check('admin sees all four tabs', (await tabs(A.page)).length === 4, (await tabs(A.page)).join(', '));
    await A.page.click('.tab >> nth=1');
    await A.page.click('.tpl[data-id="u7-60"]');
    await A.page.fill('#plan-name', 'U7 · Marți');
    await A.page.click('.tab >> nth=3');
    await A.page.click('[data-act="toggle-bulk"]');
    await A.page.fill('#bulk-names', 'Andrei, 7\nMaria, 4\nLuca, 10');
    await A.page.click('[data-act="bulk-add"]');
    await until(() => db.plans.length === 1 && db.players.length === 3 && db.plans[0].data.name === 'U7 · Marți');
    check('admin changes reach the club database', db.plans.length === 1 && db.players.length === 3 && db.plans[0].data.name === 'U7 · Marți', `plans=${db.plans.length} players=${db.players.length}`);

    await A.page.click('[data-to="options"]');
    await A.page.click('[data-to="accounts"]');
    await A.page.waitForSelector('.acc-row');
    for (const [name, loginId, pw, role] of [
      ['Ana (stagiar)', 'ana.stagiar', 'parola-ana', 'coach'],
      ['Ion (părinte)', 'ion.parinte', 'parola-ion', 'viewer'],
    ]) {
      await A.page.fill('#acc-name', name);
      await A.page.fill('#acc-login', loginId);
      await A.page.fill('#acc-pw', pw);
      await A.page.selectOption('#acc-role', role);
      await A.page.click('form[data-form="new-account"] button[type="submit"]');
      await A.page.waitForSelector('form[data-form="new-account"] .notice');
    }
    await A.page.waitForFunction(() => document.querySelectorAll('.acc-row').length === 3);
    await A.page.screenshot({ path: `${OUT}/c2-accounts.png`, fullPage: true });
    check('admin creates a coach and a viewer with usernames', db.profiles.find((p) => p.email === 'ana.stagiar@cont.royalclub.ro')?.role === 'coach' && db.profiles.find((p) => p.email === 'ion.parinte@cont.royalclub.ro')?.role === 'viewer');
    check('admin is still logged in as admin after creating accounts', (await A.page.textContent('.acc-row:has-text("(tu)")')).includes('Gionu'));

    // ------------------------------------------------ coach
    await login(C.page, 'ana.stagiar', 'parola-ana');
    check('coach sees the club plan', (await C.page.textContent('.next-card h2')) === 'U7 · Marți');
    check('coach has a Players tab', (await tabs(C.page)).includes('Copii'));
    check('coach can start a session', (await C.page.$('.next-card [data-act="start-run"]')) !== null);
    await C.page.click('.next-card [data-to="plan"]');
    check('coach sees the plan read-only', (await C.page.$('#plan-name')) === null && (await C.page.$('.badge:has-text("Doar vizualizare")')) !== null);
    await C.page.screenshot({ path: `${OUT}/c3-coach-plan.png`, fullPage: true });
    await C.page.click('.tab >> nth=2');
    check('coach cannot add activities', (await C.page.$('[data-act="new-activity"]')) === null);
    await C.page.click('.tab >> nth=3');
    check('coach cannot add players', (await C.page.$('form[data-form="add-player"]')) === null);
    await C.page.click('.list-row:has-text("Andrei")');
    check('coach cannot edit a player', await C.page.$eval('#pl-name', (e) => e.disabled));
    await C.page.click('.tab >> nth=0');
    await C.page.click('.next-card [data-act="start-run"]');
    check('coach cannot add players during attendance', (await C.page.$('form[data-form="add-player-run"]')) === null);
    await C.page.click('[data-act="att-all"]');
    await C.page.click('.run-nav [data-act="run-next"]');
    await C.page.click('[data-act="open-notes"]');
    await C.page.click('.sheet .att:has-text("Maria")');
    await C.page.click('.sheet .chip >> nth=1');
    await C.page.click('[data-act="save-run-note"]');
    await C.page.click('.sheet-head button');
    await C.page.click('.seg-btn >> nth=-1');
    await C.page.click('.run-nav [data-act="run-next"]');
    check('coach cannot discard a session', (await C.page.$('[data-key="discard-run"]')) === null);
    await C.page.click('[data-act="finish-run"]');
    await until(() => db.runs[0]?.data.endedAt && db.notes.length === 1);
    check('the coach’s session and note reach the club', db.runs.length === 1 && db.runs[0].data.endedAt && db.notes.length === 1 && db.notes[0].created_by === db.profiles.find((p) => p.role === 'coach').id, `runs=${db.runs.length} notes=${db.notes.length}`);
    check('coach can delete their own note', (await C.page.$('.note [data-act="delete-note"]')) !== null);
    check('the database refused nothing from the coach', refused === 0, `refused=${refused}`);

    // ------------------------------------------------ viewer
    await login(V.page, 'ion.parinte', 'parola-ion');
    const vt = await tabs(V.page);
    check('viewer has no Players tab', !vt.includes('Copii'), vt.join(', '));
    check('viewer sees the plan but cannot start it', (await V.page.textContent('.next-card h2')) === 'U7 · Marți' && (await V.page.$('[data-act="start-run"]')) === null);
    check('viewer has no past sessions or roster on Today', (await V.page.$('.list-row')) === null);
    const vState = await V.page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('royalclub.cloud.')))));
    check('viewer’s device holds no children’s data', vState.data.players.length === 0 && vState.data.notes.length === 0 && vState.data.runs.length === 0);
    await V.page.click('.next-card [data-to="plan"]');
    await V.page.click('[data-to="print"]');
    check('viewer can open the printable plan', (await V.page.$('.doc')) !== null && (await V.page.$('.checklist.cols')) === null);
    await V.page.screenshot({ path: `${OUT}/c4-viewer-today.png` });
    await V.page.click('.tab >> nth=0');
    await V.page.screenshot({ path: `${OUT}/c4-viewer-today.png`, fullPage: true });

    // ------------------------------------------------ admin sees the coach's work, offline edits sync later
    await A.page.click('.tab >> nth=0');
    await A.page.evaluate(() => window.dispatchEvent(new Event('online')));
    await A.page.waitForSelector('.list-row:has-text("U7 · Marți")', { timeout: 10000 });
    check('admin sees the coach’s session on Today', true);
    await A.page.click('.tab >> nth=1');
    await A.page.click('.plan-card');
    await A.page.evaluate(() => (window.__offline = true));
    await A.page.fill('#plan-name', 'U7 · Marți (offline)');
    await A.page.waitForFunction(() => document.getElementById('sync-badge')?.classList.contains('sync-offline'), null, { timeout: 10000 });
    check('offline edits are kept and the badge says offline', db.plans[0].data.name === 'U7 · Marți');
    await A.page.evaluate(() => {
      window.__offline = false;
      window.dispatchEvent(new Event('online'));
    });
    await settled(A.page);
    check('offline edit is sent when back online', db.plans[0].data.name === 'U7 · Marți (offline)');

    // ------------------------------------------------ admin switches the coach off
    await A.page.click('[data-to="options"]');
    await A.page.click('[data-to="accounts"]');
    await A.page.waitForSelector('.acc-row:has-text("Ana")');
    await A.page.selectOption('.acc-row:has-text("Ana") select', 'disabled');
    await A.page.waitForTimeout(300);
    await C.page.reload();
    await C.page.waitForSelector('.login-card h1');
    check('a switched-off account is locked out', (await C.page.textContent('.login-card h1')).includes('nu este activ'));
    await C.page.screenshot({ path: `${OUT}/c5-disabled.png` });

    // ------------------------------------------------ sign out clears the device
    await V.page.click('[data-to="options"]');
    await V.page.click('[data-act="sign-out"]');
    await V.page.waitForSelector('#login-id');
    const left = await V.page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('royalclub.cloud.') || k === 'royalclub.auth'));
    check('signing out removes the club data from the device', left.length === 0, left.join(','));

    // phone width check
    for (const p of [A.page, C.page]) {
      const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (o > 0) errs.push('horizontal overflow ' + o);
    }
  } catch (e) {
    errs.push('STOPPED: ' + e.message.split('\n')[0]);
  }
  console.log(checks.join('\n'));
  console.log('ERRORS', JSON.stringify(errs, null, 1));
  await browser.close();
  process.exitCode = checks.some((c) => c.startsWith('FAIL')) || errs.length ? 1 : 0;
})();
