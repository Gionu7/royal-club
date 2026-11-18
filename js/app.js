import { t, tx, txList, setLang, getLang, LANGS } from './i18n.js';
import { CATEGORIES, AGE_GROUPS, TEMPLATES, ageOf, agesLabel, tipsFor, skillText } from './library.js';
import { renderDiagram, legendSwatch } from './diagram.js';
import * as S from './store.js';
import * as T from './timer.js';

// ---------------------------------------------------------------- state

const state = S.load('ro');
setLang(state.settings.lang);

const ui = {
  category: 'all',
  q: '',
  age: null,
  pickAge: null,
  pickCat: 'all',
  pickQ: '',
  sheet: null, // {type: 'picker'|'addTo'|'notes', ...}
  confirm: null,
  draft: null,
  noteFor: null,
  noteText: '',
  playerNoteText: '',
  bulk: false,
  big: false,
  flash: null,
  toast: null,
  showTips: false,
  backupText: '',
};

const SECTIONS = { today: 'today', plans: 'sessions', plan: 'sessions', summary: 'sessions', print: 'sessions', library: 'library', activity: 'library', 'activity-edit': 'library', players: 'players', player: 'players', options: 'options', run: 'run' };
const HASH_TO_ROUTE = { today: 'today', sessions: 'plans', library: 'library', players: 'players', options: 'options' };

let route = initialRoute();

function initialRoute() {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem('royalclub.route') || 'null');
  } catch {
    saved = null;
  }
  const hash = (location.hash || '').replace('#', '');
  if (hash === 'run' && S.activeRun(state)) return { name: 'run', id: S.activeRun(state).id };
  if (saved && SECTIONS[saved.name] === hash) return saved;
  if (HASH_TO_ROUTE[hash]) return { name: HASH_TO_ROUTE[hash] };
  return { name: 'today' };
}

function persistRoute() {
  try {
    sessionStorage.setItem('royalclub.route', JSON.stringify(route));
  } catch {
    /* optional */
  }
}

function go(name, id = null, { replace = false } = {}) {
  route = { name, id };
  ui.sheet = null;
  ui.confirm = null;
  ui.big = false;
  persistRoute();
  const hash = '#' + SECTIONS[name];
  try {
    if (replace) history.replaceState({ route }, '', hash);
    else history.pushState({ route }, '', hash);
  } catch {
    /* some frames refuse history changes; routing still works in memory */
  }
  render();
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', (e) => {
  const r = e.state && e.state.route;
  const hash = (location.hash || '').replace('#', '');
  route = r || { name: HASH_TO_ROUTE[hash] || 'today' };
  ui.sheet = null;
  ui.big = false;
  persistRoute();
  render();
});

function commit() {
  S.save(state);
}

// ---------------------------------------------------------------- helpers

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function nl(s) {
  return esc(s).replace(/\n/g, '<br>');
}

function locale() {
  return getLang() === 'ro' ? 'ro-RO' : 'en-GB';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = typeof iso === 'number' ? new Date(iso) : new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
}

function planTitle(p) {
  return p.name?.trim() || t('untitled');
}

function toast(msg) {
  ui.toast = msg;
  const el = document.getElementById('toast');
  if (el) {
    el.textContent = msg;
    el.hidden = false;
  }
  clearTimeout(toast.t);
  toast.t = setTimeout(() => {
    ui.toast = null;
    const e2 = document.getElementById('toast');
    if (e2) e2.hidden = true;
  }, 2400);
}

const ICONS = {
  today: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  plans: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  library: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5zM14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14z"/>',
  players: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.8 14.6c2.3.1 4.1 1.6 4.7 4.4"/>',
  options: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.8h3.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  back: '<path d="m14.5 5-7 7 7 7"/>',
  next: '<path d="m9.5 5 7 7-7 7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  note: '<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8.5 13h7M8.5 16.5h5"/>',
  whistle: '<circle cx="9" cy="14" r="5"/><path d="M12.5 10.5 20 6v4l-5 2.5"/>',
  print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="6" rx="1"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
};

function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

const CREST = `<svg class="crest" viewBox="0 0 40 44" aria-hidden="true"><path d="M20 2 36 7v15c0 10-7 17-16 20C11 39 4 32 4 22V7z" class="crest-shield"/><path d="M11 17l3 4 3-6 3 6 3-6 3 6 3-4-1.5 8h-15z" class="crest-crown"/><circle cx="20" cy="32" r="3.2" class="crest-ball"/></svg>`;

function showAges(a) {
  return a.ages && a.category !== 'break' ? agesLabel(a.ages) : '';
}

function catChip(cat) {
  return `<span class="cat cat-${cat}">${esc(t('cat_' + cat))}</span>`;
}

function timelineBar(state, plan) {
  const tl = S.timeline(state, plan);
  const total = Math.max(S.planMinutes(plan), plan.target || 0, 1);
  return `<div class="tl" aria-hidden="true">${tl
    .map((x) => `<span class="tl-seg bg-${x.activity?.category || 'break'}" style="width:${((x.end - x.start) / total) * 100}%"></span>`)
    .join('')}</div>`;
}

function confirmButton(key, label, act, attrs = '') {
  if (ui.confirm === key) {
    return `<span class="confirm"><span class="confirm-q">${esc(t('confirmDelete'))}</span>
      <button class="btn danger sm" data-act="${act}" ${attrs}>${esc(t('yesDelete'))}</button>
      <button class="btn ghost sm" data-act="confirm-cancel">${esc(t('cancel'))}</button></span>`;
  }
  return `<button class="btn ghost sm danger-text" data-act="confirm-ask" data-key="${esc(key)}">${icon('trash')}${esc(label)}</button>`;
}

// ---------------------------------------------------------------- shell

function shell(content, { title = '', backTo = null } = {}) {
  const sec = SECTIONS[route.name];
  const tabs = [
    ['today', 'today', t('navToday')],
    ['plans', 'sessions', t('navPlans')],
    ['library', 'library', t('navLibrary')],
    ['players', 'players', t('navPlayers')],
  ];
  const live = S.activeRun(state);
  return `
  <header class="topbar">
    <div class="wrap topbar-in">
      <button class="brand" data-act="nav" data-to="today">${CREST}<span><b>${esc(t('appName'))}</b><small>${esc(t('tagline'))}</small></span></button>
      <div class="top-actions">
        ${live && route.name !== 'run' ? `<button class="live-pill" data-act="resume">${icon('whistle')}<span>${esc(t('resumeSession'))}</span></button>` : ''}
        <button class="icon-btn ${sec === 'options' ? 'on' : ''}" data-act="nav" data-to="options" aria-label="${esc(t('navOptions'))}">${icon('options')}</button>
      </div>
    </div>
  </header>
  <main class="wrap main">
    ${backTo ? `<button class="back-link" data-act="nav" data-to="${backTo[0]}" ${backTo[2] ? `data-id="${esc(backTo[2])}"` : ''}>${icon('back')}${esc(backTo[1])}</button>` : ''}
    ${title ? `<h1 class="page-title">${esc(title)}</h1>` : ''}
    ${content}
  </main>
  <nav class="tabbar" aria-label="${esc(t('navMain'))}">
    <div class="tabbar-in">
    ${tabs
      .map(([r, s, label]) => `<button class="tab ${sec === s ? 'on' : ''}" data-act="nav" data-to="${r}" ${sec === s ? 'aria-current="page"' : ''}>${icon(r)}<span>${esc(label)}</span></button>`)
      .join('')}
    </div>
  </nav>
  ${sheetHtml()}
  <div id="toast" class="toast" role="status" ${ui.toast ? '' : 'hidden'}>${esc(ui.toast || '')}</div>`;
}

// ---------------------------------------------------------------- Today

function viewToday() {
  const live = S.activeRun(state);
  const plan = S.nextPlan(state);
  const runs = state.runs.filter((r) => r.endedAt).slice(0, 5);
  const roster = S.activePlayers(state).length;

  let liveCard = '';
  if (live) {
    const n = Math.max(0, live.step) + 1;
    liveCard = `<section class="card live-card">
      <div class="eyebrow">${icon('whistle')} ${esc(t('inProgress'))}</div>
      <h2>${esc(live.planName || t('untitled'))}</h2>
      <p class="muted">${live.step < 0 ? esc(t('attendance')) : esc(t('stepOf', { n, total: live.steps.length }))} · ${esc(fmtTime(live.startedAt))}</p>
      <button class="btn primary lg" data-act="resume">${icon('play')}${esc(t('resumeSession'))}</button>
    </section>`;
  }

  let next = '';
  if (plan) {
    const tl = S.timeline(state, plan);
    next = `<section class="card next-card">
      <div class="eyebrow">${esc(t('nextUp'))}</div>
      <div class="next-head">
        <div>
          <h2>${esc(planTitle(plan))}</h2>
          <p class="muted">${esc(fmtDate(plan.date))} · ${esc(plan.team || '')} · ${S.planMinutes(plan)} ${esc(t('min'))} · ${plan.blocks.length} ${esc(t('activities'))}</p>
        </div>
      </div>
      ${timelineBar(state, plan)}
      <ol class="run-order">
        ${tl
          .map(
            (x) => `<li><span class="ro-time">${S.clock(x.start)}</span><span class="dot bg-${x.activity?.category || 'break'}"></span><span class="ro-title">${esc(tx(x.activity?.title) || '?')}</span><span class="ro-min">${x.block.duration}′</span></li>`,
          )
          .join('')}
      </ol>
      <div class="row gap wrap-row">
        ${live ? '' : `<button class="btn primary lg" data-act="start-run" data-id="${plan.id}">${icon('play')}${esc(t('startSession'))}</button>`}
        <button class="btn" data-act="nav" data-to="plan" data-id="${plan.id}">${icon('edit')}${esc(t('edit'))}</button>
      </div>
    </section>`;
  } else {
    next = `<section class="card empty"><p>${esc(t('noPlans'))}</p><button class="btn primary" data-act="new-plan">${icon('plus')}${esc(t('newPlan'))}</button></section>`;
  }

  return shell(`
    <p class="hello">${esc(t('todayHello'))}</p>
    ${liveCard}
    ${next}
    <section class="quick">
      <h2 class="section-title">${esc(t('quickLinks'))}</h2>
      <div class="quick-grid">
        <button class="quick-btn" data-act="new-plan">${icon('plus')}<span>${esc(t('newPlan'))}</span></button>
        <button class="quick-btn" data-act="nav" data-to="library">${icon('library')}<span>${esc(t('browseLibrary'))}</span></button>
        <button class="quick-btn" data-act="nav" data-to="players">${icon('players')}<span>${roster ? esc(t('rosterCount', { n: roster })) : esc(t('addPlayers'))}</span></button>
      </div>
    </section>
    <section>
      <h2 class="section-title">${esc(t('recent'))}</h2>
      ${runs.length ? runList(runs) : `<p class="muted">${esc(t('noRuns'))}</p>`}
    </section>
  `);
}

