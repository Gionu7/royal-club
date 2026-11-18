// Connection to the club database (Supabase): login, accounts and syncing.
// When js/config.js has CLUB_MODE off (or no database), none of this runs and the app works on one device.
import * as cfg from './config.js';
import { KINDS, ACCESS, diff, hasChanges, markSent, merge, emptySnapshot } from './sync.js';

let sb = null;
let createClientFn = null;
let profile = null;
let snapshot = emptySnapshot();
let state = null;
let onData = () => {};
let onStatus = () => {};
let status = 'idle'; // idle | syncing | synced | offline | error
let pushTimer = null;
let pullTimer = null;
let busy = null;

/** Club mode is on when config.js switches it on and names a database. */
export function isEnabled() {
  return cfg.CLUB_MODE === true && Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
}

export function getProfile() {
  return profile;
}

export function role() {
  return profile?.role || 'none';
}

export function isActive() {
  return ['admin', 'coach', 'viewer'].includes(role());
}

export function getStatus() {
  return status;
}

function setStatus(s) {
  if (s !== status) {
    status = s;
    onStatus(s);
  }
}

/** "andrei" → "andrei@<USERNAME_DOMAIN>"; emails are lower-cased. */
export function toLogin(id) {
  const v = String(id || '').trim().toLowerCase();
  if (v.includes('@')) return v;
  const slug = v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug ? `${slug}@${cfg.USERNAME_DOMAIN}` : '';
}

/** What to show for a login: usernames without the hidden domain. */
export function shownLogin(email) {
  const suffix = '@' + cfg.USERNAME_DOMAIN;
  return email && email.endsWith(suffix) ? email.slice(0, -suffix.length) : email || '';
}

async function lib() {
  if (!createClientFn) {
    const mod = await import(/* @vite-ignore */ cfg.SUPABASE_LIB);
    createClientFn = mod.createClient;
  }
  return createClientFn;
}

async function client() {
  if (!sb) {
    const createClient = await lib();
    sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'royalclub.auth' },
    });
  }
  return sb;
}

function cacheKey() {
  return profile ? `royalclub.cloud.${profile.id}` : null;
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(cacheKey()) || 'null');
  } catch {
    return null;
  }
}

/** Keeps a copy on the device so the app opens at the pitch without signal. */
export function saveCache() {
  if (!profile || !state) return;
  const data = {};
  for (const k of KINDS) data[k] = state[k];
  try {
    localStorage.setItem(cacheKey(), JSON.stringify({ data, snapshot, activeRunId: state.activeRunId || null }));
  } catch {
    /* storage full or blocked: the database still has everything */
  }
}

function clearCache() {
  try {
    if (cacheKey()) localStorage.removeItem(cacheKey());
  } catch {
    /* ignore */
  }
}

async function loadProfile(user) {
  const c = await client();
  const { data, error } = await c.from('profiles').select('id,email,name,role').eq('id', user.id).maybeSingle();
  if (error) throw error;
  profile = data || { id: user.id, email: user.email, name: '', role: 'pending' };
  return profile;
}

/**
 * Restores a saved login. Binds the app state, fills it from the device cache and
 * starts syncing. Returns the profile, or null when nobody is logged in.
 */
export async function start(appState, handlers = {}) {
  state = appState;
  onData = handlers.onData || onData;
  onStatus = handlers.onStatus || onStatus;
  const c = await client();
  const { data } = await c.auth.getSession();
  const user = data?.session?.user;
  if (!user) return null;
  try {
    await loadProfile(user);
  } catch {
    // Offline: fall back to the last profile seen on this device.
    try {
      profile = JSON.parse(localStorage.getItem('royalclub.profile') || 'null');
    } catch {
      profile = null;
    }
    if (!profile || profile.id !== user.id) return null;
    setStatus('offline');
  }
  rememberProfile();
  useCache();
  if (isActive()) begin();
  return profile;
}

