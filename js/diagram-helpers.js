// Small helpers for writing activity diagrams by hand.


function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Spread n players over a box on a jittered grid so they never overlap. */
export function spread(n, seed, box, extra = {}) {
  const rnd = mulberry32(seed);
  const cols = Math.ceil(Math.sqrt((n * box.w) / box.h));
  const rows = Math.ceil(n / cols);
  const cw = box.w / cols;
  const rh = box.h / rows;
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push({
      t: 'p',
      x: box.x + cw * (c + 0.25 + rnd() * 0.5),
      y: box.y + rh * (r + 0.25 + rnd() * 0.5),
      dir: rnd() * Math.PI * 2,
      ...extra,
    });
  }
  return out;
}

export const field = (w, h, extra = {}) => ({ t: 'area', x: 0, y: 0, w, h, pitch: true, ...extra });