function runList(runs) {
  return `<ul class="list">${runs
    .map((r) => {
      const notes = S.runNotes(state, r.id).length;
      const mins = Math.round((r.endedAt - r.startedAt) / 60000);
      return `<li><button class="list-row" data-act="nav" data-to="summary" data-id="${r.id}">
        <span class="lr-main"><b>${esc(r.planName || t('untitled'))}</b><small>${esc(fmtDate(r.startedAt))} · ${mins} ${esc(t('min'))}${r.attendanceTaken ? ` · ${r.attendance.length} ${esc(t('players').toLowerCase())}` : ''}${notes ? ` · ${esc(t('notesCount', { n: notes }))}` : ''}</small></span>
        ${icon('next', 'chev')}</button></li>`;
    })
    .join('')}</ul>`;
}

// ---------------------------------------------------------------- Plans

function viewPlans() {
  const runs = state.runs.filter((r) => r.endedAt);
  const plans = [...state.plans].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.updatedAt - a.updatedAt);
  return shell(
    `
    <div class="row between">
      <p class="muted">${plans.length} · ${esc(t('plans'))}</p>
      <button class="btn primary" data-act="new-plan">${icon('plus')}${esc(t('newPlan'))}</button>
    </div>
    <div class="plan-grid">
      ${
        plans.length
          ? plans
              .map((p) => {
                const m = S.planMinutes(p);
                return `<button class="card plan-card" data-act="nav" data-to="plan" data-id="${p.id}">
          <span class="pc-top"><span class="pc-date">${esc(fmtDate(p.date))}</span><span class="pc-team">${esc(p.team || '')}</span></span>
          <b class="pc-name">${esc(planTitle(p))}</b>
          ${timelineBar(state, p)}
          <span class="muted sm">${m}/${p.target || m} ${esc(t('min'))} · ${p.blocks.length} ${esc(t('activities'))}</span>
        </button>`;
              })
              .join('')
          : `<div class="card empty"><p>${esc(t('noPlans'))}</p></div>`
      }
    </div>
    <section>
      <h2 class="section-title">${esc(t('templates'))}</h2>
      <p class="muted sm">${esc(t('templatesHint'))}</p>
      <div class="tpl-grid">${TEMPLATES.map((tp) => `<button class="tpl" data-act="from-template" data-id="${tp.id}"><span class="pc-team">${esc(tx(tp.name).split(' · ')[0])} · ${tp.target} ${esc(t('min'))}</span><b>${esc(tx(tp.name).split(' · ').slice(2).join(' · ') || tx(tp.name))}</b><small>${esc(tx(tp.focus))}</small></button>`).join('')}</div>
    </section>
    <h2 class="section-title">${esc(t('pastSessions'))}</h2>
    ${runs.length ? runList(runs) : `<p class="muted">${esc(t('noRuns'))}</p>`}
  `,
    { title: t('plans') },
  );
}

function viewPlan() {
  const plan = S.getPlan(state, route.id);
  if (!plan) return viewPlans();
  const tl = S.timeline(state, plan);
  const total = S.planMinutes(plan);
  const diff = total - (plan.target || 0);
  const status = !plan.target ? '' : diff > 0 ? `<span class="status warn">${esc(t('overBy', { n: diff }))}</span>` : diff < 0 ? `<span class="status">${esc(t('underBy', { n: -diff }))}</span>` : `<span class="status ok">${icon('check')}${esc(t('onTarget'))}</span>`;
  const live = S.activeRun(state);

  const blocks = tl.length
    ? `<ol class="blocks">${tl
        .map((x, i) => {
          const a = x.activity;
          const b = x.block;
          return `<li class="block">
          <div class="bl-time"><b>${S.clock(x.start)}</b><small>${S.clock(x.end)}</small></div>
          <div class="bl-body">
            <div class="bl-head">
              ${catChip(a?.category || 'break')}
              <button class="bl-title" data-act="nav" data-to="activity" data-id="${esc(b.activityId)}">${esc(tx(a?.title) || '?')}</button>
            </div>
            <div class="bl-controls">
              <div class="stepper" role="group" aria-label="${esc(t('minutes'))}">
                <button class="icon-btn sm" data-act="dur" data-id="${b.id}" data-d="-1" aria-label="-1">${icon('minus')}</button>
                <span class="num">${b.duration}<small>${esc(t('min'))}</small></span>
                <button class="icon-btn sm" data-act="dur" data-id="${b.id}" data-d="1" aria-label="+1">${icon('plus')}</button>
              </div>
              <span class="spacer"></span>
              <button class="icon-btn sm" data-act="move" data-id="${b.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('moveUp'))}">${icon('up')}</button>
              <button class="icon-btn sm" data-act="move" data-id="${b.id}" data-d="1" ${i === tl.length - 1 ? 'disabled' : ''} aria-label="${esc(t('moveDown'))}">${icon('down')}</button>
              <button class="icon-btn sm" data-act="remove-block" data-id="${b.id}" aria-label="${esc(t('remove'))}">${icon('x')}</button>
            </div>
            <input class="bl-note" id="note-${b.id}" data-bind="block-note" data-id="${b.id}" value="${esc(b.note)}" placeholder="${esc(t('blockNote'))}">
          </div>
        </li>`;
        })
        .join('')}</ol>`
    : `<div class="card empty"><p>${esc(t('emptyPlan'))}</p></div>`;

  return shell(
    `
    <section class="card form-card">
      <label class="field wide"><span>${esc(t('planName'))}</span><input id="plan-name" data-bind="plan" data-f="name" value="${esc(plan.name)}" placeholder="${esc(t('untitled'))}"></label>
      <div class="field-row">
        <label class="field"><span>${esc(t('planDate'))}</span><input id="plan-date" type="date" data-bind="plan" data-f="date" value="${esc(plan.date)}"></label>
        <label class="field"><span>${esc(t('planTeam'))}</span><input id="plan-team" data-bind="plan" data-f="team" value="${esc(plan.team)}"></label>
        <label class="field"><span>${esc(t('planTarget'))} (${esc(t('min'))})</span><input id="plan-target" type="number" min="0" max="240" inputmode="numeric" data-bind="plan" data-f="target" value="${esc(plan.target)}"></label>
      </div>
      <label class="field wide"><span>${esc(t('planFocus'))}</span><input id="plan-focus" data-bind="plan" data-f="focus" value="${esc(plan.focus)}"></label>
    </section>

    <section class="plan-summary">
      <div class="row between">
        <div class="total"><span class="big-num">${total}</span><span>/ ${plan.target || '–'} ${esc(t('min'))}</span></div>
        ${status}
      </div>
      ${timelineBar(state, plan)}
    </section>

    ${blocks}

    <div class="row gap wrap-row">
      <button class="btn primary" data-act="open-picker" data-id="${plan.id}">${icon('plus')}${esc(t('addActivity'))}</button>
      <button class="btn" data-act="add-break" data-id="${plan.id}">${icon('plus')}${esc(t('addBreak'))}</button>
    </div>

    <label class="field wide"><span>${esc(t('planNotes'))}</span><textarea id="plan-notes" rows="3" data-bind="plan" data-f="notes">${esc(plan.notes)}</textarea></label>

    <div class="action-bar">
      ${live ? `<button class="btn primary lg" data-act="resume">${icon('play')}${esc(t('resumeSession'))}</button>` : `<button class="btn primary lg" data-act="start-run" data-id="${plan.id}" ${plan.blocks.length ? '' : 'disabled'}>${icon('play')}${esc(t('startSession'))}</button>`}
      <button class="btn" data-act="nav" data-to="print" data-id="${plan.id}" ${plan.blocks.length ? '' : 'disabled'}>${icon('print')}${esc(t('printPlan'))}</button>
      <button class="btn" data-act="dup-plan" data-id="${plan.id}">${icon('copy')}${esc(t('duplicate'))}</button>
      ${confirmButton('plan-' + plan.id, t('delete'), 'delete-plan', `data-id="${plan.id}"`)}
    </div>
  `,
    { backTo: ['plans', t('navPlans')] },
  );
}

// ---------------------------------------------------------------- Library

function libraryCards(list) {
  if (!list.length) return `<p class="muted">${esc(t('noResults'))}</p>`;
  return list
    .map((a) => {
      const d = renderDiagram(a.diagram, { title: tx(a.title) });
      return `<button class="card act-card" data-act="nav" data-to="activity" data-id="${esc(a.id)}">
        <span class="ac-thumb ${d ? '' : 'none'}">${d ? d.svg : icon(a.category === 'break' ? 'whistle' : 'note')}</span>
        <span class="ac-body">
          <span class="ac-meta">${catChip(a.category)}<span class="ac-min">${a.duration} ${esc(t('min'))}</span>${showAges(a) ? `<span class="ac-age">${showAges(a)}</span>` : ''}${S.isBuiltIn(a.id) ? '' : `<span class="badge">${esc(t('custom'))}</span>`}</span>
          <b class="ac-title">${esc(tx(a.title))}</b>
          <span class="ac-sum">${esc(tx(a.summary))}</span>
        </span>
      </button>`;
    })
    .join('');
}

function ageSelect(id, bind, current) {
  return `<select class="age-select" id="${id}" data-bind="${bind}" aria-label="${esc(t('ageLabel'))}">
    <option value="">${esc(t('ageAll'))}</option>
    ${AGE_GROUPS.map((a) => `<option value="${a}" ${current === a ? 'selected' : ''}>U${a}</option>`).join('')}
  </select>`;
}