function rememberProfile() {
  try {
    localStorage.setItem('royalclub.profile', JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

function useCache() {
  const cached = readCache();
  for (const k of KINDS) state[k] = cached?.data?.[k] || [];
  snapshot = cached?.snapshot || emptySnapshot();
  state.activeRunId = cached?.activeRunId || null;
  state.seeded = true;
}

export async function signIn(login, password) {
  const c = await client();
  const { data, error } = await c.auth.signInWithPassword({ email: toLogin(login), password });
  if (error) throw error;
  await loadProfile(data.user);
  rememberProfile();
  useCache();
  if (isActive()) begin();
  return profile;
}

export async function signOut() {
  stop();
  clearCache();
  try {
    localStorage.removeItem('royalclub.profile');
  } catch {
    /* ignore */
  }
  profile = null;
  snapshot = emptySnapshot();
  try {
    const c = await client();
    await c.auth.signOut();
  } catch {
    /* already signed out */
  }
}

function access() {
  return ACCESS[role()] || { read: [], write: [] };
}

function begin() {
  stop();
  sync();
  pullTimer = setInterval(sync, 30000);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', onVisible);
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') sync();
}

function stop() {
  clearInterval(pullTimer);
  clearTimeout(pushTimer);
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', sync);
    document.removeEventListener('visibilitychange', onVisible);
  }
}

/** Call after every local change; sends it shortly after. */
export function changed() {
  if (!profile || !isActive()) return;
  saveCache();
  clearTimeout(pushTimer);
  pushTimer = setTimeout(sync, 800);
}

/** Send local changes, then fetch everything new. Never runs twice at once. */
export function sync() {
  if (!profile || !isActive()) return Promise.resolve();
  if (busy) {
    busy.again = true;
    return busy;
  }
  const run = (async () => {
    setStatus('syncing');
    try {
      await push();
      await pull();
      setStatus('synced');
    } catch (e) {
      setStatus(isNetworkError(e) ? 'offline' : 'error');
    }
    saveCache();
  })();
  busy = run;
  return run.finally(() => {
    const again = busy?.again;
    busy = null;
    if (again) sync();
  });
}

function isNetworkError(e) {
  return !e || e.name === 'TypeError' || /fetch|network|Failed/i.test(e.message || '') || (typeof navigator !== 'undefined' && navigator.onLine === false);
}

async function push() {
  const c = await client();
  const d = diff(state, snapshot, access().write);
  if (!hasChanges(d)) return;
  for (const kind of Object.keys(d)) {
    const { upserts, deletes } = d[kind];
    if (upserts.length) {
      const { error } = await c.from(kind).upsert(upserts.map((item) => ({ id: item.id, data: item })));
      if (error) {
        if (isNetworkError(error)) throw error;
        // Refused by the database rules: drop the change, the next pull restores the server copy.
        markSent(snapshot, kind, { upserts });
      } else markSent(snapshot, kind, { upserts });
    }
    if (deletes.length) {
      const { error } = await c.from(kind).delete().in('id', deletes);
      if (error && isNetworkError(error)) throw error;
      markSent(snapshot, kind, { deletes });
    }
  }
}

async function pull() {
  const c = await client();
  const server = {};
  for (const kind of access().read) {
    const cols = kind === 'notes' ? 'id,data,created_by' : 'id,data';
    const { data, error } = await c.from(kind).select(cols);
    if (error) throw error;
    server[kind] = (data || []).map((row) => (kind === 'notes' ? { ...row.data, id: row.id, createdBy: row.created_by } : { ...row.data, id: row.id }));
  }
  // Notes this device wrote carry createdBy already; keep snapshots comparable.
  const changedNow = merge(state, server, snapshot, access().write);
  if (changedNow) onData();
}

// ---------------------------------------------------------------- accounts (admin)

export async function listAccounts() {
  const c = await client();
  const [{ data: people, error }, { data: invites }] = await Promise.all([
    c.from('profiles').select('id,email,name,role,created_at'),
    c.from('invites').select('email,name,role,created_at'),
  ]);
  if (error) throw error;
  return { people: people || [], invites: invites || [] };
}

export async function setRole(id, newRole) {
  const c = await client();
  const { error } = await c.from('profiles').update({ role: newRole }).eq('id', id);
  if (error) throw error;
}

export async function setName(id, name) {
  const c = await client();
  const { error } = await c.from('profiles').update({ name }).eq('id', id);
  if (error) throw error;
}

/**
 * Creates a login for someone else. Records the role first (invite), then signs
 * the account up with a separate client so the admin stays logged in.
 * Returns {login, needsConfirm}.
 */
export async function createAccount({ name, login, password, role: newRole }) {
  const email = toLogin(login);
  if (!email) throw new Error('login');
  const c = await client();
  const inv = await c.from('invites').upsert({ email, name, role: newRole });
  if (inv.error) throw inv.error;
  const createClient = await lib();
  const side = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'royalclub.side' },
  });
  const { data, error } = await side.auth.signUp({ email, password, options: { data: { name } } });
  if (error) {
    // Already has a login: just give the existing profile the new role.
    if (/already/i.test(error.message || '')) {
      const { data: existing } = await c.from('profiles').select('id').eq('email', email).maybeSingle();
      if (existing) {
        await setRole(existing.id, newRole);
        await c.from('invites').delete().eq('email', email);
        return { login: shownLogin(email), existed: true };
      }
    }
    throw error;
  }
  return { login: shownLogin(email), needsConfirm: !data?.session };
}

export async function cancelInvite(email) {
  const c = await client();
  const { error } = await c.from('invites').delete().eq('email', email);
  if (error) throw error;
}

/** Changes the password of whoever is logged in. */
export async function changePassword(password) {
  const c = await client();
  const { error } = await c.auth.updateUser({ password });
  if (error) throw error;
}

// For tests: swap in a fake Supabase library.
export function _useLibrary(createClient) {
  createClientFn = createClient;
  sb = null;
}
