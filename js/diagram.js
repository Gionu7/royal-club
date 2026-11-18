// Draws an activity diagram (units: meters) as inline SVG, plus a legend.
import { tx, getLang } from './i18n.js';

const LEGEND = {
  blue: { en: 'Player', ro: 'Jucător' },
  orange: { en: 'Other team', ro: 'Cealaltă echipă' },
  ball: { en: 'Ball', ro: 'Minge' },
  cone: { en: 'Cone', ro: 'Con' },
  gate: { en: 'Cone gate', ro: 'Poartă din conuri' },
  goal: { en: 'Small goal', ro: 'Poartă mică' },
  coach: { en: 'Coach', ro: 'Antrenor' },
  arrow: { en: 'Run / dribble', ro: 'Direcția de mers' },
  pass: { en: 'Pass', ro: 'Pasă' },
  dash: { en: 'Shot / dribble back', ro: 'Șut / dribling înapoi' },
};

const PAD = 1;
const R = 0.75; // player radius

const n = (v) => Math.round(v * 100) / 100;

/** Turn a run arrow around (or sideways) when it would leave the drawing. */
function inside(it, len, spec) {
  const reach = R + 0.9 + len;
  const ok = (d) => {
    const x = it.x + Math.cos(d) * reach;
    const y = it.y + Math.sin(d) * reach;
    return x > 0.4 && x < spec.w - 0.4 && y > 0.4 && y < spec.h - 0.4;
  };
  for (const turn of [0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) {
    if (ok(it.dir + turn)) return it.dir + turn;
  }
  return it.dir;
}

function arrowLine(x1, y1, x2, y2, dash) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 0.6;
  const hx1 = x2 - h * Math.cos(a - 0.45);
  const hy1 = y2 - h * Math.sin(a - 0.45);
  const hx2 = x2 - h * Math.cos(a + 0.45);
  const hy2 = y2 - h * Math.sin(a + 0.45);
  return `<g class="dg-arrow${dash ? ' dash' : ''}"><line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/><path d="M${n(hx1)} ${n(hy1)}L${n(x2)} ${n(y2)}L${n(hx2)} ${n(hy2)}"/></g>`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/** Returns {svg, legend[]} for a diagram spec, or null. */
export function renderDiagram(spec, { title = '' } = {}) {
  if (!spec || !spec.items) return null;
  const used = new Set();
  const parts = [];
  for (let it of spec.items) {
    switch (it.t) {
      case 'area': {
        const cls = it.pitch ? 'dg-pitch' : 'dg-zone';
        parts.push(`<rect class="${cls}${it.dash ? ' dash' : ''}" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" rx="${it.pitch ? 0.3 : 0.2}"/>`);
        if (it.label) parts.push(`<text class="dg-label" x="${n(it.x + it.w / 2)}" y="${n(it.y - 0.35)}" text-anchor="middle">${esc(tx(it.label))}</text>`);
        break;
      }
      case 'line':
        parts.push(`<line class="dg-line${it.dash ? ' dash' : ''}" x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}"/>`);
        break;
      case 'goal':
        used.add('goal');
        parts.push(`<rect class="dg-goal" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" rx="0.1"/>`);
        break;
      case 'cone':
        used.add('cone');
        parts.push(`<circle class="dg-cone" cx="${n(it.x)}" cy="${n(it.y)}" r="0.42" style="fill:${it.c || 'var(--gold)'}"/>`);
        break;
      case 'gate': {
        used.add('gate');
        const vertical = it.rot === 90;
        const dx = vertical ? 0 : 0.75;
        const dy = vertical ? 0.75 : 0;
        parts.push(`<circle class="dg-cone" cx="${n(it.x - dx)}" cy="${n(it.y - dy)}" r="0.35" style="fill:var(--gold)"/><circle class="dg-cone" cx="${n(it.x + dx)}" cy="${n(it.y + dy)}" r="0.35" style="fill:var(--gold)"/>`);
        break;
      }
      case 'mark':
        parts.push(`<circle class="dg-mark" cx="${it.x}" cy="${it.y}" r="0.6" style="fill:${it.c}"/>`);
        break;
      case 'coach':
        used.add('coach');
        parts.push(`<rect class="dg-coach" x="${n(it.x - 0.65)}" y="${n(it.y - 0.65)}" width="1.3" height="1.3" rx="0.15"/>`);
        break;
      case 'ball':
        used.add('ball');
        parts.push(`<circle class="dg-ball" cx="${n(it.x)}" cy="${n(it.y)}" r="0.32"/>`);
        break;
      case 'arrow':
        used.add(it.dash ? 'dash' : 'arrow');
        parts.push(arrowLine(it.x1, it.y1, it.x2, it.y2, it.dash));
        break;
      case 'p': {
        const c = it.c === 'orange' ? 'orange' : 'blue';
        used.add(c);
        if (it.dir != null && it.len !== 0) {
          const len = it.len ?? 2.4;
          it = { ...it, dir: inside(it, len, spec) };
          const sx = it.x + Math.cos(it.dir) * (R + 0.9);
          const sy = it.y + Math.sin(it.dir) * (R + 0.9);
          parts.push(arrowLine(sx, sy, sx + Math.cos(it.dir) * len, sy + Math.sin(it.dir) * len, false));
          used.add('arrow');
        }
        parts.push(`<circle class="dg-p ${c}" cx="${n(it.x)}" cy="${n(it.y)}" r="${R}"/>`);
        if (it.ball) {
          used.add('ball');
          const d = it.dir ?? 0;
          parts.push(`<circle class="dg-ball" cx="${n(it.x + Math.cos(d) * (R + 0.35))}" cy="${n(it.y + Math.sin(d) * (R + 0.35))}" r="0.32"/>`);
        }
        break;
      }
    }
  }
  const w = spec.w + PAD * 2;
  const h = spec.h + PAD * 2;
  const svg = `<svg class="diagram" viewBox="${-PAD} ${-PAD} ${w} ${h}" role="img" aria-label="${esc(title)}" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;

  const order = ['blue', 'orange', 'ball', 'cone', 'gate', 'goal', 'coach', 'arrow', 'dash'];
  const legend = order
    .filter((k) => used.has(k))
    .map((k) => ({ key: k, label: tx((spec.legend && spec.legend[k]) || LEGEND[k]) }));
  return { svg, legend, lang: getLang() };
}

export function legendSwatch(key) {
  switch (key) {
    case 'blue':
    case 'orange':
      return `<svg viewBox="0 0 2 2" class="lg-sw"><circle class="dg-p ${key}" cx="1" cy="1" r="0.75"/></svg>`;
    case 'ball':
      return `<svg viewBox="0 0 2 2" class="lg-sw"><circle class="dg-ball" cx="1" cy="1" r="0.45"/></svg>`;
    case 'cone':
    case 'gate':
      return `<svg viewBox="0 0 2 2" class="lg-sw"><circle cx="1" cy="1" r="0.5" style="fill:var(--gold)"/></svg>`;
    case 'goal':
      return `<svg viewBox="0 0 2 2" class="lg-sw"><rect class="dg-goal" x="0.3" y="0.7" width="1.4" height="0.6"/></svg>`;
    case 'coach':
      return `<svg viewBox="0 0 2 2" class="lg-sw"><rect class="dg-coach" x="0.35" y="0.35" width="1.3" height="1.3" rx="0.15"/></svg>`;
    case 'arrow':
      return `<svg viewBox="0 0 3 2" class="lg-sw wide"><g class="dg-arrow ink"><line x1="0.2" y1="1" x2="2.6" y2="1"/><path d="M2.1 0.7L2.6 1L2.1 1.3"/></g></svg>`;
    case 'dash':
      return `<svg viewBox="0 0 3 2" class="lg-sw wide"><g class="dg-arrow dash ink"><line x1="0.2" y1="1" x2="2.6" y2="1"/><path d="M2.1 0.7L2.6 1L2.1 1.3"/></g></svg>`;
  }
  return '';
}