function catFilter(current, act) {
  return `<div class="chips" role="group">${['all', ...CATEGORIES]
    .map((c) => `<button class="chip ${current === c ? 'on' : ''} ${c !== 'all' ? 'chip-' + c : ''}" data-act="${act}" data-c="${c}" aria-pressed="${current === c}">${esc(t('cat_' + c))}</button>`)
    .join('')}</div>`;
}

function viewLibrary() {
  const list = S.searchActivities(S.allActivities(state), { q: ui.q, category: ui.category, age: ui.age });
  return shell(
    `
    <div class="lib-tools">
      <input class="search" id="lib-search" type="search" data-bind="lib-q" value="${esc(ui.q)}" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}">
      ${ageSelect('lib-age', 'lib-age', ui.age)}
      <button class="btn" data-act="new-activity">${icon('plus')}${esc(t('newActivity'))}</button>
    </div>
    ${catFilter(ui.category, 'lib-cat')}
    <div class="act-grid" id="lib-grid">${libraryCards(list)}</div>
  `,
    { title: t('navLibrary') },
  );
}

function section(title, body, cls = '') {
  if (!body) return '';
  return `<section class="sect ${cls}"><h3>${esc(title)}</h3>${body}</section>`;
}

function diagramBlock(a) {
  const d = renderDiagram(a.diagram, { title: tx(a.title) });
  if (!d) return '';
  return `<figure class="dg-fig">${d.svg}<figcaption class="legend">${d.legend.map((l) => `<span>${legendSwatch(l.key)}${esc(l.label)}</span>`).join('')}</figcaption></figure>`;
}

function roundsText(r) {
  const f = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60} ${t('min')}` : `${s} ${t('sec')}`);
  return t('roundsLine', { count: r.count, work: f(r.work), rest: f(r.rest) });
}

/** The shared description of an activity: used in the library and on the pitch. */
function activityBody(a, { onPitch = false } = {}) {
  const coaching = txList(a.coaching);
  const facts = [
    [t('ages'), showAges(a)],
    [t('players'), tx(a.players)],
    [t('space'), tx(a.space)],
    [t('equipment'), tx(a.equipment)],
    a.rounds ? [t('rounds'), roundsText(a.rounds)] : null,
  ].filter((x) => x && x[1]);
  const hints = coaching.length ? `<ul class="hints">${coaching.map((c) => `<li>${icon('check')}<span>${esc(c)}</span></li>`).join('')}</ul>` : '';
  const variations =
    tx(a.easier) || tx(a.harder)
      ? `<div class="variations">${tx(a.easier) ? `<div class="var easier"><b>${esc(t('easier'))}</b><p>${nl(tx(a.easier))}</p></div>` : ''}${tx(a.harder) ? `<div class="var harder"><b>${esc(t('harder'))}</b><p>${nl(tx(a.harder))}</p></div>` : ''}</div>`
      : '';
  const factList = facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
  const how = tx(a.howTo) ? `<p>${nl(tx(a.howTo))}</p>` : '';
  const setup = tx(a.setup) ? `<p>${nl(tx(a.setup))}</p>` : '';

  if (onPitch) {
    return `
      ${section(t('coaching'), hints, 'hint-card')}
      ${section(t('howTo'), how)}
      ${diagramBlock(a)}
      ${section(t('setup'), setup + factList)}
      ${variations ? section(`${t('easier')} / ${t('harder')}`, variations) : ''}`;
  }
  return `
    ${factList}
    ${diagramBlock(a)}
    ${section(t('setup'), setup)}
    ${section(t('howTo'), how)}
    ${section(t('coaching'), hints, 'hint-card')}
    ${variations ? section(`${t('easier')} / ${t('harder')}`, variations) : ''}
    ${a.calls?.length ? section(t('calls'), `<div class="calls static">${a.calls.map((c) => `<span class="call" ${c.color ? `style="--call:${c.color}"` : ''}>${esc(tx(c))}</span>`).join('')}</div>`) : ''}
    ${a.skills?.length ? section(t('skills'), `<p class="muted">${esc(a.skills.map((k) => tx(skillText(k))).join(' · '))}</p>`) : ''}
