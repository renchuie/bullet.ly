# bullet.ly

A Firefox extension that opens a bullet-journal style weekly planner for Google Calendar:
a weekly spread plus free-style **pages** (tabs on the right edge) that are exactly the same size, design blocks (boxes, washi tape, banners, lines), grid-paper spread, a bullet-journal to-do list (Google Tasks) above each day, a habit tracker on the side,
and decorations: emoji (full library), your own photos as stickers, rich text notes, and freehand pen/highlighter drawing. Fonts are changeable
(including your own uploaded font file).

**Status:** prototype. It shows demo data until you connect Google (see [docs/google-setup.md](docs/google-setup.md)).
Once connected, events come from Google Calendar (you can add new ones) and to-dos from Google Tasks (read/write).

## Try it in Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...** and pick `manifest.json`
3. Click the bullet.ly toolbar button

(Or just open `src/planner.html` in a browser to preview the layout.)

## Roadmap
1. Layout with fake data (done)
2. Google sign-in, read Calendar + Tasks, write Tasks (done)
3. Free-style pages, color mask, accent color (done)
4. Event details card and right-click menu (done)
5. Create events from the planner (done); edit and delete events
6. Save habits, stickers and pages to the cloud, themes
