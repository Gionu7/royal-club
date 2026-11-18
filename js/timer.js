// Timer maths (pure, testable) plus beeps and vibration.
// A timer is {mode, acc, since, target, rounds}. Time is computed from timestamps,
// so it stays correct when the phone sleeps or the tab is in the background.

export function newTimer({ minutes = 5, rounds = null } = {}) {
  return {
    mode: rounds ? 'rounds' : 'down',
    acc: 0,
    since: null,
    target: Math.max(1, Math.round(minutes * 60)) * 1000,
    rounds: rounds ? { ...rounds } : null,
  };
}

export function elapsed(tm, now = Date.now()) {
  return tm.acc + (tm.since != null ? now - tm.since : 0);
}

export function isRunning(tm) {
  return tm.since != null;
}

export function start(tm, now = Date.now()) {
  if (tm.since == null) tm.since = now;
  return tm;
}

export function pause(tm, now = Date.now()) {
  if (tm.since != null) {
    tm.acc += now - tm.since;
    tm.since = null;
  }
  return tm;
}

export function reset(tm) {
  tm.acc = 0;
  tm.since = null;
  return tm;
}

export function addMinute(tm) {
  tm.target += 60000;
  return tm;
}

/** Length of a full rounds cycle in ms (no rest after the last round). */
export function roundsTotal(r) {
  return (r.count * r.work + Math.max(0, r.count - 1) * r.rest) * 1000;
}

/**
 * Where we are in a rounds timer.
 * Returns {round, total, phase: 'play'|'rest'|'done', left (ms), phaseLen (ms)}.
 */
export function roundsState(r, ms) {
  const work = r.work * 1000;
  const rest = r.rest * 1000;
  const cycle = work + rest;
  if (ms >= roundsTotal(r)) return { round: r.count, total: r.count, phase: 'done', left: 0, phaseLen: work };
  const idx = Math.floor(ms / cycle);
  const into = ms - idx * cycle;
  if (into < work) return { round: idx + 1, total: r.count, phase: 'play', left: work - into, phaseLen: work };
  return { round: idx + 1, total: r.count, phase: 'rest', left: cycle - into, phaseLen: rest };
}

/**
 * Everything the screen needs for one timer at one moment.
 * `marker` changes exactly when a beep is due (phase change or time up).
 */
export function view(tm, now = Date.now()) {
  const ms = elapsed(tm, now);
  if (tm.mode === 'up') {
    return { main: ms, sign: '', progress: null, over: false, marker: 'up' };
  }
  if (tm.mode === 'rounds' && tm.rounds) {
    const st = roundsState(tm.rounds, ms);
    const doneRound = st.phase === 'done';
    return {
      main: st.left,
      sign: '',
      progress: doneRound ? 1 : 1 - st.left / st.phaseLen,
      over: false,
      round: st,
      marker: doneRound ? 'done' : `${st.round}-${st.phase}`,
    };
  }
  const left = tm.target - ms;
  return {
    main: Math.abs(left),
    sign: left < 0 ? '+' : '',
    progress: Math.min(1, ms / tm.target),
    over: left < 0,
    marker: left <= 0 ? 'done' : 'run',
  };
}

/** 83_000 → "1:23"; one hour and more → "1:02:03". Counts down in whole seconds. */
export function fmt(ms, { ceil = false } = {}) {
  const total = ceil ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// ---------- sound and vibration ----------

let ctx = null;

/** Call from a click so browsers allow sound later. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, start, len) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + len);
  o.connect(g).connect(ctx.destination);
  o.start(start);
  o.stop(start + len + 0.05);
}

/** kind: 'phase' (two short beeps) or 'end' (three beeps, the last one long). */
export function signal(kind, { sound = true, vibrate = true } = {}) {
  if (sound && ctx) {
    try {
      const t0 = ctx.currentTime + 0.02;
      if (kind === 'end') {
        tone(880, t0, 0.15);
        tone(880, t0 + 0.25, 0.15);
        tone(1175, t0 + 0.5, 0.7);
      } else {
        tone(988, t0, 0.12);
        tone(988, t0 + 0.2, 0.12);
      }
    } catch {
      /* sound is optional */
    }
  }
  if (vibrate && navigator.vibrate) {
    try {
      navigator.vibrate(kind === 'end' ? [300, 120, 300, 120, 600] : [180, 100, 180]);
    } catch {
      /* vibration is optional */
    }
  }
}