`;
}

function viewActivity() {
  const a = S.getActivity(state, route.id);
  if (!a) return viewLibrary();
  const builtIn = S.isBuiltIn(a.id);
  return shell(
    `
    <article class="activity">
      <div class="act-head">
        <div class="ac-meta">${catChip(a.category)}<span class="ac-min">${a.duration} ${esc(t('min'))}</span>${showAges(a) ? `<span class="ac-age">${showAges(a)}</span>` : ''}${builtIn ? '' : `<span class="badge">${esc(t('custom'))}</span>`}</div>
        <h1 class="page-title">${esc(tx(a.title))}</h1>
        ${tx(a.summary) ? `<p class="lead">${esc(tx(a.summary))}</p>` : ''}
        <div class="row gap wrap-row">
          <button class="btn primary" data-act="open-addto" data-id="${esc(a.id)}">${icon('plus')}${esc(t('addToPlan'))}</button>
          <button class="btn" data-act="edit-activity" data-id="${esc(a.id)}">${icon(builtIn ? 'copy' : 'edit')}${esc(builtIn ? t('duplicateEdit') : t('edit'))}</button>
          ${builtIn ? '' : confirmButton('act-' + a.id, t('delete'), 'delete-activity', `data-id="${esc(a.id)}"`)}
        </div>
      </div>
      ${activityBody(a)}
    </article>
  `,
    { backTo: ['library', t('navLibrary')] },
  );
}

function linesOf(list) {
  return (list || []).map(tx).join('\n');
}

function startDraft(id) {
  const a = id ? S.getActivity(state, id) : null;
  const builtIn = a && S.isBuiltIn(a.id);
  ui.draft = {
    id: a && !builtIn ? a.id : S.uid(),
    category: a?.category || 'technical',
    duration: a?.duration || 5,
    title: tx(a?.title),
    summary: tx(a?.summary),
    players: tx(a?.players),
    space: tx(a?.space),
    equipment: tx(a?.equipment),
    setup: tx(a?.setup),
    howTo: tx(a?.howTo),
    coaching: linesOf(a?.coaching),
    easier: tx(a?.easier),
    harder: tx(a?.harder),
    calls: linesOf(a?.calls),
    skills: (a?.skills || []).join(', '),
    rCount: a?.rounds?.count || '',
    rWork: a?.rounds?.work || '',
    rRest: a?.rounds?.rest ?? '',
    diagram: a?.diagram || null,
    aMin: a?.ages?.[0] ?? '',
    aMax: a?.ages?.[1] ?? '',
    callColors: a?.calls ? Object.fromEntries(a.calls.filter((c) => c.color).map((c) => [tx(c), c.color])) : {},
    error: '',
  };
}

function viewActivityEdit() {
  if (!ui.draft) startDraft(route.id === 'new' ? null : route.id);
  const d = ui.draft;
  const inp = (f, label, type = 'text') => `<label class="field"><span>${esc(label)}</span><input id="d-${f}" type="${type}" data-bind="draft" data-f="${f}" value="${esc(d[f])}" ${type === 'number' ? 'inputmode="numeric" min="0"' : ''}></label>`;
  const area = (f, label, rows = 3) => `<label class="field wide"><span>${esc(label)}</span><textarea id="d-${f}" rows="${rows}" data-bind="draft" data-f="${f}">${esc(d[f])}</textarea></label>`;
  return shell(
    `
    <form class="card form-card" data-form="activity" novalidate>
      <label class="field wide"><span>${esc(t('fTitle'))}</span><input id="d-title" data-bind="draft" data-f="title" value="${esc(d.title)}" required></label>
      ${d.error ? `<p class="error" role="alert">${esc(d.error)}</p>` : ''}
      <div class="field-row">
        <label class="field"><span>${esc(t('fCategory'))}</span>
          <select id="d-category" data-bind="draft" data-f="category">${CATEGORIES.map((c) => `<option value="${c}" ${d.category === c ? 'selected' : ''}>${esc(t('cat_' + c))}</option>`).join('')}</select>
        </label>
        ${inp('duration', t('fDuration'), 'number')}
      </div>
      ${area('summary', t('fSummary'), 2)}
      <div class="field-row">${inp('players', t('fPlayers'))}${inp('space', t('fSpace'))}</div>
      ${area('equipment', t('fEquipment'), 2)}
      ${area('setup', t('fSetup'))}
      ${area('howTo', t('fHowTo'), 5)}
      ${area('coaching', t('fCoaching'), 4)}
      <div class="field-row">${area('easier', t('fEasier'), 2)}${area('harder', t('fHarder'), 2)}</div>
      ${area('calls', t('fCalls'), 3)}
      <fieldset class="field wide"><legend>${esc(t('fRounds'))}</legend>
        <div class="field-row">${inp('rCount', t('fRoundCount'), 'number')}${inp('rWork', t('fRoundWork'), 'number')}${inp('rRest', t('fRoundRest'), 'number')}</div>
      </fieldset>
      <div class="field-row">
        ${['aMin', 'aMax'].map((f) => `<label class="field"><span>${esc(t(f === 'aMin' ? 'fAgeFrom' : 'fAgeTo'))}</span><select id="d-${f}" data-bind="draft" data-f="${f}"><option value="">–</option>${AGE_GROUPS.map((g) => `<option value="${g}" ${Number(d[f]) === g ? 'selected' : ''}>U${g}</option>`).join('')}</select></label>`).join('')}
      </div>
      ${inp('skills', t('fSkills'))}
      <div class="row gap">
        <button class="btn primary" type="submit">${icon('check')}${esc(t('save'))}</button>
        <button class="btn ghost" type="button" data-act="cancel-edit">${esc(t('cancel'))}</button>
      </div>
    </form>
  `,
    { title: route.id === 'new' ? t('newActivity') : d.title || t('newActivity'), backTo: ['library', t('navLibrary')] },
  );
}

function saveDraft() {
  const d = ui.draft;
  if (!d.title.trim()) {
    d.error = t('nameRequired');
    render();
    document.getElementById('d-title')?.focus();
    return;
  }
  const lines = (s) => String(s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const count = Number(d.rCount) || 0;
  const work = Number(d.rWork) || 0;
  const act = {
    id: d.id,
    category: d.category,
    duration: Math.max(1, Number(d.duration) || 5),
    title: d.title.trim(),
    summary: d.summary.trim(),
    players: d.players.trim(),
    space: d.space.trim(),
    equipment: d.equipment.trim(),
    setup: d.setup.trim(),
    howTo: d.howTo.trim(),
    coaching: lines(d.coaching),
    easier: d.easier.trim(),
    harder: d.harder.trim(),
    calls: lines(d.calls).map((c) => (d.callColors[c] ? { en: c, ro: c, color: d.callColors[c] } : c)),
    skills: String(d.skills || '').split(',').map((x) => x.trim()).filter(Boolean),
    rounds: count > 0 && work > 0 ? { count, work, rest: Number(d.rRest) || 0 } : null,
    ages: d.aMin || d.aMax ? [Number(d.aMin || d.aMax), Number(d.aMax || d.aMin)].sort((x, y) => x - y) : null,
    diagram: d.diagram,
    custom: true,
  };
  S.saveActivity(state, act);
  commit();
  ui.draft = null;
  go('activity', act.id, { replace: true });
}

// ---------------------------------------------------------------- Players

function viewPlayers() {
  const players = S.activePlayers(state);
  const list = players.length
    ? `<ul class="list players">${players
        .map((p) => {
          const n = S.playerNotes(state, p.id).length;
          const at = S.attendanceFor(state, p.id);
          return `<li><button class="list-row" data-act="nav" data-to="player" data-id="${p.id}">
            <span class="avatar">${esc(p.number || initials(p.name))}</span>
            <span class="lr-main"><b>${esc(p.name)}</b><small>${at.total ? esc(t('attended', { n: at.attended, total: at.total })) : ''}${at.total && n ? ' · ' : ''}${n ? esc(t('notesCount', { n })) : ''}</small></span>
            ${icon('next', 'chev')}</button></li>`;
        })
        .join('')}</ul>`
    : `<div class="card empty"><p>${esc(t('noPlayers'))}</p></div>`;
  return shell(
    `
    <form class="card add-player" data-form="add-player">
      <div class="field-row">
        <label class="field grow"><span>${esc(t('playerName'))}</span><input id="np-name" name="name" autocomplete="off"></label>
        <label class="field num-field"><span>${esc(t('shirt'))}</span><input id="np-num" name="number" inputmode="numeric" autocomplete="off"></label>
        <button class="btn primary self-end" type="submit">${icon('plus')}${esc(t('addPlayer'))}</button>
      </div>
      <button type="button" class="link-btn" data-act="toggle-bulk">${esc(t('bulkAdd'))}</button>
      ${
        ui.bulk
          ? `<label class="field wide"><span>${esc(t('bulkHint'))}</span><textarea id="bulk-names" rows="6" placeholder="Andrei, 7&#10;Maria&#10;Luca, 10"></textarea></label>
             <button type="button" class="btn" data-act="bulk-add">${icon('plus')}${esc(t('add'))}</button>`
          : ''
      }
    </form>
    ${list}
  `,
    { title: `${t('roster')}${players.length ? ` · ${players.length}` : ''}` },
  );
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
}

const QUICK_TAGS = ['tag_effort', 'tag_brave', 'tag_pass', 'tag_weak', 'tag_listen', 'tag_kind', 'tag_help', 'tag_shy'];

function tagChips(target) {
  return `<div class="chips tags">${QUICK_TAGS.map((k) => `<button type="button" class="chip" data-act="tag" data-target="${target}" data-k="${k}">${esc(t(k))}</button>`).join('')}</div>`;
}

function noteItem(n, { withPlayer = false } = {}) {
  const p = withPlayer && n.playerId ? S.getPlayer(state, n.playerId) : null;
  return `<li class="note">
    <div class="note-meta">${p ? `<b>${esc(p.name)}</b> · ` : ''}${esc(fmtDate(n.createdAt))} ${esc(fmtTime(n.createdAt))}${n.context ? ` · ${esc(n.context)}` : ''}</div>
    <p>${nl(n.text)}</p>
    <button class="icon-btn sm note-del" data-act="delete-note" data-id="${n.id}" aria-label="${esc(t('delete'))}">${icon('trash')}</button>
  </li>`;
}

function viewPlayer() {
  const p = S.getPlayer(state, route.id);
  if (!p) return viewPlayers();
  const notes = S.playerNotes(state, p.id);
  const at = S.attendanceFor(state, p.id);
  return shell(
    `
    <div class="player-head">
      <span class="avatar xl">${esc(p.number || initials(p.name))}</span>
      <div><h1 class="page-title">${esc(p.name)}</h1>${at.total ? `<p class="muted">${esc(t('attended', { n: at.attended, total: at.total }))}</p>` : ''}</div>
    </div>
    <section class="card form-card">
      <div class="field-row">
        <label class="field grow"><span>${esc(t('playerName'))}</span><input id="pl-name" data-bind="player" data-f="name" value="${esc(p.name)}"></label>
        <label class="field num-field"><span>${esc(t('shirt'))}</span><input id="pl-number" data-bind="player" data-f="number" value="${esc(p.number)}" inputmode="numeric"></label>
      </div>
      <label class="field wide"><span>${esc(t('about'))}</span><textarea id="pl-about" rows="2" data-bind="player" data-f="about">${esc(p.about)}</textarea></label>
    </section>
    <section class="card">
      <h2 class="section-title">${esc(t('addNote'))}</h2>
      ${tagChips('player-note')}
      <textarea id="player-note" rows="3" data-bind="player-note" placeholder="${esc(t('writeNote'))}">${esc(ui.playerNoteText)}</textarea>
      <button class="btn primary" data-act="save-player-note" data-id="${p.id}">${icon('check')}${esc(t('saveNote'))}</button>
    </section>
    <h2 class="section-title">${esc(t('notes'))}</h2>
    ${notes.length ? `<ul class="notes">${notes.map((n) => noteItem(n)).join('')}</ul>` : `<p class="muted">${esc(t('noNotes'))}</p>`}
    <div class="action-bar">${confirmButton('player-' + p.id, t('archive'), 'archive-player', `data-id="${p.id}"`)}</div>
  `,
    { backTo: ['players', t('navPlayers')] },
  );
}

// ---------------------------------------------------------------- Settings

function viewOptions() {
  const s = state.settings;
  const toggle = (k, label) => `<label class="switch"><input type="checkbox" id="opt-${k}" data-bind="setting" data-f="${k}" ${s[k] ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  return shell(
    `
    <section class="card">
      <h2 class="section-title">${esc(t('language'))}</h2>
      <div class="seg">${LANGS.map((l) => `<button class="${getLang() === l.id ? 'on' : ''}" data-act="lang" data-l="${l.id}" aria-pressed="${getLang() === l.id}">${esc(l.label)}</button>`).join('')}</div>
    </section>
    <section class="card stack">
      ${toggle('sound', t('sound'))}
      ${toggle('vibrate', t('vibrate'))}
      ${toggle('autoStart', t('autoStart'))}
      <p class="muted sm">${esc(t('keepAwake'))}</p>
    </section>
    <section class="card stack">
      <h2 class="section-title">${esc(t('backup'))}</h2>
      <p class="muted">${esc(t('backupHint'))}</p>
      <div class="row gap wrap-row">
        <button class="btn" data-act="export-file">${esc(t('exportFile'))}</button>
        <button class="btn" data-act="copy-backup">${icon('copy')}${esc(t('copyBackup'))}</button>
      </div>
      ${ui.backupText ? `<textarea id="backup-out" rows="5" readonly>${esc(ui.backupText)}</textarea>` : ''}
      <label class="field wide"><span>${esc(t('importFile'))}</span><input id="import-file" type="file" accept="application/json,.json"></label>
      <label class="field wide"><span>${esc(t('importPaste'))}</span><textarea id="import-text" rows="3"></textarea></label>
      <div><button class="btn" data-act="import-text">${esc(t('importBtn'))}</button></div>
    </section>
    <section class="card stack">
      <p class="muted sm">${esc(t('about_app'))}</p>
      <div>${confirmButton('reset-all', t('resetAll'), 'reset-all')}</div>
    </section>
  `,
    { title: t('navOptions') },
  );
}

// ---------------------------------------------------------------- Run (on the pitch)

function currentRun() {
  const r = S.getRun(state, route.id);
  return r && !r.endedAt ? r : null;
}

function stepActivity(step) {
  return S.getActivity(state, step.activityId) || { title: step.title, category: 'break', duration: step.duration };
}

function runTop(run) {
  const present = run.attendance.length;
  return `<header class="run-top">
    <div class="wrap run-top-in">
      <button class="icon-btn" data-act="nav" data-to="today" aria-label="${esc(t('exit'))}">${icon('x')}</button>
      <div class="run-title"><b>${esc(run.planName || t('untitled'))}</b><small>${run.step >= 0 && run.step < run.steps.length ? esc(t('stepOf', { n: run.step + 1, total: run.steps.length })) : run.step < 0 ? esc(t('attendance')) : esc(t('finishTitle'))}</small></div>
      <div class="session-clock" aria-label="${esc(t('sessionClock'))}"><small>${esc(t('sessionClock'))}</small><b data-t="session">0:00</b></div>
      <button class="btn sm players-btn" data-act="open-notes">${icon('note')}<span>${esc(t('playersBtn'))}</span>${present ? `<em>${present}</em>` : ''}</button>
    </div>
    <div class="wrap"><div class="segs">${run.steps
      .map((s, i) => {
        const a = stepActivity(s);
        const cls = i < run.step ? 'done' : i === run.step ? 'now' : '';
        return `<button class="seg-btn bg-${a.category} ${cls}" style="flex:${s.duration}" data-act="jump" data-i="${i}" aria-label="${esc(tx(a.title))}"></button>`;
      })
      .join('')}</div></div>
  </header>`;
}

