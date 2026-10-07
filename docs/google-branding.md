# Google Cloud: branding & publishing cheat sheet for bullet.ly

Copy these into **Google Cloud Console → Google Auth Platform → Branding** (older UI: *OAuth consent screen*).

> **Before you start:** open `docs/privacy.html` and replace `YOUR-EMAIL-HERE` with an email you're happy
> to have on a public page, then commit and push. Then turn on GitHub Pages (steps below).

| Field | What to enter |
|---|---|
| **App name** | `bullet.ly` |
| **User support email** | your Google account email (pick it from the dropdown) |
| **App logo** | upload `docs/logo-120.png` (120 × 120 PNG, well under the 1 MB limit) |
| **Application home page** | `https://renchuie.github.io/bullet.ly/` |
| **Application privacy policy link** | `https://renchuie.github.io/bullet.ly/privacy.html` |
| **Application terms of service link** | optional. Leave blank. |
| **Authorized domains** | `github.io` if Google accepts it, otherwise leave empty (see "If Google rejects the domain") |
| **Developer contact information** | your email |

## Turning on GitHub Pages (the repo is public now, so this is free)
1. Go to <https://github.com/renchuie/bullet.ly/settings/pages>.
2. **Source:** Deploy from a branch.
3. **Branch:** pick the branch that has the `docs` folder (currently `claude/vibrant-brahmagupta-zkku0p`),
   and set the folder to **`/docs`**. Click **Save**.
4. After a minute or two, open `https://renchuie.github.io/bullet.ly/`. You should see the bullet.ly homepage.
   Check `https://renchuie.github.io/bullet.ly/privacy.html` too. Google needs both to load before it will accept them.

(If you later merge into `main`, switch Pages to `main` + `/docs`.)

## About the name
`bullet.ly` looks a bit like a web address. If Google objects to the name on the consent screen, use
`bullet.ly planner` there instead. Only the name on Google's screen needs to match your homepage; the
extension itself can keep its name.

## Publishing the app (so you aren't signed out every 7 days)
Google Auth Platform → **Audience** → **Publish app** → confirm. Because you use sensitive scopes, Google will say the
app needs verification. For personal use you can skip that and just accept the "unverified app" screen when you
sign in (**Advanced → Go to bullet.ly**). Unverified apps are capped at 100 users, far more than you need.

## If you ever do submit for verification
You'd also need a short justification for each scope. Suggested wording:
- `calendar.readonly`: "Displays the user's calendar events in a weekly planner view. Events are only shown to the user in their own browser; nothing is stored or sent elsewhere."
- `tasks`: "Shows the user's to-dos on their due date and lets them mark tasks complete, add and rename tasks from the planner."

## If Google rejects the domain
Shared domains like `github.io` often can't be verified as *authorized domains*. Options: leave the field empty
(it's only enforced during verification, not for unverified personal use), or use your own domain (about $10/year)
pointed at GitHub Pages.
