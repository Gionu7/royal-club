# Royal Club Coach

Session planner for the Royal Club youth football academy (Romania, U5–U12). Coaches build a training session from a library of games, then run it on the pitch one activity at a time: timer, coach calls, coaching points, attendance and notes on each child. It also prints plans as A4/PDF.

Users are coaches at the pitch on a phone, often outdoors, often with no signal. Romanian is the club's language.

## Stack and commands

Plain HTML/CSS/JavaScript ES modules. **No build step, no framework, no runtime npm dependencies.** Hosted as a static site on GitHub Pages. Club mode uses Supabase (auth + Postgres), loaded from a CDN only when configured.

```bash
npm start            # python3 -m http.server 8080
npm test             # node:test unit tests (timer, store, sync, i18n)
npm run test:db      # Supabase rules against a throwaway local Postgres (needs Postgres 16 binaries)
npm run e2e          # browser tests in tests/e2e (needs `npm start` running and Playwright)
npm run e2e:real     # real supabase-js against the real project in js/config.js
```

In Claude cloud sessions Playwright and Chromium are preinstalled globally (`NODE_PATH=/usr/local/lib/node_modules_global`); never run `playwright install`. If you add to `NODE_PATH`, append to it rather than replacing it.

## Map

| File | What it holds |
|---|---|
| `js/app.js` | All screens (functions returning HTML strings), routing, actions, permissions (`ROLE_CAN`, `NEEDS`, `can()`), live timer loop, boot |
| `js/library.js` | Activities from the club's U7 PDF, `BASE_AGES`, skill names (`SKILL_RO`), coaching reminders by age (`tipsFor`), session `TEMPLATES`, and `CLUB_PLANS`: the club's own sessions, given to every phone once (`addClubPlans` in `store.js`) while login is off |
| `js/library-more.js` | Activities for U5–U6 and U8–U12 (`MORE`) |
| `js/diagram.js`, `js/diagram-helpers.js` | Pitch diagrams drawn from data, in metres |
| `js/timer.js` | Countdown / stopwatch / rounds maths (timestamp based), beeps, vibration |
| `js/store.js` | State shape and pure operations: plans, blocks, players, notes, runs, backups, settings |
| `js/i18n.js` | Every interface string, `en` and `ro`; `t()`, `tx()` |
| `js/config.js` | `CLUB_MODE` switch, Supabase URL + publishable (anon) key. Club mode needs `CLUB_MODE = true` and both values; otherwise one-device mode |
| `js/cloud.js` | Club mode: login, profile/role, accounts, cache per user, push/pull loop |
| `js/sync.js` | Pure merge/diff rules and the `ACCESS` table per role |
| `supabase/schema.sql` | Tables, roles, row-level security, signup trigger, `ping()`. Re-runnable |
| `supabase/test/` | `run.sh` + `rls-test.sql`: what each role can and cannot do |
| `tests/*.test.js` | Unit tests. `tests/e2e/*.cjs` browser tests |
| `sw.js` | Offline cache. **Add new JS files to `FILES` and bump `CACHE`** |

## Rules that are easy to break

- **Two languages, Romanian first.** Every UI string goes in both `en` and `ro` in `js/i18n.js`; every library text is `{ en, ro }`. Tests fail otherwise. The app opens in Romanian unless the user picked English (`settings.langChosen`). Use the `romanian-text` skill for wording.
- **Escape everything** that goes into HTML with `esc()` (or `nl()` for multi-line). Views build strings with template literals.
- **Save through `commit()` / `persist(true)`**, never `S.save()` directly. In club mode `persist` writes settings locally and queues a sync; `S.save` would leak club data into the one-device storage key.
- **Text inputs bind on `input`, not `change`.** The `change` handler only runs `onBind` for checkboxes and selects. Handling text `change` (fired on blur) once redrew a list under the button being clicked, so the click was lost.
- **Permissions live in four places that must agree:** `supabase/schema.sql` (the real enforcement), `ACCESS` in `js/sync.js` (what each role reads and pushes), `ROLE_CAN` / `NEEDS` in `js/app.js` (what the screens show), and the fake server in `tests/e2e/club-mode.cjs`. Use the `change-permissions` skill.
- **Children's data stays with coaches.** Viewers (players/parents) must never receive players, runs or notes, not even in their device cache. Signing out clears the club cache.
- **Only the publishable/anon key belongs in the repo.** It is public by design. Never commit a `service_role` / secret key; refuse if asked.
- **Sync compares with `stable()`** (sorted-key JSON) because Postgres `jsonb` reorders keys. Plain `JSON.stringify` comparisons cause endless re-uploads.
- **CSS class names:** check `css/app.css` before adding a short or generic class. A legend-swatch class `.lg` once overrode `.btn.lg` and squashed the Start button into a circle. Colours come from tokens on `:root`, with dark values in both dark blocks. Category colours are `--c-<category>`.
- **Diagrams** are in metres; `spread()` places players without overlaps; the renderer turns run arrows around so they stay on the pitch. Player colours: `blue`, `orange`, `gold` (joker).
- **The timer is timestamp based** (`acc` + `since`), so it stays right when the phone sleeps. Leaving a step pauses that step's timer.
- **Hash routes are plain section names** (`#today`, `#sessions`, `#library`, `#players`, `#options`, `#run`); detail ids ride in `history.state`. Never use `#settings` (reserved by the claude.ai preview) or `#/path` hashes.

## Testing notes

- The single-device browser tests route `js/config.js` to empty values (`singleDevice()` in `tests/e2e/helpers.cjs`), because the real config now points at the club project. `english: true` makes them click English labels.
- `tests/e2e/romanian.cjs` flags lines with common English words. The word "start" is expected: it is also Romanian.
- Club-mode checks write data through an 0.8 s debounce: poll the fake database (`until()`), don't read it right after a click.
- `supabase/test/run.sh` runs Postgres as the `postgres` user when invoked as root, including the shutdown. A leftover server on the port makes the next run fail with "could not start server".
- After changing a rule in `schema.sql`, prove the test can fail: break the rule on purpose, run `npm run test:db`, restore.

## The club's Supabase project

- **Login is switched off for now** (`CLUB_MODE = false` in `js/config.js`): the user asked for every screen to be open without signing in until they add login later. Don't switch it on unless they ask. The club-mode browser tests force it on in their own copy of the config.
- URL `https://avyjgyztpxrvkpwrvbql.supabase.co` (ref `avyjgyztpxrvkpwrvbql`), set in `js/config.js`.
- In cloud sessions the host must be on the environment's allowed list (the personal environment `royal-club` has it). `cdn.jsdelivr.net` may be blocked there; `npm run e2e:real` can serve a local `@supabase/supabase-js@2.45.4` instead.
- Check setup status with the `supabase-setup` skill before telling the user something is or isn't configured. The publishable key cannot change the schema: running `schema.sql` and changing auth settings happen in the Supabase dashboard (by the user) unless they give a personal access token for the Management API.

## Preview on claude.ai

A private preview is published as a claude.ai artifact (one-device mode only, since the preview can't reach Supabase, print, or use a service worker). Use the `publish-preview` skill; it swaps `js/config.js` for an empty copy.