function viewRunAttendance(run) {
  const players = S.activePlayers(state);
  const set = new Set(run.attendance);
  return `
    <h1 class="page-title">${esc(t('attendance'))}</h1>
    ${
      players.length
        ? `<p class="muted">${esc(t('attendanceHint'))}</p>
      <div class="row between"><b class="present-count">${esc(t('present', { n: run.attendance.length, total: players.length }))}</b>
        <span class="row gap"><button class="btn sm" data-act="att-all">${esc(t('allHere'))}</button><button class="btn sm ghost" data-act="att-none">${esc(t('nonePresent'))}</button></span></div>
      <div class="att-grid">${players
        .map((p) => `<button class="att ${set.has(p.id) ? 'on' : ''}" data-act="att" data-id="${p.id}" aria-pressed="${set.has(p.id)}"><span class="avatar">${esc(p.number || initials(p.name))}</span><span>${esc(p.name)}</span>${set.has(p.id) ? icon('check', 'att-check') : ''}</button>`)
        .join('')}</div>`
        : `<div class="card empty"><p>${esc(t('noRoster'))}</p></div>`
    }
    <form class="add-player inline" data-form="add-player-run">
      <div class="field-row">
        <label class="field grow"><span>${esc(t('addPlayer'))}</span><input id="run-np-name" name="name" autocomplete="off"></label>
        <button class="btn self-end" type="submit">${icon('plus')}${esc(t('add'))}</button>
      </div>
    </form>
    ${tipsBlock(run.team)}
  `;
}

function tipsBlock(team) {
  return `<details class="tips" ${ui.showTips ? 'open' : ''}><summary data-act="toggle-tips">${icon('whistle')}${esc(t('reminders'))}${team ? ` · ${esc(team)}` : ''}</summary><ul class="hints">${tipsFor(ageOf(team)).map((g) => `<li>${icon('check')}<span>${esc(tx(g))}</span></li>`).join('')}</ul></details>`;
}

function timerCard(run, step) {
  const tm = step.timer;
  const v = T.view(tm);
  const running = T.isRunning(tm);
  const modes = [
    ['down', t('countdown')],
    ['up', t('stopwatch')],
  ];
  if (tm.rounds) modes.push(['rounds', t('roundsMode')]);
  return `<section class="timer ${running ? 'running' : ''}" aria-live="off">
    <div class="seg small">${modes.map(([m, l]) => `<button class="${tm.mode === m ? 'on' : ''}" data-act="t-mode" data-m="${m}" aria-pressed="${tm.mode === m}">${esc(l)}</button>`).join('')}</div>
    <div class="t-sub" data-t="sub">${esc(timerSub(tm, v))}</div>
    <button class="t-digits ${v.over ? 'over' : ''}" data-t="digits" data-act="t-big" aria-label="${esc(t('fullscreen'))}">${timerDigits(v, tm)}</button>
    <div class="t-bar"><span data-t="bar" style="width:${(v.progress ?? 0) * 100}%"></span></div>
    <div class="t-controls">
      <button class="btn primary xl" data-act="t-toggle">${icon(running ? 'pause' : 'play')}${esc(running ? t('pause') : t('start'))}</button>
      <button class="icon-btn lg" data-act="t-reset" aria-label="${esc(t('reset'))}">${icon('reset')}</button>
      ${tm.mode === 'down' ? `<button class="btn" data-act="t-plus">${esc(t('plusMin'))}</button>` : ''}
      <button class="icon-btn lg" data-act="t-big" aria-label="${esc(t('fullscreen'))}">${icon('expand')}</button>
    </div>
  </section>`;
}

function timerDigits(v, tm) {
  const ceil = tm.mode !== 'up' && !v.over;
  return `${v.sign}${T.fmt(v.main, { ceil })}`;
}

function timerSub(tm, v) {
  if (tm.mode === 'rounds' && v.round) {
    if (v.round.phase === 'done') return t('allRoundsDone');
    return `${t('round', { n: v.round.round, total: v.round.total })} · ${v.round.phase === 'rest' ? t('restPhase') : t('playPhase')}`;
  }
  if (tm.mode === 'down') return v.over ? t('overtime') : t('planned', { n: Math.round(tm.target / 60000) });
  return t('stopwatch');
}

function callsCard(a) {
  if (!a.calls?.length) return '';
  return `<section class="sect calls-card"><div class="row between"><h3>${esc(t('calls'))}</h3><button class="btn sm" data-act="call-random">${icon('dice')}${esc(t('randomCall'))}</button></div>
    <div class="calls">${a.calls.map((c, i) => `<button class="call" data-act="call" data-i="${i}" ${c.color ? `style="--call:${c.color}"` : ''}>${esc(tx(c))}</button>`).join('')}</div>
    <p class="muted sm">${esc(t('callHint'))}</p></section>`;
}

function viewRunStep(run) {
  const step = run.steps[run.step];
  const a = stepActivity(step);
  const nextStep = run.steps[run.step + 1];
  const na = nextStep && stepActivity(nextStep);
  return `
    <div class="step-head">
      <div class="ac-meta">${catChip(a.category)}<span class="ac-min">${esc(t('planned', { n: step.duration }))}</span></div>
      <h1 class="step-title">${esc(tx(a.title))}</h1>
      ${tx(a.summary) ? `<p class="lead">${esc(tx(a.summary))}</p>` : ''}
      ${step.note ? `<p class="block-note">${icon('note')}${esc(step.note)}</p>` : ''}
    </div>
    <div class="step-grid">
      <div class="step-col">
        ${timerCard(run, step)}
        ${callsCard(a)}
      </div>
      <div class="step-col">
        ${activityBody(a, { onPitch: true })}
      </div>
    </div>
    ${
      na
        ? `<button class="card up-next" data-act="run-next"><span class="eyebrow">${esc(t('upNext'))}</span><span class="un-row">${catChip(na.category)}<b>${esc(tx(na.title))}</b><span class="muted">${nextStep.duration} ${esc(t('min'))}</span></span></button>`
        : `<p class="muted center">${esc(t('lastOne'))}</p>`
    }
    ${tipsBlock(run.team)}
  `;
}

function viewRunFinish(run) {
  const notes = S.runNotes(state, run.id);
  const mins = Math.round((Date.now() - run.startedAt) / 60000);
  return `
    <h1 class="page-title">${esc(t('finishTitle'))}</h1>
    <dl class="facts big">
      <div><dt>${esc(t('duration'))}</dt><dd>${mins} ${esc(t('min'))}</dd></div>
      <div><dt>${esc(t('players'))}</dt><dd>${run.attendanceTaken ? run.attendance.length : '–'}</dd></div>
      <div><dt>${esc(t('notesTaken'))}</dt><dd>${notes.length}</dd></div>
    </dl>
    <label class="field wide"><span>${esc(t('reflection'))}</span><textarea id="reflection" rows="4" data-bind="reflection" placeholder="${esc(t('reflectionHint'))}">${esc(run.reflection)}</textarea></label>
    <h2 class="section-title">${esc(t('notesTaken'))}</h2>
    ${notes.length ? `<ul class="notes">${notes.map((n) => noteItem(n, { withPlayer: true })).join('')}</ul>` : `<p class="muted">${esc(t('noNotesTaken'))}</p>`}
    <div class="action-bar">
      <button class="btn primary lg" data-act="finish-run">${icon('check')}${esc(t('saveAndClose'))}</button>
      ${confirmButton('discard-run', t('discardRun'), 'discard-run')}
    </div>`;
}

function viewRun() {
  const run = currentRun();
  if (!run) {
    route = { name: 'today' };
    return viewToday();
  }
  let body;
  let nav;
  if (run.step < 0) {
    body = viewRunAttendance(run);
    nav = `<button class="btn primary xl grow" data-act="run-next">${esc(t('begin'))}${icon('next')}</button>`;
  } else if (run.step >= run.steps.length) {
    body = viewRunFinish(run);
    nav = `<button class="btn xl" data-act="run-prev">${icon('back')}${esc(t('prev'))}</button>`;
  } else {
    const last = run.step === run.steps.length - 1;
    body = viewRunStep(run);
    nav = `<button class="btn xl" data-act="run-prev">${icon('back')}${esc(t('prev'))}</button>
           <button class="btn primary xl grow" data-act="run-next">${esc(last ? t('finish') : t('next'))}${icon(last ? 'check' : 'next')}</button>`;
  }
  return `
    ${runTop(run)}
    <main class="wrap main run-main">${body}</main>
    <nav class="run-nav"><div class="wrap run-nav-in">${nav}</div></nav>
    ${bigTimerHtml(run)}
    ${flashHtml()}
    ${sheetHtml()}
    <div id="toast" class="toast" role="status" ${ui.toast ? '' : 'hidden'}>${esc(ui.toast || '')}</div>`;
}

function bigTimerHtml(run) {
  if (!ui.big) return '';
  const step = run.steps[run.step];
  if (!step) return '';
  const tm = step.timer;
  const v = T.view(tm);
  const running = T.isRunning(tm);
  return `<div class="overlay big-timer" role="dialog" aria-modal="true" aria-label="${esc(t('fullscreen'))}">
    <button class="icon-btn lg close" data-act="t-big-close" aria-label="${esc(t('close'))}">${icon('x')}</button>
    <div class="bt-title">${esc(tx(stepActivity(step).title))}</div>
    <div class="t-sub" data-t="sub">${esc(timerSub(tm, v))}</div>
    <div class="bt-digits ${v.over ? 'over' : ''}" data-t="digits">${timerDigits(v, tm)}</div>
    <div class="t-bar"><span data-t="bar" style="width:${(v.progress ?? 0) * 100}%"></span></div>
    <div class="t-controls">
      <button class="btn primary xl" data-act="t-toggle">${icon(running ? 'pause' : 'play')}${esc(running ? t('pause') : t('start'))}</button>
      <button class="icon-btn lg" data-act="t-reset" aria-label="${esc(t('reset'))}">${icon('reset')}</button>
    </div>
  </div>`;
}

function flashHtml() {
  if (!ui.flash) return '';
  return `<button class="overlay flash" data-act="flash-close" style="--call:${ui.flash.color || 'var(--royal)'}"><span>${esc(ui.flash.text)}</span></button>`;
}

// ---------------------------------------------------------------- sheets

function pickerList() {
  const list = S.searchActivities(S.allActivities(state), { q: ui.pickQ, category: ui.pickCat, age: ui.pickAge });
  if (!list.length) return `<p class="muted">${esc(t('noResults'))}</p>`;
  return `<ul class="list pick">${list
    .map(
      (a) => `<li class="pick-row">
      <span class="dot bg-${a.category}"></span>
      <span class="lr-main"><b>${esc(tx(a.title))}</b><small>${esc(t('cat_' + a.category))} · ${a.duration} ${esc(t('min'))}${showAges(a) ? ` · ${showAges(a)}` : ''}</small></span>
      <button class="btn sm primary" data-act="pick" data-id="${esc(a.id)}">${icon('plus')}${esc(t('add'))}</button>
    </li>`,
    )
    .join('')}</ul>`;
}

