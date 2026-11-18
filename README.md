# Royal Club Coach

A session planner for the Royal Club youth football academy. Build a training session from a library of games and drills, then run it on the pitch, one activity at a time, with a timer, coaching points and quick notes on each child.

It runs in the browser on a phone, tablet or laptop, works offline once opened, and needs no server or account. The interface and the library are in **English and Romanian**.

## What it does

**Library.** 30 activities for U5 to U12: every game from the U7 plan PDF in this repo (*Plan de antrenament – academia de fotbal U7*), more for the youngest groups, and drills and games for U8–U12 (rondo 4 v 1, 1 v 1 to two gates, 2 v 1 to goal, give-and-go shooting, passing square, end-zone game, possession 4 v 4 + 2, 5 v 5 with keepers, dynamic warm-up, stretch and review). Each one has an age range, setup, how it works, coaching points, easier/harder versions, equipment, a pitch diagram and, where it helps, coach calls ("Sole!", "Green!", "Bunny hops!"). Filter by age group and category (arrival, warm-up, technique, game, finish, break) or search in either language. You can add your own activities, or copy a built-in one and edit it.

**Session builder.** Pick activities from the library, set the minutes for each block, reorder them, add water breaks and a note per block. The builder shows the running clock (0:00–0:05, 0:05–0:08 …), the total against your planned length and a colour bar of the session. The 60-minute U7 plan from the PDF is ready on first launch, and four templates (U5–U6 45 min, U7 60 min, U9–U10 75 min, U11–U12 90 min) give you a ready session for each age group. When you add activities to a session, the picker shows the ones that suit that session's age group first; you can switch it to any age.

**Print or save as PDF.** *Print / PDF* in the session builder lays the plan out as an A4 document: header, schedule table with the key coaching point for each block, an equipment checklist, a register of your players to tick off, one section per activity with its diagram, the coaching reminders for that age group and ruled lines for notes afterwards. Print it for the clipboard, or choose *Save as PDF* in the print window.

**On the pitch.** Press *Start session*:

1. **Who is here?** Tap the children who turned up (or add a new child on the spot).
2. **One screen per activity**, with **Back / Next** at the bottom:
   - a big timer: countdown, stopwatch, or **rounds** (e.g. 3 × 60 s with 30 s rest) that beeps and vibrates at each change; *+1 min*; a full-screen **Big timer** to show the kids
   - **coach calls** you can tap to flash full-screen in colour, or let the app pick one at random
   - coaching points, how it works, the diagram, setup, easier/harder
   - what's up next, plus coaching reminders for the session's age group (U5–U8 or U9–U12)
   - a session clock and a progress bar you can tap to jump to any block
3. **Players** button: tap a child, pick a quick tag ("Brave dribble", "Used weaker foot" …) or type a note. It is saved to their profile with the activity it happened in.
4. **Finish**: write how it went, then keep the summary with attendance and notes.

The screen stays awake during a session. Arrow keys move between activities and the space bar starts and stops the timer.

**Players.** Add children one at a time or paste a list ("Andrei, 7" puts the shirt number in). Each child has a profile with an "about" field (parent contact, medical notes), attendance across sessions and every note written about them.

**Backup.** Everything is stored on the device you use. In *Settings* you can download a backup file (or copy it as text) and restore it on another phone.

## Running it

It is a static site: plain HTML, CSS and JavaScript modules, with no build step.

```bash
npm start          # serves on http://localhost:8080 (python3 -m http.server)
npm test           # unit tests for the timer and the data store (Node 20+)
```

Open `http://localhost:8080` on your computer, or use the computer's local IP address to open it on your phone over the same Wi-Fi.

### Putting it online (GitHub Pages)

The workflow in `.github/workflows/pages.yml` publishes the site whenever `main` changes. Turn it on once in the repository settings: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The app then lives at `https://<owner>.github.io/royal-club/`. On a phone, open it and choose **Add to Home Screen** so it opens like an app and works without signal.

## Project layout

```
index.html            app shell
css/app.css           styles (light and dark themes)
js/app.js             screens, navigation and the live session runner
js/library.js         activities from the U7 PDF, age ranges, coaching reminders, session templates
js/library-more.js    activities for U5–U6 and U8–U12
js/diagram-helpers.js helpers for writing diagrams
js/diagram.js         draws the pitch diagrams from data
js/timer.js           countdown / stopwatch / rounds maths, beeps and vibration
js/store.js           plans, players, notes, sessions and backups (localStorage)
js/i18n.js            interface text in English and Romanian
sw.js                 offline cache
tests/                node:test unit tests
```

### Adding a built-in activity

Add an entry to `MORE` in `js/library-more.js`. Text fields take `{ en, ro }` and `ages: [min, max]` sets the age groups (e.g. `[9, 12]` for U9–U12). `rounds: { count, work, rest }` (in seconds) turns on the rounds timer, `calls` adds coach-call buttons (an optional `color` makes the flash that colour), and `diagram` places players, balls, cones, gates, goals and arrows in metres on a pitch. Players can be `blue`, `orange` or `gold` (jokers). `npm test` checks that every activity has both languages and an age range, and that every template adds up to its planned length.

## Limits

- Data lives in one browser on one device. Use the backup to move it, or to share it with another coach. Syncing between coaches would need a small backend.
- Activities you create yourself are stored in the language you typed them in.
