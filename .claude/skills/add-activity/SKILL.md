---
name: add-activity
description: Add or change a built-in game or drill in the Royal Club activity library (text in Romanian and English, age range, rounds timer, coach calls, pitch diagram). Use when the user wants a new warm-up, drill, game or cool-down in the library, or wants an existing one changed.
---

# Add a library activity

Built-in activities live in two arrays:

- `js/library.js` → `BASE`: the games from the club's U7 PDF. Their ages are in `BASE_AGES` at the bottom of that array, not on the object.
- `js/library-more.js` → `MORE`: everything else. Put new activities here, with `ages` on the object.

## 1. Write the entry

```js
{
  id: 'kebab-case-unique',           // never change an id once released: plans point at it
  category: 'technical',             // arrival | warmup | technical | game | cooldown | break
  ages: [9, 12],                     // U9–U12
  duration: 8,                       // default minutes when added to a session
  skills: ['passing', 'first touch'],// English tags; each needs a Romanian name in SKILL_RO (js/library.js)
  title:   { en: '…', ro: '…' },
  summary: { en: 'One sentence.', ro: 'O propoziție.' },
  players: { en: 'Pairs', ro: 'Perechi' },
  space:   { en: '20 × 20 m', ro: '20 × 20 m' },
  equipment: { en: '…', ro: '…' },
  setup:  { en: '…', ro: '…' },
  howTo:  { en: '…', ro: '…' },
  coaching: [ { en: 'Short cue', ro: 'Indicație scurtă' } ],  // 3–5; the first one is printed in the schedule
  easier: { en: '…', ro: '…' },
  harder: { en: '…', ro: '…' },
  calls:  [ { en: 'Green!', ro: 'Verde!', color: '#1f9d55' } ], // optional coach-call buttons; color makes the full-screen flash that colour
  rounds: { count: 3, work: 60, rest: 30 },                     // optional, seconds; turns on the Rounds timer
  diagram: { w: 20, h: 20, items: [ /* see below */ ] },        // optional
}
```

Content guidelines:
- Write for a volunteer coach reading on a phone at the pitch: short sentences, the setup in one or two lines, coaching points of a few words each.
- Keep everyone active: no elimination, no queues longer than 3–4 children, spare balls ready.
- Make sure `duration` and `rounds` agree (count × work + (count − 1) × rest, in seconds, should be close to the minutes).
- Romanian: follow the `romanian-text` skill. Write the Romanian yourself in natural coaching language; do not translate word for word.
- Only original or generic drills. Don't copy text from other coaching manuals or brands.

## 2. Draw the diagram (optional but expected for anything on a pitch)

Units are metres; `w`/`h` is the drawing size. Import helpers from `./diagram-helpers.js`:

- `field(w, h)` – the green pitch rectangle. Always first.
- `spread(n, seed, {x, y, w, h}, { c: 'blue', ball: true })` – n players spread without overlapping, each with a random run direction. Add `len: 0` to hide the run arrows (e.g. juggling).

Item types:

| `t` | fields | draws |
|---|---|---|
| `area` | `x y w h`, `pitch`, `dash`, `label {en,ro}` | pitch or dashed zone |
| `line` | `x1 y1 x2 y2`, `dash` | chalk line |
| `p` | `x y`, `c` (`blue`/`orange`/`gold`), `ball`, `dir` (radians), `len` | player; with `dir` a run arrow, with `ball` a ball at their feet |
| `ball` | `x y` | ball |
| `cone` | `x y`, `c` (CSS colour) | cone |
| `gate` | `x y`, `rot` (0 or 90) | two cones 1.5 m apart |
| `goal` | `x y w h` | small goal |
| `coach` | `x y` | coach square |
| `arrow` | `x1 y1 x2 y2`, `dash` | pass/run (solid) or shot/dribble (dashed) |
| `mark` | `x y`, `c` | big coloured dot (e.g. traffic-light colours) |

`legend: { orange: {en, ro}, blue: {en, ro}, gold: {en, ro}, gate: {en, ro} }` renames legend entries (e.g. "Shark", "Defender"). The renderer flips run arrows that would leave the drawing; passes (`arrow`) are drawn as given, so keep them inside.

## 3. Check

1. `npm test`. It fails on missing Romanian, missing ages, unknown skill names or duplicate ids.
2. `npm start`, then look at the activity in a browser at 400 px wide: library card, detail page and diagram. Check it also prints: add it to a session and open *Print / PDF* (`node tests/e2e/features.cjs` writes sample PDFs to `e2e-shots/features/`).
3. Run `node tests/e2e/romanian.cjs`. It visits every activity in Romanian and lists English leftovers.
4. If you added a new JS file, add it to `FILES` in `sw.js` and bump `CACHE`.

If the activity belongs in a ready-made session, use the `session-template` skill.
