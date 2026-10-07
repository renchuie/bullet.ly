# Google Cloud: branding & publishing cheat sheet

Copy these into **Google Cloud Console → Google Auth Platform → Branding** (older UI: *OAuth consent screen*).

> **Before you start:** open `docs/privacy.html` and replace `YOUR-EMAIL-HERE` with an email you're happy
> to have on a public page. Then host the `docs/` folder somewhere public (see "Hosting the two pages").

| Field | What to enter |
|---|---|
| **App name** | `Living Planner` (see the note on the name below) |
| **User support email** | your Google account email (pick it from the dropdown) |
| **App logo** | upload `docs/logo-120.png` (120 × 120 PNG, well under the 1 MB limit) |
| **Application home page** | the public URL of `index.html` |
| **Application privacy policy link** | the public URL of `privacy.html` |
| **Application terms of service link** | optional. Leave blank. |
| **Authorized domains** | the domain of those links (e.g. `netlify.app`, `pages.dev`). Google may not accept a shared domain like `github.io`; if it complains, see "If Google rejects the domain". |
| **Developer contact information** | your email |

## About the app name
Google can reject names that look like they're made by or endorsed by Google. **"Living GCal" contains "GCal"**,
which is an abbreviation of a Google product name, so it's a likely reason for a rejection. The pages and logo
here use **Living Planner**. You can keep calling the extension "Living GCal" for yourself; only the name on
Google's consent screen needs to be safe. If you'd rather use another name, tell me and I'll update the pages.

## Hosting the two pages
They're plain static files, so any free static host works:
- **GitHub Pages** (free for *public* repos only; this repo is currently private). Make the repo public, then
  Settings → Pages → Deploy from a branch → choose the branch and the `/docs` folder.
  Your links become `https://<your-username>.github.io/living-gcal/` and `.../privacy.html`.
  (Safe to make public: no keys or secrets are stored in this repo. Your Client ID lives only in your browser.)
- **Netlify Drop** (<https://app.netlify.com/drop>): drag the `docs` folder onto the page. No account setup needed for a quick start.
- **Cloudflare Pages / Vercel**: connect a repo or upload the folder.

## Publishing the app (so you aren't signed out every 7 days)
Google Auth Platform → **Audience** → **Publish app** → confirm. Because you use sensitive scopes, Google will say the
app needs verification. For personal use you can ignore that: skip verification and just accept the
"unverified app" screen when you sign in (**Advanced → Go to Living Planner**). Unverified apps are capped
at 100 users, which is far more than you need.

## If you ever do submit for verification
You'd also need a short justification for each scope. Suggested wording:
- `calendar.readonly`: "Displays the user's calendar events in a weekly planner view. Events are only shown to the user in their own browser; nothing is stored or sent elsewhere."
- `tasks`: "Shows the user's to-dos on their due date and lets them mark tasks complete, add and rename tasks from the planner."

## If Google rejects the domain
Shared domains (`github.io`, `netlify.app`, …) often can't be verified as *authorized domains*. Options: leave
the field empty (it's only enforced during verification, not for unverified personal use), or use your own
domain (about $10/year) pointed at the static host.