function notesSheet() {
  const run = currentRun();
  if (!run) return '';
  const players = S.activePlayers(state);
  const present = new Set(run.attendance);
  const sorted = run.attendanceTaken ? [...players].sort((a, b) => Number(present.has(b.id)) - Number(present.has(a.id))) : players;
  const runNotes = S.runNotes(state, run.id);
  const countFor = (id) => runNotes.filter((n) => n.playerId === id).length;

  if (ui.noteFor) {
    const p = ui.noteFor === 'session' ? null : S.getPlayer(state, ui.noteFor);
    const mine = runNotes.filter((n) => (p ? n.playerId === p.id : n.playerId == null));
    return `
      <button class="back-link" data-act="note-back">${icon('back')}${esc(t('notesTitle'))}</button>
      <h2 class="sheet-title">${esc(p ? p.name : t('sessionNote'))}</h2>
      ${tagChips('run-note')}
      <textarea id="run-note" rows="3" data-bind="run-note" placeholder="${esc(t('writeNote'))}">${esc(ui.noteText)}</textarea>
      <button class="btn primary" data-act="save-run-note">${icon('check')}${esc(t('saveNote'))}</button>
      ${mine.length ? `<ul class="notes">${mine.map((n) => noteItem(n)).join('')}</ul>` : ''}`;
  }
  return `
    <h2 class="sheet-title">${esc(t('notesTitle'))}</h2>
    <p class="muted sm">${esc(t('notesHint'))}</p>
    <button class="list-row session-note" data-act="note-for" data-id="session">${icon('note')}<span class="lr-main"><b>${esc(t('sessionNote'))}</b></span>${countFor(null) ? `<em class="count">${countFor(null)}</em>` : ''}</button>
    <div class="att-grid">${sorted
      .map((p) => {
        const c = countFor(p.id);
        const away = run.attendanceTaken && !present.has(p.id);
        return `<button class="att ${away ? 'away' : ''}" data-act="note-for" data-id="${p.id}"><span class="avatar">${esc(p.number || initials(p.name))}</span><span>${esc(p.name)}</span>${c ? `<em class="count">${c}</em>` : ''}</button>`;
      })
      .join('')}</div>
    ${players.length ? '' : `<p class="muted">${esc(t('noRoster'))}</p>`}`;
}

