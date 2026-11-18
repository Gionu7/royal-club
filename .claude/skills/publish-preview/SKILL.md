---
name: publish-preview
description: Publish or update the private claude.ai preview of the Royal Club app (an Artifact running in one-device mode) so the user can try changes on their phone before they are deployed. Use after user-visible changes when working in a Claude session that has the Artifact tool, or when the user asks for a link to try the app.
---

# Publish the claude.ai preview

The preview is a claude.ai Artifact. It runs the same files as the repo, in **one-device mode** (no login), because a preview can't reach Supabase, register a service worker, open the print dialog, or start downloads. The app already detects the frame: Print shows a note, and service-worker registration is skipped on claude hosts.

1. **Page file:** artifacts are wrapped in their own `<!doctype html><head><body>`, so publish a fragment, not `index.html`. Keep it in the scratchpad:
   ```html
   <title>Royal Club Coach</title>
   <meta name="claude:viewport-fit-sides" content="cover">
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600;700&display=swap">
   <link rel="stylesheet" href="css/app.css">
   <div id="app"><p style="padding:24px">Se încarcă…</p></div>
   <script type="module" src="js/app.js"></script>
   ```
   Keep the title the same on every update.
2. **Empty config:** write a copy of `js/config.js` with `SUPABASE_URL = ''` and `SUPABASE_ANON_KEY = ''` to the scratchpad. Map the published `js/config.js` to that copy, never to the real one.
3. **Publish** with `files` mapping every published path to its source: `css/app.css` and every file in `js/` (currently `app.js i18n.js library.js library-more.js diagram-helpers.js diagram.js store.js timer.js cloud.js sync.js`, plus the empty `config.js`). List `js/` to catch new files. On an update, publish to the same page file path (or pass the existing URL) so the link stays the same, and omit `icon`.
4. **Tell the user** what changed. Preview data lives only in that browser. Club mode, printing and offline install work only on the deployed site (GitHub Pages).

If the user previously got a preview link, reuse it: list artifacts or ask for the URL rather than creating a new one.
