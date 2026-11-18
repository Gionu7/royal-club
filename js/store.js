// App data: plans, custom activities, players, notes and session runs.
// Saved to localStorage on this device. Pure helpers are exported for tests.
import { LIBRARY, SAMPLE_PLAN } from './library.js';
import { newTimer } from './timer.js';

const KEY = 'royalclub.v1';
export const SCHEMA = 1;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function emptyState(lang = 'en') {
  return {
    v: SCHEMA,
    settings: { lang, sound: true, vibrate: true, autoStart: false },
    activities: [],
    plans: [],
    players: [],
    notes: [],
    runs: [],
    activeRunId: null,
    seeded: false,
  };
}

/** Adds the club's 60-minute U7 plan the first time the app opens. */
export function seed(state, lang = 'en') {
  if (state.seeded) return state;
  const now = Date.now();
  state.plans.push({
    id: uid(),
    name: SAMPLE_PLAN.name[lang] || SAMPLE_PLAN.name.en,
    team: SAMPLE_PLAN.team,
    date: today(),
    target: SAMPLE_PLAN.target,
    focus: SAMPLE_PLAN.focus[lang] || SAMPLE_PLAN.focus.en,
    notes: '',
    blocks: SAMPLE_PLAN.blocks.map(([activityId, duration]) => ({ id: uid(), activityId, duration, note: '' })),
    createdAt: now,
    updatedAt: now,
  });
  state.seeded = true;
  return state;
}

export function normalize(raw, lang) {
  const base = emptyState(lang);
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...raw, settings: { ...base.settings, ...(raw.settings || {}) } };
  for (const k of ['activities', 'plans', 'players', 'notes', 'runs']) if (!Array.isArray(s[k])) s[k] = [];
  return s;
}

export function load(lang) {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    raw = null;
  }
  const state = normalize(raw, lang);
  return seed(state, state.settings.lang || lang);
}

let saveTimer = null;
export function save(state, { now = false } = {}) {
  const write = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage may be full or blocked; the app keeps working in memory */
    }
  };
  clearTimeout(saveTimer);
  if (now) write();
  else saveTimer = setTimeout(write, 150);
}

// ---------- activities ----------

export function allActivities(state) {
  return [...state.activities, ...LIBRARY];
}

export function getActivity(state, id) {
  return state.activities.find((a) => a.id === id) || LIBRARY.find((a) => a.id === id) || null;
}

export function isBuiltIn(id) {
  return LIBRARY.some((a) => a.id === id);
}

export function saveActivity(state, act) {
  const i = state.activities.findIndex((a) => a.id === act.id);
  act.updatedAt = Date.now();
  if (i >= 0) state.activities[i] = act;
  else state.activities.unshift(act);
  return act;
}

export function deleteActivity(state, id) {
  state.activities = state.activities.filter((a) => a.id !== id);
}

/** Free-text search across title, summary, skills and how-to in both languages. */
export function searchActivities(list, { q = '', category = 'all' } = {}) {
  const needle = q.trim().toLowerCase();
  const flat = (v) => (v == null ? '' : typeof v === 'string' ? v : Object.values(v).join(' '));
  return list.filter((a) => {
    if (category !== 'all' && a.category !== category) return false;
    if (!needle) return true;
    const hay = [flat(a.title), flat(a.summary), (a.skills || []).join(' '), flat(a.howTo)].join(' ').toLowerCase();
    return hay.includes(needle);
  });
}

// ---------- plans ----------

export function newPlan(state, { name = '', lang = 'en' } = {}) {
  const now = Date.now();
  const plan = {
    id: uid(),
    name,
    team: state.plans[0]?.team || 'U7',
    date: today(),
    target: 60,
    focus: '',
    notes: '',
    blocks: [],
    createdAt: now,
    updatedAt: now,
  };
  state.plans.unshift(plan);
  return plan;
}

export function getPlan(state, id) {
  return state.plans.find((p) => p.id === id) || null;
}

export function touch(plan) {
  plan.updatedAt = Date.now();
}

export function addBlock(state, plan, activityId) {
  const act = getActivity(state, activityId);
  const block = { id: uid(), activityId, duration: act?.duration || 5, note: '' };
  plan.blocks.push(block);
  touch(plan);
  return block;
}

export function moveBlock(plan, blockId, delta) {
  const i = plan.blocks.findIndex((b) => b.id === blockId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= plan.blocks.length) return;
  const [b] = plan.blocks.splice(i, 1);
  plan.blocks.splice(j, 0, b);
  touch(plan);
}

export function removeBlock(plan, blockId) {
  plan.blocks = plan.blocks.filter((b) => b.id !== blockId);
  touch(plan);
}

export function planMinutes(plan) {
  return plan.blocks.reduce((s, b) => s + (Number(b.duration) || 0), 0);
}

/** Blocks with start/end minute offsets, like the 0:00–0:05 column in a paper plan. */
export function timeline(state, plan) {
  let t = 0;
  return plan.blocks.map((b) => {
    const start = t;
    t += Number(b.duration) || 0;
    return { block: b, activity: getActivity(state, b.activityId), start, end: t };
  });
}