function sheetHtml() {
  if (!ui.sheet) return '';
  let body = '';
  let title = '';
  if (ui.sheet.type === 'picker') {
    title = t('pickActivity');
    body = `<div class="lib-tools"><input class="search" id="pick-search" type="search" data-bind="pick-q" value="${esc(ui.pickQ)}" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}">${ageSelect('pick-age', 'pick-age', ui.pickAge)}</div>
      ${catFilter(ui.pickCat, 'pick-cat')}
      <div id="pick-list">${pickerList()}</div>`;
  } else if (ui.sheet.type === 'addTo') {
    title = t('chooseSession');
    const plans = [...state.plans].sort((a, b) => b.updatedAt - a.updatedAt);
    body = `<ul class="list">${plans
      .map(
        (p) => `<li><button class="list-row" data-act="add-to" data-id="${p.id}"><span class="lr-main"><b>${esc(planTitle(p))}</b><small>${esc(fmtDate(p.date))} · ${S.planMinutes(p)} ${esc(t('min'))}</small></span>${icon('plus', 'chev')}</button></li>`,
      )
      .join('')}
      <li><button class="list-row" data-act="add-to-new">${icon('plus')}<span class="lr-main"><b>${esc(t('toNewSession'))}</b></span></button></li></ul>`;
  } else if (ui.sheet.type === 'notes') {
    body = notesSheet();
  }
  return `<div class="sheet-wrap" role="dialog" aria-modal="true" aria-label="${esc(title || t('notesTitle'))}">
    <button class="sheet-scrim" data-act="close-sheet" aria-label="${esc(t('close'))}"></button>
    <div class="sheet">
      <div class="sheet-head">${title ? `<h2 class="sheet-title">${esc(title)}</h2>` : '<span></span>'}<button class="btn sm" data-act="close-sheet">${esc(t('done'))}</button></div>
      <div class="sheet-body">${body}</div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- render

const VIEWS = {
  today: viewToday,
  plans: viewPlans,
  plan: viewPlan,
  library: viewLibrary,
  activity: viewActivity,
  'activity-edit': viewActivityEdit,
  players: viewPlayers,
  player: viewPlayer,
  options: viewOptions,
  run: viewRun,
  summary: viewSummary,
  print: viewPrint,
};

const app = document.getElementById('app');

function render() {
  const fn = VIEWS[route.name] || viewToday;
  app.innerHTML = fn();
  document.body.classList.toggle('in-run', route.name === 'run');
  document.body.classList.toggle('sheet-open', !!ui.sheet);
  keepAwake(route.name === 'run');
  live();
}

function viewSummary() {
  const run = S.getRun(state, route.id);
  if (!run) return viewPlans();
  const notes = S.runNotes(state, run.id);
  const mins = run.endedAt ? Math.round((run.endedAt - run.startedAt) / 60000) : 0;
  const names = run.attendance.map((id) => S.getPlayer(state, id)?.name).filter(Boolean);
  return shell(
    `
    <h1 class="page-title">${esc(run.planName || t('untitled'))}</h1>
    <p class="muted">${esc(fmtDate(run.startedAt))} · ${esc(fmtTime(run.startedAt))}</p>
    <dl class="facts big">
      <div><dt>${esc(t('duration'))}</dt><dd>${mins} ${esc(t('min'))}</dd></div>
      <div><dt>${esc(t('players'))}</dt><dd>${run.attendanceTaken ? names.length : '–'}</dd></div>
      <div><dt>${esc(t('notesTaken'))}</dt><dd>${notes.length}</dd></div>
    </dl>
    ${names.length ? `<p class="att-names">${names.map(esc).join(', ')}</p>` : ''}
    <ol class="run-order">${run.steps.map((s) => `<li><span class="dot bg-${stepActivity(s).category}"></span><span class="ro-title">${esc(tx(stepActivity(s).title))}</span><span class="ro-min">${s.duration}′</span></li>`).join('')}</ol>
    <label class="field wide"><span>${esc(t('reflection'))}</span><textarea id="reflection" rows="4" data-bind="reflection-past" data-id="${run.id}" placeholder="${esc(t('reflectionHint'))}">${esc(run.reflection)}</textarea></label>
    <h2 class="section-title">${esc(t('notesTaken'))}</h2>
    ${notes.length ? `<ul class="notes">${notes.map((n) => noteItem(n, { withPlayer: true })).join('')}</ul>` : `<p class="muted">${esc(t('noNotesTaken'))}</p>`}
    <div class="action-bar">${confirmButton('run-' + run.id, t('delete'), 'delete-run', `data-id="${run.id}"`)}</div>
  `,
    { backTo: ['plans', t('navPlans')] },
  );
}

// ---------------------------------------------------------------- printable plan

// Browsers only print from a top-level page; embedded previews ignore window.print().
const CAN_PRINT = (() => {
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
})();

function viewPrint() {
  const plan = S.getPlan(state, route.id);
  if (!plan) return viewPlans();
  const tl = S.timeline(state, plan);
  const total = S.planMinutes(plan);
  const equipment = [...new Set(tl.filter((x) => x.activity && x.activity.category !== 'break').map((x) => tx(x.activity.equipment)).filter((e) => e && !/^(none|nimic)$/i.test(e.trim())))];
  const players = S.activePlayers(state);
  const rows = tl
    .map((x, i) => {
      const a = x.activity || { title: '?', category: 'break' };
      return `<tr><td class="num">${S.clock(x.start)}–${S.clock(x.end)}</td><td class="num">${x.block.duration}</td><td><span class="dot bg-${a.category}"></span><b>${i + 1}. ${esc(tx(a.title))}</b></td><td>${esc(txList(a.coaching)[0] || '')}</td></tr>`;
    })
    .join('');
  const acts = tl
    .filter((x) => x.activity && x.activity.category !== 'break')
    .map((x) => {
      const a = x.activity;
      const i = tl.indexOf(x) + 1;
      const d = renderDiagram(a.diagram, { title: tx(a.title) });
      const coaching = txList(a.coaching);
      const para = (label, v) => (tx(v) ? `<p><b>${esc(label)}:</b> ${nl(tx(v))}</p>` : '');
      return `<section class="doc-act">
        <header class="doc-act-head">
          <span class="doc-time">${S.clock(x.start)}–${S.clock(x.end)}</span>
          <h2>${i}. ${esc(tx(a.title))}</h2>
          <span class="doc-meta">${esc(t('cat_' + a.category))} · ${x.block.duration} ${esc(t('min'))}${a.ages ? ` · ${agesLabel(a.ages)}` : ''}${a.rounds ? ` · ${esc(roundsText(a.rounds))}` : ''}</span>
        </header>
        ${x.block.note ? `<p class="doc-note">${esc(x.block.note)}</p>` : ''}
        <div class="doc-act-body">
          <div class="doc-text">
            ${para(t('setup'), a.setup)}
            ${para(t('howTo'), a.howTo)}
            ${coaching.length ? `<p><b>${esc(t('coaching'))}:</b></p><ul>${coaching.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
            ${para(t('easier'), a.easier)}
            ${para(t('harder'), a.harder)}
            ${a.calls?.length ? `<p><b>${esc(t('calls'))}:</b> ${a.calls.map((c) => esc(tx(c))).join(' · ')}</p>` : ''}
            ${para(t('equipment'), a.equipment)}
          </div>
          ${d ? `<figure class="doc-dg">${d.svg}<figcaption class="legend">${d.legend.map((l) => `<span>${legendSwatch(l.key)}${esc(l.label)}</span>`).join('')}</figcaption></figure>` : ''}
        </div>
      </section>`;
    })
    .join('');

  return shell(
    `
    <div class="print-bar no-print">
      ${CAN_PRINT ? `<button class="btn primary lg" data-act="print">${icon('print')}${esc(t('printBtn'))}</button><p class="muted sm">${esc(t('printHint'))}</p>` : `<p class="notice">${esc(t('printBlocked'))}</p>`}
    </div>
    <article class="doc">
      <header class="doc-head">
        ${CREST}
        <div>
          <div class="doc-club">${esc(t('appName'))} · ${esc(t('sessionPlan'))}</div>
          <h1>${esc(planTitle(plan))}</h1>
          <p>${esc(fmtDate(plan.date))} · ${esc(plan.team || '')} · ${total} ${esc(t('min'))} · ${tl.length} ${esc(t('activities'))}</p>
        </div>
      </header>
      ${plan.focus ? `<p class="doc-focus"><b>${esc(t('theme'))}:</b> ${esc(plan.focus)}</p>` : ''}
      ${plan.notes ? `<p class="doc-focus">${nl(plan.notes)}</p>` : ''}
      <section class="doc-sec">
        <h2>${esc(t('schedule'))}</h2>
        <div class="table-wrap"><table class="doc-table">
          <thead><tr><th>${esc(t('colTime'))}</th><th>${esc(t('colMin'))}</th><th>${esc(t('colActivity'))}</th><th>${esc(t('colKey'))}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>
      <section class="doc-sec doc-two">
        <div><h2>${esc(t('equipmentList'))}</h2><ul class="checklist">${equipment.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>
        ${players.length ? `<div><h2>${esc(t('register'))}</h2><ul class="checklist cols">${players.map((p) => `<li>${esc(p.name)}${p.number ? ` <small>#${esc(p.number)}</small>` : ''}</li>`).join('')}</ul></div>` : ''}
      </section>
      ${acts}
      <section class="doc-sec doc-keep">
        <h2>${esc(t('reminders'))}</h2>
        <ul>${tipsFor(ageOf(plan.team)).map((g) => `<li>${esc(tx(g))}</li>`).join('')}</ul>
      </section>
      <section class="doc-sec doc-keep">
        <h2>${esc(t('afterNotes'))}</h2>
        <div class="lines"></div>
      </section>
    </article>
  `,
    { backTo: ['plan', planTitle(plan), plan.id] },
  );
}

// ---------------------------------------------------------------- live timer updates

const markers = new Map();

function live() {
  const run = S.activeRun(state);
  if (!run) return;
  const sessionEl = document.querySelector('[data-t="session"]');
  if (sessionEl) sessionEl.textContent = T.fmt(Date.now() - run.startedAt);
  const step = run.steps[run.step];
  if (!step) return;
  const tm = step.timer;
  const v = T.view(tm);

  // beeps
  const key = `${run.id}:${run.step}:${tm.mode}`;
  const prev = markers.get(key);
  if (prev !== undefined && prev !== v.marker && T.isRunning(tm)) {
    const end = v.marker === 'done';
    T.signal(end ? 'end' : 'phase', state.settings);
    if (end) toast(t('timeUp'));
  }
  markers.set(key, v.marker);

  if (route.name !== 'run') return;
  document.querySelectorAll('[data-t="digits"]').forEach((el) => {
    el.textContent = timerDigits(v, tm);
    el.classList.toggle('over', v.over);
  });
  document.querySelectorAll('[data-t="sub"]').forEach((el) => (el.textContent = timerSub(tm, v)));
  document.querySelectorAll('[data-t="bar"]').forEach((el) => (el.style.width = `${(v.progress ?? 0) * 100}%`));
}

setInterval(live, 250);

// ---------------------------------------------------------------- wake lock

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    keepAwake(route.name === 'run');
    live();
  }
});

// ---------------------------------------------------------------- actions

function runStepTimer() {
  const run = currentRun();
  return run && run.steps[run.step] ? run.steps[run.step].timer : null;
}

function setStep(run, i) {
  const cur = run.steps[run.step];
  if (cur) T.pause(cur.timer);
  if (run.step < 0 && i >= 0) run.attendanceTaken = run.attendanceTaken || run.attendance.length > 0;
  run.step = Math.max(-1, Math.min(run.steps.length, i));
  const nxt = run.steps[run.step];
  if (nxt && state.settings.autoStart && !T.isRunning(nxt.timer) && T.elapsed(nxt.timer) === 0) {
    T.unlockAudio();
    T.start(nxt.timer);
  }
  ui.big = false;
  commit();
  render();
  window.scrollTo(0, 0);
}

function appendTag(target, k) {
  const text = t(k);
  const add = (cur) => (cur.trim() ? cur.trim().replace(/[.]?$/, '. ') + text : text) + (k === 'tag_help' ? ' ' : '');
  if (target === 'run-note') ui.noteText = add(ui.noteText);
  else ui.playerNoteText = add(ui.playerNoteText);
  const el = document.getElementById(target);
  if (el) {
    el.value = target === 'run-note' ? ui.noteText : ui.playerNoteText;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}

const actions = {
  nav(el) {
    if (el.dataset.to === 'activity-edit') ui.draft = null;
    go(el.dataset.to, el.dataset.id || null);
  },
  resume() {
    const r = S.activeRun(state);
    if (r) go('run', r.id);
  },
  'confirm-ask'(el) {
    ui.confirm = el.dataset.key;
    render();
  },
  'confirm-cancel'() {
    ui.confirm = null;
    render();
  },

  // plans
  'new-plan'() {
    const p = S.newPlan(state);
    commit();
    go('plan', p.id);
  },
  'start-run'(el) {
    const plan = S.getPlan(state, el.dataset.id);
    if (!plan || !plan.blocks.length) return;
    T.unlockAudio();
    const existing = S.activeRun(state);
    const run = existing || S.startRun(state, plan);
    S.save(state, { now: true });
    go('run', run.id);
  },
  dur(el) {
    const plan = S.getPlan(state, route.id);
    const b = plan?.blocks.find((x) => x.id === el.dataset.id);
    if (!b) return;
    b.duration = Math.max(1, Math.min(90, (Number(b.duration) || 0) + Number(el.dataset.d)));
    S.touch(plan);
    commit();
    render();
  },
  move(el) {
    const plan = S.getPlan(state, route.id);
    S.moveBlock(plan, el.dataset.id, Number(el.dataset.d));
    commit();
    render();
  },
  'remove-block'(el) {
    const plan = S.getPlan(state, route.id);
    S.removeBlock(plan, el.dataset.id);
    commit();
    render();
  },
  'add-break'(el) {
    const plan = S.getPlan(state, el.dataset.id);
    S.addBlock(state, plan, 'water-break');
    commit();
    render();
  },
  'open-picker'(el) {
    ui.sheet = { type: 'picker', planId: el.dataset.id };
    ui.pickAge = ageOf(S.getPlan(state, el.dataset.id)?.team);
    render();
    document.getElementById('pick-search')?.focus({ preventScroll: true });
  },
  'pick-cat'(el) {
    ui.pickCat = el.dataset.c;
    render();
  },
  pick(el) {
    const plan = S.getPlan(state, ui.sheet.planId);
    const a = S.getActivity(state, el.dataset.id);
    S.addBlock(state, plan, el.dataset.id);
    commit();
    render();
    toast(t('addedTo', { name: planTitle(plan) }) + ' · ' + tx(a.title));
  },
  'from-template'(el) {
    const tpl = TEMPLATES.find((x) => x.id === el.dataset.id);
    const p = S.planFromTemplate(state, tpl, getLang());
    commit();
    go('plan', p.id);
  },
  print() {
    try {
      window.print();
    } catch {
      /* the print dialog is optional */
    }
  },
  'dup-plan'(el) {
    const p = S.getPlan(state, el.dataset.id);
    const copy = S.duplicatePlan(state, p);
    commit();
    go('plan', copy.id);
  },
  'delete-plan'(el) {
    S.deletePlan(state, el.dataset.id);
    commit();
    go('plans', null, { replace: true });
  },

  // library
  'lib-cat'(el) {
    ui.category = el.dataset.c;
    render();
  },
  'new-activity'() {
    ui.draft = null;
    go('activity-edit', 'new');
  },
  'edit-activity'(el) {
    ui.draft = null;
    go('activity-edit', el.dataset.id);
  },
  'cancel-edit'() {
    const id = ui.draft && S.getActivity(state, ui.draft.id) ? ui.draft.id : route.id !== 'new' ? route.id : null;
    ui.draft = null;
    if (id) go('activity', id, { replace: true });
    else go('library', null, { replace: true });
  },
  'delete-activity'(el) {
    S.deleteActivity(state, el.dataset.id);
    commit();
    go('library', null, { replace: true });
  },
  'open-addto'(el) {
    ui.sheet = { type: 'addTo', activityId: el.dataset.id };
    render();
  },
  'add-to'(el) {
    const plan = S.getPlan(state, el.dataset.id);
    S.addBlock(state, plan, ui.sheet.activityId);
    commit();
    ui.sheet = null;
    render();
    toast(t('addedTo', { name: planTitle(plan) }));
  },
  'add-to-new'() {
    const actId = ui.sheet.activityId;
    const p = S.newPlan(state);
    S.addBlock(state, p, actId);
    commit();
    go('plan', p.id);
  },
  'close-sheet'() {
    ui.sheet = null;
    ui.noteFor = null;
    render();
  },

  // players
  'toggle-bulk'() {
    ui.bulk = !ui.bulk;
    render();
    if (ui.bulk) document.getElementById('bulk-names')?.focus();
  },
  'bulk-add'() {
    const el = document.getElementById('bulk-names');
    const added = S.bulkAddPlayers(state, el?.value || '');
    commit();
    ui.bulk = false;
    render();
    if (added.length) toast(`+${added.length}`);
  },
  'archive-player'(el) {
    const p = S.getPlayer(state, el.dataset.id);
    if (p) p.archived = true;
    commit();
    go('players', null, { replace: true });
  },
  tag(el) {
    appendTag(el.dataset.target, el.dataset.k);
  },
  'save-player-note'(el) {
    const p = S.getPlayer(state, el.dataset.id);
    const n = S.addNote(state, { playerId: p.id, text: ui.playerNoteText, context: t('general') });
    if (!n) return;
    ui.playerNoteText = '';
    commit();
    render();
    toast(t('noteSaved', { name: p.name }));
  },
  'delete-note'(el) {
    S.deleteNote(state, el.dataset.id);
    commit();
    render();
  },

  // settings
  lang(el) {
    state.settings.lang = el.dataset.l;
    state.settings.langChosen = true;
    setLang(el.dataset.l);
    S.relocalize(state, el.dataset.l);
    commit();
    render();
  },
  'export-file'() {
    const text = S.exportData(state);
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `royal-club-backup-${S.today()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 500);
    } catch {
      /* fall through to the text copy */
    }
    ui.backupText = text;
    render();
  },
  'copy-backup'() {
    const text = S.exportData(state);
    ui.backupText = text;
    const done = () => toast(t('copied'));
    const fail = () => {
      render();
      const el = document.getElementById('backup-out');
      el?.focus();
      el?.select();
      toast(t('copyFailed'));
    };
    try {
      navigator.clipboard.writeText(text).then(() => {
        render();
        done();
      }, fail);
    } catch {
      fail();
    }
  },
  'import-text'() {
    const el = document.getElementById('import-text');
    importBackup(el?.value || '');
  },
  'reset-all'() {
    const fresh = S.emptyState(getLang());
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh, { seeded: true });
    S.save(state, { now: true });
    ui.confirm = null;
    go('today', null, { replace: true });
    toast(t('resetDone'));
  },

  // run
  'run-next'() {
    const run = currentRun();
    if (run) setStep(run, run.step + 1);
  },
  'run-prev'() {
    const run = currentRun();
    if (run) setStep(run, run.step - 1);
  },
  jump(el) {
    const run = currentRun();
    if (run) setStep(run, Number(el.dataset.i));
  },
  att(el) {
    const run = currentRun();
    const id = el.dataset.id;
    run.attendance = run.attendance.includes(id) ? run.attendance.filter((x) => x !== id) : [...run.attendance, id];
    run.attendanceTaken = true;
    commit();
    render();
  },
  'att-all'() {
    const run = currentRun();
    run.attendance = S.activePlayers(state).map((p) => p.id);
    run.attendanceTaken = true;
    commit();
    render();
  },
  'att-none'() {
    const run = currentRun();
    run.attendance = [];
    commit();
    render();
  },
  'toggle-tips'(el, e) {
    e.preventDefault();
    ui.showTips = !ui.showTips;
    el.closest('details').open = ui.showTips;
  },
  't-toggle'() {
    const tm = runStepTimer();
    if (!tm) return;
    T.unlockAudio();
    if (T.isRunning(tm)) T.pause(tm);
    else T.start(tm);
    commit();
    render();
  },
  't-reset'() {
    const tm = runStepTimer();
    if (!tm) return;
    T.reset(tm);
    commit();
    render();
  },
  't-plus'() {
    const tm = runStepTimer();
    if (!tm) return;
    T.addMinute(tm);
    commit();
    render();
  },
  't-mode'(el) {
    const tm = runStepTimer();
    if (!tm) return;
    tm.mode = el.dataset.m;
    commit();
    render();
  },
  't-big'() {
    ui.big = true;
    render();
    try {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } catch {
      /* optional */
    }
  },
  't-big-close'() {
    ui.big = false;
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch {
      /* optional */
    }
    render();
  },
  call(el) {
    const run = currentRun();
    const a = stepActivity(run.steps[run.step]);
    showCall(a.calls[Number(el.dataset.i)]);
  },
  'call-random'() {
    const run = currentRun();
    const a = stepActivity(run.steps[run.step]);
    const calls = a.calls || [];
    if (!calls.length) return;
    let i = Math.floor(Math.random() * calls.length);
    if (calls.length > 1 && ui.lastCall === i) i = (i + 1) % calls.length;
    ui.lastCall = i;
    showCall(calls[i]);
  },
  'flash-close'() {
    ui.flash = null;
    render();
  },
  'open-notes'() {
    ui.sheet = { type: 'notes' };
    ui.noteFor = null;
    render();
  },
  'note-for'(el) {
    ui.noteFor = el.dataset.id;
    ui.noteText = '';
    render();
    document.getElementById('run-note')?.focus({ preventScroll: true });
  },
  'note-back'() {
    ui.noteFor = null;
    render();
  },
  'save-run-note'() {
    const run = currentRun();
    const step = run.steps[run.step];
    const context = step ? tx(stepActivity(step).title) : run.step < 0 ? t('attendance') : t('finishTitle');
    const playerId = ui.noteFor === 'session' ? null : ui.noteFor;
    const n = S.addNote(state, { playerId, text: ui.noteText, runId: run.id, context });
    if (!n) return;
    const p = playerId && S.getPlayer(state, playerId);
    ui.noteText = '';
    ui.noteFor = null;
    commit();
    render();
    toast(t('noteSaved', { name: p ? p.name : t('sessionNote') }));
  },
  'finish-run'() {
    const run = currentRun();
    S.finishRun(state, run);
    S.save(state, { now: true });
    go('summary', run.id, { replace: true });
  },
  'discard-run'() {
    const run = currentRun();
    S.discardRun(state, run);
    S.save(state, { now: true });
    go('today', null, { replace: true });
  },
  'delete-run'(el) {
    const run = S.getRun(state, el.dataset.id);
    if (run) S.discardRun(state, run);
    commit();
    go('plans', null, { replace: true });
  },
};

