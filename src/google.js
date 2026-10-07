// Google sign-in + Calendar / Tasks API calls for bullet.ly.
//
// Sign-in uses the "implicit" OAuth flow through Firefox's identity API, so the only thing you need
// is your own Client ID (no secret). Access tokens last about an hour; the extension renews them
// silently while you're still signed in to Google in this Firefox profile.
const GoogleApi = (() => {
  // Calendar is read-only for now; Tasks is read/write so you can check things off.
  const SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/tasks",
  ];
  const CAL = "https://www.googleapis.com/calendar/v3";
  const TASKS = "https://tasks.googleapis.com/tasks/v1";

  const available = typeof browser !== "undefined" && !!(browser.identity && browser.identity.launchWebAuthFlow);

  class AuthError extends Error {}

  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch {} };

  const clientId = () => lsGet("gClientId") || "";
  const setClientId = (id) => lsSet("gClientId", id.trim());
  const setEmail = (email) => lsSet("gEmail", email);
  const email = () => lsGet("gEmail") || "";
  const redirectUrl = () => (available ? browser.identity.getRedirectURL() : "");
  const isConfigured = () => !!clientId();
  const wasConnected = () => lsGet("gConnected") === "1";

  // ----- tokens -----
  let token = null, expiresAt = 0, inflight = null;
  try {
    const saved = JSON.parse(lsGet("gToken") || "null");
    if (saved && saved.expiresAt > Date.now() + 60000) { token = saved.token; expiresAt = saved.expiresAt; }
  } catch {}

  function authUrl(interactive) {
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    const p = new URLSearchParams({
      client_id: clientId(),
      response_type: "token",
      redirect_uri: redirectUrl(),
      scope: SCOPES.join(" "),
      include_granted_scopes: "true",
      state,
    });
    if (email()) p.set("login_hint", email());
    if (!interactive) p.set("prompt", "none"); // never show UI when renewing in the background
    return { url: "https://accounts.google.com/o/oauth2/v2/auth?" + p, state };
  }

  async function authorize(interactive) {
    if (!available) throw new AuthError("Google sign-in only works inside the Firefox extension.");
    if (!clientId()) throw new AuthError("Add your Google Client ID first.");
    const { url, state } = authUrl(interactive);
    let result;
    try {
      result = await browser.identity.launchWebAuthFlow({ url, interactive });
    } catch (e) {
      throw new AuthError(interactive ? "Sign-in was cancelled or blocked: " + (e && e.message ? e.message : e) : "Sign in needed");
    }
    const frag = new URLSearchParams(new URL(result).hash.slice(1));
    if (frag.get("error")) throw new AuthError("Google said: " + frag.get("error"));
    if (frag.get("state") !== state) throw new AuthError("The sign-in response didn't match. Please try again.");
    const granted = (frag.get("scope") || "").split(" ");
    if (!SCOPES.every((s) => granted.includes(s))) {
      throw new AuthError("Please tick every permission box on Google's screen (Calendar and Tasks), then try again.");
    }
    token = frag.get("access_token");
    expiresAt = Date.now() + (Number(frag.get("expires_in")) || 3600) * 1000;
    lsSet("gToken", JSON.stringify({ token, expiresAt }));
    lsSet("gConnected", "1");
    return token;
  }

  async function ensureToken() {
    if (token && Date.now() < expiresAt - 60000) return token;
    if (!inflight) inflight = authorize(false).finally(() => { inflight = null; });
    return inflight;
  }

  const signIn = () => authorize(true);

  async function signOut() {
    const t = token;
    token = null; expiresAt = 0;
    ["gToken", "gConnected", "gEmail"].forEach(lsDel);
    if (t) { try { await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(t), { method: "POST" }); } catch {} }
  }

  // ----- requests -----
  async function api(url, opts = {}, retry = true) {
    const t = await ensureToken();
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: { Authorization: "Bearer " + t, ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401 && retry) { token = null; expiresAt = 0; lsDel("gToken"); return api(url, opts, false); }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      let msg = (data && data.error && data.error.message) || res.statusText || "Request failed";
      if (res.status === 403 && /not been used|disabled|accessNotConfigured/i.test(msg)) {
        msg += " (Enable both the Google Calendar API and the Google Tasks API in your Google Cloud project.)";
      }
      throw new Error(msg);
    }
    return data;
  }

  const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)).toString();

  // ----- Calendar -----
  async function listCalendars() {
    const data = await api(`${CAL}/users/me/calendarList?${qs({ minAccessRole: "reader", maxResults: 250 })}`);
    return (data.items || []).map((c) => ({
      id: c.id,
      name: c.summaryOverride || c.summary || c.id,
      color: c.backgroundColor || "#cfcfc6",
      selected: !!c.selected,
      primary: !!c.primary,
      role: c.accessRole,
    }));
  }

  async function listEvents(calendarId, timeMin, timeMax) {
    const out = [];
    let pageToken;
    for (let page = 0; page < 5; page++) {
      const data = await api(`${CAL}/calendars/${encodeURIComponent(calendarId)}/events?${qs({
        singleEvents: "true", orderBy: "startTime", maxResults: 250, timeMin, timeMax, pageToken,
        fields: "nextPageToken,items(id,summary,status,start,end,htmlLink,eventType,attendees(self,responseStatus))",
      })}`);
      out.push(...(data.items || []));
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return out;
  }

  // ----- Tasks -----
  async function listTaskLists() {
    const data = await api(`${TASKS}/users/@me/lists?maxResults=100`);
    return data.items || [];
  }

  async function listTasks(listId, dueMin, dueMax) {
    const out = [];
    let pageToken;
    for (let page = 0; page < 5; page++) {
      const data = await api(`${TASKS}/lists/${encodeURIComponent(listId)}/tasks?${qs({
        showCompleted: "true", showHidden: "true", maxResults: 100, dueMin, dueMax, pageToken,
      })}`);
      out.push(...(data.items || []));
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return out;
  }

  const createTask = (listId, body) => api(`${TASKS}/lists/${encodeURIComponent(listId)}/tasks`, { method: "POST", body });
  const patchTask = (listId, taskId, body) => api(`${TASKS}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body });
  const deleteTask = (listId, taskId) => api(`${TASKS}/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });

  return {
    available, AuthError, SCOPES,
    clientId, setClientId, setEmail, email, redirectUrl, isConfigured, wasConnected,
    signIn, signOut,
    listCalendars, listEvents, listTaskLists, listTasks, createTask, patchTask, deleteTask,
  };
})();
