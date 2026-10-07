# Living GCal

A Firefox extension that opens a bullet-journal style weekly planner for Google Calendar:
grid-paper spread, a bullet-journal to-do list (Google Tasks) above each day, a habit tracker on the side,
and decorations: emoji, your own photos as stickers, and free text notes. Fonts are changeable
(including your own uploaded font file).

**Status:** prototype. It runs on fake data (`src/mock-data.js`). Google sign-in is not wired up yet.

## Try it in Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...** and pick `manifest.json`
3. Click the Living GCal toolbar button

(Or just open `src/planner.html` in a browser to preview the layout.)

## Roadmap
1. Layout with fake data (done)
2. Google sign-in, read Calendar + Tasks
3. Write back: check off tasks, create/edit events
4. Save habits and stickers to the cloud, themes
