import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stable, diff, merge, markSent, emptySnapshot, ACCESS } from '../js/sync.js';

const admin = ACCESS.admin.write;
const coach = ACCESS.coach.write;

function synced(server) {
  // A device that has just pulled `server`.
  const state = { activities: [], plans: [], players: [], notes: [], runs: [] };
  const snap = emptySnapshot();
  merge(state, structuredClone(server), snap, admin);
  return { state, snap };
}

test('stable JSON ignores key order', () => {
  assert.equal(stable({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } }), stable({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 }));
  assert.notEqual(stable({ a: 1 }), stable({ a: 2 }));
});

test('a fresh pull has nothing to send', () => {
  const { state, snap } = synced({ plans: [{ id: 'p1', name: 'U7' }], players: [{ id: 'k1', name: 'Ana' }] });
  assert.equal(state.plans.length, 1);
  assert.deepEqual(diff(state, snap, admin), {});
});

test('edits, additions and deletions become upserts and deletes', () => {
  const { state, snap } = synced({ plans: [{ id: 'p1', name: 'U7' }, { id: 'p2', name: 'U9' }] });
  state.plans[0].name = 'U7 edited';
  state.plans = state.plans.filter((p) => p.id !== 'p2');
  state.plans.push({ id: 'p3', name: 'new' });
  const d = diff(state, snap, admin);
  assert.deepEqual(d.plans.upserts.map((p) => p.id), ['p1', 'p3']);
  assert.deepEqual(d.plans.deletes, ['p2']);
  markSent(snap, 'plans', d.plans);
  assert.deepEqual(diff(state, snap, admin), {});
});

test('a coach only sends runs and notes', () => {
  const { state, snap } = synced({ plans: [{ id: 'p1', name: 'U7' }], runs: [] });
  state.plans[0].name = 'changed by mistake';
  state.runs.push({ id: 'r1', step: 0 });
  const d = diff(state, snap, coach);
  assert.deepEqual(Object.keys(d), ['runs']);
});

test('merge keeps unsent local edits and takes everything else from the server', () => {
  const { state, snap } = synced({ plans: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }, { id: 'p3', name: 'C' }] });
  state.plans[0].name = 'A edited here'; // not sent yet
  state.plans.push({ id: 'p4', name: 'made here' }); // not sent yet
  state.plans = state.plans.filter((p) => p.id !== 'p3'); // deleted here, not sent yet
  const server = {
    plans: [
      { id: 'p1', name: 'A edited elsewhere' },
      { id: 'p2', name: 'B edited elsewhere' },
      { id: 'p3', name: 'C' },
      { id: 'p5', name: 'made elsewhere' },
    ],
  };
  const changed = merge(state, server, snap, admin);
  assert.ok(changed);
  const names = Object.fromEntries(state.plans.map((p) => [p.id, p.name]));
  assert.deepEqual(names, { p1: 'A edited here', p2: 'B edited elsewhere', p4: 'made here', p5: 'made elsewhere' });
  const d = diff(state, snap, admin);
  assert.deepEqual(d.plans.upserts.map((p) => p.id).sort(), ['p1', 'p4']);
  assert.deepEqual(d.plans.deletes, ['p3']);
});

test('items removed on the server disappear locally', () => {
  const { state, snap } = synced({ players: [{ id: 'k1' }, { id: 'k2' }] });
  merge(state, { players: [{ id: 'k1' }] }, snap, admin);
  assert.deepEqual(state.players.map((p) => p.id), ['k1']);
  assert.deepEqual(diff(state, snap, admin), {});
});

test('kinds a role cannot write always follow the server', () => {
  const { state, snap } = synced({ plans: [{ id: 'p1', name: 'U7' }] });
  state.plans[0].name = 'local only';
  merge(state, { plans: [{ id: 'p1', name: 'U7' }] }, snap, coach);
  assert.equal(state.plans[0].name, 'U7');
});

test('merge reports no change when nothing changed', () => {
  const { state, snap } = synced({ plans: [{ id: 'p1', b: 1, a: 2 }] });
  assert.equal(merge(state, { plans: [{ id: 'p1', a: 2, b: 1 }] }, snap, admin), false);
});
