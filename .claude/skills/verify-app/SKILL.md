---
name: verify-app
description: Run and check the Royal Club app end to end before committing — unit tests, database rule tests, browser tests in one-device and club mode, Romanian crawl, screenshots at phone width. Use after any change to the app, before telling the user something works, or when asked to test, run or screenshot the app.
---

# Verify the app

Run these in order and report each result. Fix what fails before committing.

```bash
npm test                      # unit: timer, store, sync merge rules, translations
npm run test:db               # Supabase rules on a throwaway Postgres (skip only if no Postgres binaries; say so)
npm start                     # in the background; the browser tests need http://localhost:8080
node tests/e2e/single-device.cjs   # one coach, no club database: build, run, notes, finish, reload, RO dark, desktop
node tests/e2e/features.cjs        # age filter, templates, custom ages, print → PDFs in e2e-shots/features/
node tests/e2e/romanian.cjs        # every screen and activity in Romanian ("start" is allowed)
node tests/e2e/club-mode.cjs       # admin, coach, parent in three browsers against a fake Supabase (27 checks)
npm run e2e:real                   # real supabase-js + the real project: login screen, wrong password refused
```

Each browser test prints `ERRORS [...]` and exits non-zero on any failure. Screenshots go to `e2e-shots/<test>/`, which is ignored by git.

## Look, don't just count

Open the screenshots you touched (Read the PNG) at phone width (400 px) and, when layout changed, desktop (1280 px). Things this project has had wrong before:
- a button squashed by a CSS class clash
- arrows running off the pitch in diagrams
- English text on a Romanian screen
- account rows too cramped on a phone
- the fixed tab bar covering content

For print changes, read the generated PDF pages (`e2e-shots/features/*.pdf`).

## When a step fails

- **A click times out in an old test:** the app opens in Romanian by default. Tests that click English labels must call `singleDevice(ctx, { english: true })`.
- **The one-device tests show a login screen:** `js/config.js` points at the real club project; the tests must route it to empty values with `singleDevice()`.
- **`test:db` says "could not start server":** a previous Postgres is still running. Find it with `ps aux | grep "[p]ostgres -D"` and stop it as the postgres user: `su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D <dir> -m immediate stop"`.
- **A club-mode check reads the database too early:** syncing waits 0.8 s; use `until(() => …)`.
- **`e2e:real` can't load supabase-js** (CDN blocked): `npm install --no-save @supabase/supabase-js@2.45.4` and run again. If Supabase itself is blocked, see the `supabase-setup` skill.
- **Playwright is missing:** in cloud sessions it is global; keep `NODE_PATH=/usr/local/lib/node_modules_global` when adding paths. Never run `playwright install`.

Report honestly: which steps ran, which passed, what you looked at, and anything you could not run.
