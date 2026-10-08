# Connecting Google Calendar and Tasks

bullet.ly talks to Google through **your own** Google Cloud project. It's free, takes about
10 minutes, and only you can use it. Nothing secret is stored in this repo: you paste a
*Client ID* into the extension and it stays in your browser.

## What the extension can do
| | Permission asked | Why |
|---|---|---|
| Google Calendar | view and **add** events (never edits or deletes) | show your events and let you create new ones |
| Google Tasks | read and write | show to-dos on each day, check them off, add and rename them |

(Editing and deleting events from the planner would need no extra permission, but they aren't built yet.)

## One-time setup
1. Load the extension in Firefox (see the main README) and click **Connect Google** in the top bar.
   The panel shows a **redirect URL**. Keep it handy.
2. Go to <https://console.cloud.google.com/> and **create a project** (name it anything).
3. **APIs & Services → Library**: enable **Google Calendar API** and **Google Tasks API**.
4. **OAuth consent screen** (called *Google Auth Platform* in newer Google Cloud versions):
   - User type: **External**.
   - Fill in the app name (e.g. "bullet.ly") and your email.
   - Under **Test users**, add your own Google account.
   - Under **Data Access** (or "Scopes"), add these three scopes:
     `https://www.googleapis.com/auth/calendar.events`,
     `https://www.googleapis.com/auth/calendar.calendarlist.readonly` and
     `https://www.googleapis.com/auth/tasks`.
5. **Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs**: paste the redirect URL from step 1.
6. Copy the **Client ID** (ends in `.apps.googleusercontent.com`), paste it into the panel and click
   **Save & sign in**. Google will warn the app isn't verified (it's your own app). Click
   **Advanced → Go to bullet.ly** and tick **both** permission boxes.

## If you connected before event creation existed
bullet.ly now asks for permission to add events. Add the scopes above in Google Cloud (Data Access), then use
the **Sign in again** button in the top bar and approve the new permission. Until then everything else keeps working;
adding an event will ask you to approve it the first time.

## Good to know
- **Weekly re-login:** while the Google app is in *Testing* mode, Google expires your consent about
  every 7 days. To stop that, open the consent screen settings and **Publish app** (still just for
  you; Google shows an "unverified" warning that you can click through).
- **Redirect URL changes?** It's derived from the extension ID in `manifest.json`
  (`living-gcal@example.local`, a name from before the rename; it is not shown anywhere and is best left alone). If you ever change that ID, add the new redirect URL in Google Cloud.
- **Hourly token:** access lasts about an hour and is renewed silently while you're signed in to
  Google in this Firefox profile. If the top bar says **Sign in again**, click it.
- **Only dated to-dos appear.** Google Tasks items without a due date aren't shown on the spread yet.
- **Bullet states:** Google Tasks only knows *open* and *done*. The *migrated* (>) and *cancelled* (×)
  bullets are remembered by the extension in this browser only.
- **Stickers, drawings, notes, habits and goals** are saved in this browser only (not in Google).