function showCall(c) {
  if (!c) return;
  ui.flash = { text: tx(c), color: c.color };
  render();
  clearTimeout(showCall.t);
  showCall.t = setTimeout(() => {
    ui.flash = null;
    if (route.name === 'run') render();
  }, 2500);
}

function importBackup(text) {
  try {
    const fresh = S.parseBackup(text, getLang());
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, fresh);
    setLang(state.settings.lang);
    S.save(state, { now: true });
    go('today', null, { replace: true });
    toast(t('importOk'));
  } catch {
    toast(t('importBad'));
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) {
    if (el.tagName === 'A') e.preventDefault();
    fn(el, e);
  }
});

// Text inputs update data without re-rendering, so typing keeps focus.
const binds = {
  plan(el) {
    const plan = S.getPlan(state, route.id);
    if (!plan) return;
    const f = el.dataset.f;
    plan[f] = f === 'target' ? Math.max(0, Number(el.value) || 0) : el.value;
    S.touch(plan);
  },
  'block-note'(el) {
    const plan = S.getPlan(state, route.id);
    const b = plan?.blocks.find((x) => x.id === el.dataset.id);
    if (b) b.note = el.value;
  },
  draft(el) {
    if (ui.draft) ui.draft[el.dataset.f] = el.value;
  },
  player(el) {
    const p = S.getPlayer(state, route.id);
    if (p) p[el.dataset.f] = el.value;
  },
  'player-note'(el) {
    ui.playerNoteText = el.value;
  },
  'run-note'(el) {
    ui.noteText = el.value;
  },
  reflection(el) {
    const run = currentRun();
    if (run) run.reflection = el.value;
  },
  'reflection-past'(el) {
    const run = S.getRun(state, el.dataset.id);
    if (run) run.reflection = el.value;
  },
  setting(el) {
    state.settings[el.dataset.f] = el.checked;
  },
  'lib-q'(el) {
    ui.q = el.value;
    const grid = document.getElementById('lib-grid');
    if (grid) grid.innerHTML = libraryCards(S.searchActivities(S.allActivities(state), { q: ui.q, category: ui.category, age: ui.age }));
    return false;
  },
  'lib-age'(el) {
    ui.age = Number(el.value) || null;
    const grid = document.getElementById('lib-grid');
    if (grid) grid.innerHTML = libraryCards(S.searchActivities(S.allActivities(state), { q: ui.q, category: ui.category, age: ui.age }));
    return false;
  },
  'pick-age'(el) {
    ui.pickAge = Number(el.value) || null;
    const list = document.getElementById('pick-list');
    if (list) list.innerHTML = pickerList();
    return false;
  },
  'pick-q'(el) {
    ui.pickQ = el.value;
    const list = document.getElementById('pick-list');
    if (list) list.innerHTML = pickerList();
    return false;
  },
};

function onBind(e) {
  const el = e.target.closest('[data-bind]');
  if (!el) return;
  const fn = binds[el.dataset.bind];
  if (fn && fn(el) !== false) commit();
}
document.addEventListener('input', onBind);
document.addEventListener('change', (e) => {
  // Text fields are already handled on 'input'; re-running them on blur would
  // redraw lists under the button being clicked.
  if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') onBind(e);
  if (e.target.id === 'import-file' && e.target.files?.[0]) {
    const r = new FileReader();
    r.onload = () => importBackup(String(r.result || ''));
    r.readAsText(e.target.files[0]);
  }
  // Plan totals depend on the target field.
  if (e.target.dataset?.bind === 'plan' && e.target.dataset.f === 'target') render();
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.form === 'activity') saveDraft();
  if (form.dataset.form === 'add-player' || form.dataset.form === 'add-player-run') {
    const name = form.elements.name.value;
    const number = form.elements.number?.value || '';
    const p = S.addPlayer(state, { name, number });
    if (!p) return;
    const run = form.dataset.form === 'add-player-run' ? currentRun() : null;
    if (run) {
      run.attendance.push(p.id);
      run.attendanceTaken = true;
    }
    commit();
    render();
    document.getElementById(run ? 'run-np-name' : 'np-name')?.focus();
  }
});

document.addEventListener('keydown', (e) => {
  if (route.name !== 'run' || e.target.closest('input, textarea, select')) return;
  if (e.key === 'ArrowRight') actions['run-next']();
  else if (e.key === 'ArrowLeft') actions['run-prev']();
  else if (e.key === ' ' && currentRun()?.steps[currentRun().step]) {
    e.preventDefault();
    actions['t-toggle']();
  } else if (e.key === 'Escape') {
    if (ui.big) actions['t-big-close']();
    else if (ui.flash) actions['flash-close']();
    else if (ui.sheet) actions['close-sheet']();
  }
});

window.addEventListener('pagehide', () => S.save(state, { now: true }));

try {
  history.replaceState({ route }, '', '#' + SECTIONS[route.name]);
} catch {
  /* optional */
}
render();

// Offline support when served from a normal web host.
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !/claude|claudeusercontent/.test(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
