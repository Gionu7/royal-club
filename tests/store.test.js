import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';
import { LIBRARY, SAMPLE_PLAN, CATEGORIES } from '../js/library.js';

test('first launch seeds the 60-minute U7 plan from the club PDF', () => {
  const s = S.seed(S.emptyState('ro'), 'ro');
  assert.equal(s.plans.length, 1);
  assert.equal(S.planMinutes(s.plans[0]), 60);
  assert.equal(s.plans[0].name, SAMPLE_PLAN.name.ro);
  // seeding twice does nothing
  S.seed(s, 'ro');
  assert.equal(s.plans.length, 1);
});

test('every library activity is complete in both languages', () => {
  const ids = new Set();
  for (const a of LIBRARY) {
    assert.ok(!ids.has(a.id), `duplicate id ${a.id}`);
    ids.add(a.id);
    assert.ok(CATEGORIES.includes(a.category), a.id);
    for (const f of ['title', 'summary', 'howTo', 'setup']) {
      assert.ok(a[f]?.en && a[f]?.ro, `${a.id}.${f}`);
    }
    for (const c of a.coaching) assert.ok(c.en && c.ro, `${a.id} coaching`);
    for (const c of a.calls || []) assert.ok(c.en && c.ro, `${a.id} calls`);
  }
  for (const [id] of SAMPLE_PLAN.blocks) assert.ok(ids.has(id), `sample plan uses ${id}`);
});

test('timeline gives paper-plan start times', () => {
  const s = S.seed(S.emptyState('en'), 'en');
  const tl = S.timeline(s, s.plans[0]);
  assert.equal(S.clock(tl[0].start), '0:00');
  const game = tl.find((x) => x.block.activityId === '3v3-two-pitches');
  assert.equal(S.clock(game.start), '0:29');
  assert.equal(S.clock(game.end), '0:54');
  assert.equal(S.clock(tl.at(-1).end), '1:00');
});

test('blocks can be added, moved and removed', () => {
  const s = S.emptyState('en');
  const p = S.newPlan(s);
  const a = S.addBlock(s, p, 'free-dribble');
  const b = S.addBlock(s, p, 'water-break');
  assert.equal(a.duration, 5);
  assert.equal(b.duration, 2);
  S.moveBlock(p, b.id, -1);
  assert.deepEqual(p.blocks.map((x) => x.activityId), ['water-break', 'free-dribble']);
  S.moveBlock(p, b.id, -1); // already first
  assert.equal(p.blocks[0].id, b.id);
  S.removeBlock(p, b.id);
  assert.equal(p.blocks.length, 1);
});

test('search works in either language and by category', () => {
  const list = S.allActivities(S.emptyState('en'));
  assert.ok(S.searchActivities(list, { q: 'rechin' }).some((a) => a.id === 'sharks-minnows'));
  assert.ok(S.searchActivities(list, { q: 'shark' }).some((a) => a.id === 'sharks-minnows'));
  assert.ok(S.searchActivities(list, { category: 'game' }).every((a) => a.category === 'game'));
});

test('bulk add players skips blanks and duplicates', () => {
  const s = S.emptyState('en');
  const added = S.bulkAddPlayers(s, 'Andrei, 7\n\nMaria\nandrei\n  Luca , 10 ');
  assert.deepEqual(added.map((p) => [p.name, p.number]), [['Andrei', '7'], ['Maria', ''], ['Luca', '10']]);
});

test('a run tracks attendance, notes and finishes', () => {
  const s = S.seed(S.emptyState('en'), 'en');
  const [a, b] = S.bulkAddPlayers(s, 'Ana\nBogdan');
  const run = S.startRun(s, s.plans[0]);
  assert.equal(S.activeRun(s), run);
  assert.equal(run.steps.length, 9);
  assert.equal(run.steps.find((x) => x.activityId === 'gate-passing').timer.mode, 'rounds');
  run.attendance = [a.id];
  run.attendanceTaken = true;
  S.addNote(s, { playerId: a.id, text: 'Brave dribble', runId: run.id, context: 'Sharks' });
  assert.equal(S.addNote(s, { playerId: b.id, text: '   ' }), null, 'empty notes are ignored');
  S.finishRun(s, run);
  assert.equal(S.activeRun(s), null);
  assert.deepEqual(S.attendanceFor(s, a.id), { attended: 1, total: 1 });
  assert.deepEqual(S.attendanceFor(s, b.id), { attended: 0, total: 1 });
  assert.equal(S.playerNotes(s, a.id).length, 1);
});

test('backups round-trip and reject other JSON', () => {
  const s = S.seed(S.emptyState('en'), 'en');
  S.addPlayer(s, { name: 'Ioana' });
  const back = S.parseBackup(S.exportData(s), 'en');
  assert.equal(back.players[0].name, 'Ioana');
  assert.equal(back.plans.length, 1);
  assert.throws(() => S.parseBackup('{"hello":1}', 'en'));
  assert.throws(() => S.parseBackup('not json', 'en'));
});

import { TEMPLATES, ageOf, agesLabel, tipsFor } from '../js/library.js';

test('every template uses real activities and fits its planned length', () => {
  const ids = new Set(LIBRARY.map((a) => a.id));
  for (const tpl of TEMPLATES) {
    for (const [id] of tpl.blocks) assert.ok(ids.has(id), `${tpl.id} uses ${id}`);
    assert.equal(tpl.blocks.reduce((s, [, m]) => s + m, 0), tpl.target, tpl.id);
    assert.ok(tpl.name.en && tpl.name.ro && tpl.focus.en && tpl.focus.ro, tpl.id);
  }
  const s = S.emptyState('en');
  const p = S.planFromTemplate(s, TEMPLATES[2], 'ro');
  assert.equal(p.name, TEMPLATES[2].name.ro);
  assert.equal(S.planMinutes(p), 75);
});

test('every activity has an age range, and the age filter uses it', () => {
  for (const a of LIBRARY) {
    assert.ok(Array.isArray(a.ages) && a.ages[0] <= a.ages[1], a.id);
  }
  const list = S.allActivities(S.emptyState('en'));
  const u12 = S.searchActivities(list, { age: 12 });
  assert.ok(u12.some((a) => a.id === 'rondo-4v1'));
  assert.ok(!u12.some((a) => a.id === 'animal-moves'));
  const u6 = S.searchActivities(list, { age: 6 });
  assert.ok(u6.some((a) => a.id === 'follow-leader'));
  assert.ok(!u6.some((a) => a.id === 'possession-4v4-2'));
  // custom activities without ages always show
  list.unshift({ id: 'mine', category: 'game', title: 'Mine' });
  assert.ok(S.searchActivities(list, { age: 11 }).some((a) => a.id === 'mine'));
});

test('age helpers', () => {
  assert.equal(ageOf('U10'), 10);
  assert.equal(ageOf('u 7 girls'), 7);
  assert.equal(ageOf('Juniors'), null);
  assert.equal(agesLabel([9, 12]), 'U9–U12');
  assert.equal(agesLabel([7, 7]), 'U7');
  assert.notEqual(tipsFor(7), tipsFor(11));
});
