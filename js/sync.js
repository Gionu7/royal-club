// Pure sync logic between the app's state and the club database. No network here.
//
// `snapshot` remembers, per kind and id, the last version known to be on the server
// (as a stable JSON string). Comparing it with the app's state tells us what this
// device changed and still has to send.

export const KINDS = ['activities', 'plans', 'players', 'notes', 'runs'];

/** What each role may read and write. Mirrors supabase/schema.sql. */
export const ACCESS = {
  admin: { read: KINDS, write: KINDS },
  coach: { read: KINDS, write: ['runs', 'notes'] },
  viewer: { read: ['activities', 'plans'], write: [] },
};

/** JSON with sorted keys, so the same data always gives the same text. */
export function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

export function emptySnapshot() {
  return Object.fromEntries(KINDS.map((k) => [k, {}]));
}

/** Changes this device has to send: {kind: {upserts: [item], deletes: [id]}}. */
export function diff(state, snapshot, writable) {
  const out = {};
  for (const kind of writable) {
    const snap = snapshot[kind] || {};
    const local = state[kind] || [];
    const ids = new Set();
    const upserts = [];
    for (const item of local) {
      ids.add(item.id);
      if (snap[item.id] !== stable(item)) upserts.push(item);
    }
    const deletes = Object.keys(snap).filter((id) => !ids.has(id));
    if (upserts.length || deletes.length) out[kind] = { upserts, deletes };
  }
  return out;
}

export function hasChanges(d) {
  return Object.keys(d).length > 0;
}

/** After a successful send, record the sent versions as the server's. */
export function markSent(snapshot, kind, { upserts = [], deletes = [] }) {
  const snap = (snapshot[kind] ||= {});
  for (const item of upserts) snap[item.id] = stable(item);
  for (const id of deletes) delete snap[id];
}

/**
 * Bring the server's rows into the state.
 * server: {kind: [item]} for every kind the role can read.
 * Local changes not yet sent win (they are sent next); everything else follows
 * the server. Kinds the role cannot write always follow the server.
 * Returns true when the state changed.
 */
export function merge(state, server, snapshot, writable) {
  let changed = false;
  for (const kind of Object.keys(server)) {
    const canWrite = writable.includes(kind);
    const snap = (snapshot[kind] ||= {});
    const local = state[kind] || [];
    const localById = new Map(local.map((x) => [x.id, x]));
    const serverById = new Map(server[kind].map((x) => [x.id, x]));
    const next = [];
    const nextSnap = {};

    for (const item of server[kind]) {
      const text = stable(item);
      nextSnap[item.id] = text;
      const mine = localById.get(item.id);
      const editedHere = canWrite && mine && snap[item.id] !== stable(mine);
      const deletedHere = canWrite && !mine && snap[item.id] !== undefined;
      if (deletedHere) continue; // the delete is sent next
      if (editedHere) next.push(mine);
      else {
        next.push(item);
        if (!mine || stable(mine) !== text) changed = true;
      }
    }
    // Items made on this device and not sent yet.
    for (const item of local) {
      if (serverById.has(item.id)) continue;
      if (canWrite && snap[item.id] === undefined) next.push(item);
      else if (canWrite && snap[item.id] !== stable(item)) next.push(item); // edited here, deleted on the server: keep
      else changed = true; // removed on the server
    }
    // Keep the app's order for items it already had; new ones go first.
    const order = new Map(local.map((x, i) => [x.id, i]));
    next.sort((a, b) => (order.get(a.id) ?? -1) - (order.get(b.id) ?? -1));
    state[kind] = next;
    snapshot[kind] = nextSnap;
  }
  return changed;
}
