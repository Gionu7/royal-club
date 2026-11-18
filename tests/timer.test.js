import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../js/timer.js';

test('countdown runs, pauses and goes into overtime', () => {
  const tm = T.newTimer({ minutes: 1 });
  assert.equal(tm.mode, 'down');
  T.start(tm, 0);
  let v = T.view(tm, 30_000);
  assert.equal(v.main, 30_000);
  assert.equal(v.over, false);
  T.pause(tm, 30_000);
  v = T.view(tm, 999_999);
  assert.equal(v.main, 30_000, 'paused timers do not move');
  T.start(tm, 100_000);
  v = T.view(tm, 175_000);
  assert.equal(v.over, true);
  assert.equal(v.sign, '+');
  assert.equal(v.main, 45_000);
  assert.equal(v.marker, 'done');
});

test('+1 min extends a countdown', () => {
  const tm = T.newTimer({ minutes: 2 });
  T.addMinute(tm);
  assert.equal(tm.target, 180_000);
});

test('rounds timer walks through play and rest phases', () => {
  const r = { count: 3, work: 60, rest: 30 };
  assert.equal(T.roundsTotal(r), (3 * 60 + 2 * 30) * 1000);
  assert.deepEqual(
    [0, 59_000, 60_000, 89_999, 90_000, 240_000].map((ms) => {
      const s = T.roundsState(r, ms);
      return `${s.round}-${s.phase}`;
    }),
    ['1-play', '1-play', '1-rest', '1-rest', '2-play', '3-done'],
  );
  const tm = T.newTimer({ minutes: 4, rounds: r });
  assert.equal(tm.mode, 'rounds');
  T.start(tm, 0);
  assert.equal(T.view(tm, 70_000).marker, '1-rest');
  assert.equal(T.view(tm, 70_000).main, 20_000);
});

test('rounds with no rest skip straight to the next round', () => {
  const r = { count: 6, work: 30, rest: 0 };
  assert.equal(T.roundsState(r, 30_000).round, 2);
  assert.equal(T.roundsState(r, 30_000).phase, 'play');
  assert.equal(T.roundsState(r, 180_000).phase, 'done');
});

test('stopwatch counts up', () => {
  const tm = T.newTimer({ minutes: 5 });
  tm.mode = 'up';
  T.start(tm, 1000);
  assert.equal(T.view(tm, 66_000).main, 65_000);
});

test('fmt formats clock times', () => {
  assert.equal(T.fmt(0), '0:00');
  assert.equal(T.fmt(83_000), '1:23');
  assert.equal(T.fmt(82_100, { ceil: true }), '1:23');
  assert.equal(T.fmt(3_723_000), '1:02:03');
});