/** 29 → "0:29", 75 → "1:15". */
export function clock(min) {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

export function duplicatePlan(state, plan, suffix = ' (2)') {
  const copy = structuredClone(plan);
  copy.id = uid();
  copy.name = (plan.name || '') + suffix;
  copy.blocks.forEach((b) => (b.id = uid()));
  copy.createdAt = copy.updatedAt = Date.now();
  state.plans.unshift(copy);
  return copy;
}

export function deletePlan(state, id) {
  state.plans = state.plans.filter((p) => p.id !== id);
}

/** Next plan to run: the nearest date from today on, otherwise the most recently edited. */
export function nextPlan(state) {
  const d = today();
  const upcoming = state.plans.filter((p) => p.blocks.length && (p.date || '') >= d).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (upcoming.length) return upcoming[0];
  return [...state.plans].filter((p) => p.blocks.length).sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
}

// ---------- players ----------

export function activePlayers(state) {
  return state.players.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name));
}

export function addPlayer(state, { name, number = '', group = '' }) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const p = { id: uid(), name: clean, number: String(number || '').trim(), group, about: '', archived: false, createdAt: Date.now() };
  state.players.push(p);
  return p;
}

/** "Andrei, 7\nMaria" → two players. Skips blank lines and names already on the roster. */
export function bulkAddPlayers(state, text) {
  const existing = new Set(activePlayers(state).map((p) => p.name.toLowerCase()));
  const added = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const [name, number] = line.split(',').map((s) => s.trim());
    if (!name || existing.has(name.toLowerCase())) continue;
    existing.add(name.toLowerCase());
    added.push(addPlayer(state, { name, number }));
  }
  return added;
}

export function getPlayer(state, id) {
  return state.players.find((p) => p.id === id) || null;
}

export function playerNotes(state, playerId) {
  return state.notes.filter((n) => n.playerId === playerId).sort((a, b) => b.createdAt - a.createdAt);
}

export function attendanceFor(state, playerId) {
  const finished = state.runs.filter((r) => r.endedAt && r.attendanceTaken);
  return { attended: finished.filter((r) => r.attendance.includes(playerId)).length, total: finished.length };
}

// ---------- notes ----------

export function addNote(state, { playerId = null, text, runId = null, context = '' }) {
  const clean = String(text || '').trim();
  if (!clean) return null;
  const note = { id: uid(), playerId, text: clean, runId, context, createdAt: Date.now() };
  state.notes.push(note);
  return note;
}

export function deleteNote(state, id) {
  state.notes = state.notes.filter((n) => n.id !== id);
}

// ---------- runs (a plan being coached live) ----------

export function startRun(state, plan) {
  const steps = plan.blocks.map((b) => {
    const act = getActivity(state, b.activityId);
    const rounds = act?.rounds ? { ...act.rounds } : null;
    return {
      blockId: b.id,
      activityId: b.activityId,
      title: act ? act.title : '?',
      duration: Number(b.duration) || 5,
      note: b.note || '',
      timer: newTimer({ minutes: Number(b.duration) || 5, rounds }),
    };
  });
  const run = {
    id: uid(),
    planId: plan.id,
    planName: plan.name,
    team: plan.team,
    startedAt: Date.now(),
    endedAt: null,
    step: -1, // -1 = attendance screen
    attendance: [],
    attendanceTaken: false,
    steps,
    reflection: '',
  };
  state.runs.unshift(run);
  state.activeRunId = run.id;
  return run;
}

export function getRun(state, id) {
  return state.runs.find((r) => r.id === id) || null;
}

export function activeRun(state) {
  const r = state.activeRunId && getRun(state, state.activeRunId);
  return r && !r.endedAt ? r : null;
}

export function finishRun(state, run) {
  for (const s of run.steps) {
    if (s.timer.since != null) {
      s.timer.acc += Date.now() - s.timer.since;
      s.timer.since = null;
    }
  }
  run.endedAt = Date.now();
  if (state.activeRunId === run.id) state.activeRunId = null;
}

export function discardRun(state, run) {
  state.notes = state.notes.filter((n) => n.runId !== run.id);
  state.runs = state.runs.filter((r) => r.id !== run.id);
  if (state.activeRunId === run.id) state.activeRunId = null;
}

export function runNotes(state, runId) {
  return state.notes.filter((n) => n.runId === runId).sort((a, b) => a.createdAt - b.createdAt);
}

// ---------- backup ----------

export function exportData(state) {
  return JSON.stringify({ app: 'royal-club', exportedAt: new Date().toISOString(), data: state }, null, 2);
}

/** Returns a normalized state or throws if the text is not a backup. */
export function parseBackup(text, lang) {
  const obj = JSON.parse(text);
  if (!obj || obj.app !== 'royal-club' || !obj.data) throw new Error('not a backup');
  const s = normalize(obj.data, lang);
  s.seeded = true;
  return s;
}
