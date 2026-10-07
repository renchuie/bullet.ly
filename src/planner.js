// bullet.ly planner (prototype: events/tasks come from fake data in mock-data.js)
(() => {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const START_HOUR = 6, END_HOUR = 23;
  const HOUR_H = 48;
  const MIN_TODO_ROWS = 7;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const EMOJI_QUICK = ["🌸", "⭐", "💖", "🍓", "☕", "📚", "✨", "🎀", "🌙", "🐱", "🍀", "✏️"];

  const HAND_FONTS = [
    "Caveat", "Patrick Hand", "Kalam", "Gaegu", "Nanum Pen Script", "Shadows Into Light",
    "Reenie Beanie", "Indie Flower", "Handlee", "Gochi Hand", "Architects Daughter",
    "Covered By Your Grace", "Just Another Hand", "Schoolbell", "Short Stack",
    "Sue Ellen Francisco", "Over the Rainbow", "Delicious Handrawn", "Mynerve",
    "Nothing You Could Do", "Homemade Apple", "Gloria Hallelujah",
  ];
  const BODY_FONTS = ["Patrick Hand", "Quicksand", "Nunito", "Kalam", "Gaegu", "Handlee", "Architects Daughter", "Inter"];

  const INK_COLORS = ["#2b2b2b", "#d94b5a", "#e8833a", "#3b82c4", "#3a9d6b", "#8a5cc6", "#8b5e3c", "#ffffff"];
  const MARKER_COLORS = ["#ffe14d", "#ff8fb1", "#7be0a1", "#7cc4ff", "#ffb066", "#c3a1ff"];
  const HILITE_COLORS = ["#fff3a3", "#ffd1dc", "#c9f0d2", "#cfe6ff", "#ffe0b8", "#e6d6ff"];

  // bullet-journal task states; clicking the bullet cycles through them
  const STATES = [
    { id: "open", mark: "•" },
    { id: "done", mark: "✓" },
    { id: "migrate", mark: ">" },
    { id: "cancel", mark: "×" },
  ];

  // Emoji picker: built from Unicode ranges so the whole single-character emoji set is covered.
  const EMOJI_CATS = [
    ["😀", "Smileys", [[0x1F600, 0x1F644], [0x1F910, 0x1F92F], [0x1F970, 0x1F97B], [0x1F9D0, 0x1F9D0]]],
    ["👋", "People & body", [[0x1F440, 0x1F450], [0x1F466, 0x1F487], [0x1F645, 0x1F64F], [0x1F918, 0x1F91F], [0x1F930, 0x1F93A], [0x1F9B0, 0x1F9BF], [0x1F9D1, 0x1F9DF]]],
    ["🐱", "Animals & nature", [[0x1F400, 0x1F43F], [0x1F980, 0x1F9AE], [0x1F331, 0x1F344], [0x1F490, 0x1F490], [0x1F300, 0x1F32C], [0x1F338, 0x1F33C]]],
    ["🍓", "Food & drink", [[0x1F32D, 0x1F37F], [0x1F950, 0x1F96F], [0x1F9C0, 0x1F9CB]]],
    ["⚽", "Activities", [[0x1F380, 0x1F3D3], [0x26BD, 0x26BE], [0x1F93B, 0x1F94F], [0x1F3F8, 0x1F3FA]]],
    ["🚗", "Travel & places", [[0x1F680, 0x1F6FF], [0x1F3D4, 0x1F3DF], [0x1F3E0, 0x1F3F0], [0x1F5FA, 0x1F5FF]]],
    ["💡", "Objects", [[0x1F4A1, 0x1F4FF], [0x1F50B, 0x1F52E], [0x1F5A5, 0x1F5A5], [0x231A, 0x231B], [0x23F0, 0x23F3], [0x1F9E0, 0x1F9FF], [0x1FA70, 0x1FAFF]]],
    ["💖", "Symbols", [[0x1F493, 0x1F4A0], [0x2600, 0x27BF], [0x2B05, 0x2B55], [0x1F500, 0x1F50A], [0x1F534, 0x1F53D], [0x1F7E0, 0x1F7EB], [0x1F90D, 0x1F90E], [0x1F5A4, 0x1F5A4]]],
  ];

  // ---------- tiny helpers ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const load = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  };
  const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const round1 = (v) => Math.round(v * 10) / 10;

  const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmtHour = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? " AM" : " PM");
  const fmtTime = (t) => {
    const h = Math.floor(t), m = Math.round((t - h) * 60);
    return (h % 12 === 0 ? 12 : h % 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? "am" : "pm");
  };

  // Swap a label for a text box. commit(value) gets the new text, "" if cleared, or null if cancelled.
  function inlineEdit(node, value, commit, placeholder) {
    const input = el("input");
    input.value = value;
    if (placeholder) input.placeholder = placeholder;
    let done = false;
    const finish = (ok) => { if (done) return; done = true; commit(ok ? input.value.trim() : null); };
    input.onblur = () => finish(true);
    input.onkeydown = (e) => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); };
    node.replaceWith(input);
    input.focus(); input.select();
  }

  // ---------- IndexedDB (photos + uploaded fonts are too big for localStorage) ----------
  const dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open("living-gcal", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("images", { keyPath: "id" });
        req.result.createObjectStore("fonts", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  });
  async function dbDo(store, mode, fn) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
    });
  }

  // ---------- state ----------
  let weekStart = startOfWeek(new Date());
  let decorating = false;
  let tool = "move"; // move | pen | marker | eraser
  let focusNewTask = null;
  const pen = { color: INK_COLORS[0], width: 3 };
  const marker = { color: MARKER_COLORS[0], width: 20 };
  // Where the calendar/tasks data comes from: fake demo data, or Google once you've connected.
  const store = {
    mode: "demo", calendars: MOCK.calendars, events: MOCK.events, allDay: MOCK.allDay,
    tasks: [], lists: null, calendarsLoaded: false,
    loading: false, error: "", needsSignIn: false, syncedAt: null,
  };
  let hiddenCals = new Set(load("hiddenCals", []));
  const hiddenKey = () => (store.mode === "google" ? "hiddenCalsG" : "hiddenCals");
  const colorOf = (id) => (store.calendars.find((c) => c.id === id) || {}).color || "#cfcfc6";
  let loadSeq = 0;
  const weekKey = () => dateKey(weekStart);

  // tasks are stored per calendar date (this is what Google Tasks will provide later)
  function loadTasks() {
    let tasks = load("tasks2", null);
    if (!tasks) {
      const base = startOfWeek(new Date());
      tasks = MOCK.tasks.map((t) => ({ id: t.id, date: dateKey(addDays(base, t.day)), title: t.title, state: t.done ? "done" : "open" }));
      save("tasks2", tasks);
    }
    return tasks;
  }

  // ---------- fonts ----------
  const userFonts = []; // { id, name, family }
  const fontStack = (name, kind) => `"${name}", ${kind === "hand" ? "cursive" : "system-ui, sans-serif"}`;

  function applyFonts() {
    const f = load("fonts", { hand: "Caveat", body: "Patrick Hand" });
    document.documentElement.style.setProperty("--hand", fontStack(f.hand, "hand"));
    document.documentElement.style.setProperty("--body", fontStack(f.body, "body"));
    return f;
  }

  function fillFontSelect(sel, names, current, kind) {
    sel.replaceChildren();
    const add = (name, label) => {
      const o = el("option", null, label || name);
      o.value = name; o.style.fontFamily = fontStack(name, kind);
      if (name === current) o.selected = true;
      sel.append(o);
    };
    names.forEach((n) => add(n));
    userFonts.forEach((u) => add(u.family, "★ " + u.name));
    sel.style.fontFamily = fontStack(current, kind);
  }

  function renderFontPanel() {
    const f = applyFonts();
    fillFontSelect($("hand-font"), HAND_FONTS, f.hand, "hand");
    fillFontSelect($("body-font"), BODY_FONTS, f.body, "body");
    fillNoteFontSelect();
  }

  async function registerUserFont(rec) {
    const family = "user-font-" + rec.id;
    const face = new FontFace(family, rec.buffer);
    await face.load();
    document.fonts.add(face);
    userFonts.push({ id: rec.id, name: rec.name, family });
  }

  async function setupFonts() {
    try {
      const recs = await dbDo("fonts", "readonly", (s) => s.getAll());
      for (const r of recs || []) { try { await registerUserFont(r); } catch {} }
    } catch {}
    renderFontPanel();

    $("hand-font").onchange = (e) => { const f = load("fonts", {}); f.hand = e.target.value; save("fonts", { body: "Patrick Hand", ...f }); renderFontPanel(); };
    $("body-font").onchange = (e) => { const f = load("fonts", {}); f.body = e.target.value; save("fonts", { hand: "Caveat", ...f }); renderFontPanel(); };
    $("font-btn").onclick = () => { $("font-panel").hidden = !$("font-panel").hidden; };
    $("font-upload-btn").onclick = () => $("font-file").click();
    $("font-file").onchange = async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        const rec = { id: Date.now(), name: file.name.replace(/\.[^.]+$/, ""), buffer: await file.arrayBuffer() };
        await registerUserFont(rec);
        await dbDo("fonts", "readwrite", (s) => s.put(rec));
        const f = load("fonts", { hand: "Caveat", body: "Patrick Hand" });
        f.hand = userFonts[userFonts.length - 1].family;
        save("fonts", f);
        renderFontPanel();
      } catch { alert("Sorry, that doesn't look like a font file I can use. Try a .ttf, .otf or .woff file."); }
    };
  }

  // ---------- rendering: header, to-dos, all-day, timeline ----------
  function renderTitle() {
    const end = addDays(weekStart, 6);
    const opts = { month: "long", year: "numeric" };
    $("title").textContent = weekStart.getMonth() === end.getMonth()
      ? weekStart.toLocaleDateString("en-US", opts)
      : weekStart.toLocaleDateString("en-US", { month: "short" }) + " – " + end.toLocaleDateString("en-US", opts);
  }

  function renderHead() {
    const head = $("week-head");
    head.replaceChildren(el("div"));
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const cell = el("div", sameDay(d, new Date()) ? "today" : "");
      cell.append(el("span", "num", String(d.getDate())), el("span", "dname", DAYS[i]));
      head.append(cell);
    }
  }

  // --- to-do data operations (demo = localStorage, google = Google Tasks) ---
  const taskExtra = () => load("taskExtra", {}); // "migrate"/"cancel" marks Google Tasks can't store
  function setExtra(id, state) {
    const all = taskExtra();
    if (state) all[id] = state; else delete all[id];
    save("taskExtra", all);
  }
  const localTaskOp = (t, fn) => {
    const all = loadTasks();
    const i = all.findIndex((a) => a.id === t.id);
    if (i >= 0) fn(all, i);
    save("tasks2", all);
    renderTodos();
  };

  function setTaskState(t, next) {
    if (store.mode !== "google") return localTaskOp(t, (all, i) => { all[i].state = next; });
    const prev = { state: t.state, gStatus: t.gStatus, extra: taskExtra()[t.id] };
    t.state = next;
    setExtra(t.id, next === "migrate" || next === "cancel" ? next : null);
    const gStatus = next === "done" ? "completed" : "needsAction";
    renderTodos();
    if (gStatus === t.gStatus) return;
    t.gStatus = gStatus;
    GoogleApi.patchTask(t.listId, t.id, gStatus === "completed" ? { status: "completed" } : { status: "needsAction", completed: null })
      .catch((e) => { t.state = prev.state; t.gStatus = prev.gStatus; setExtra(t.id, prev.extra); showError(e); renderTodos(); });
  }

  function renameTask(t, title) {
    if (store.mode !== "google") return localTaskOp(t, (all, i) => { all[i].title = title; });
    const prev = t.title;
    t.title = title;
    renderTodos();
    GoogleApi.patchTask(t.listId, t.id, { title }).catch((e) => { t.title = prev; showError(e); renderTodos(); });
  }

  function removeTask(t) {
    if (store.mode !== "google") return localTaskOp(t, (all, i) => { all.splice(i, 1); });
    store.tasks = store.tasks.filter((x) => x !== t);
    renderTodos();
    GoogleApi.deleteTask(t.listId, t.id).catch((e) => { store.tasks.push(t); showError(e); renderTodos(); });
  }

  function addTask(date, title) {
    if (store.mode !== "google") {
      const all = loadTasks();
      all.push({ id: Date.now(), date, title, state: "open" });
      save("tasks2", all);
      return renderTodos();
    }
    const listId = store.lists && store.lists[0] && store.lists[0].id;
    if (!listId) { showError(new Error("No Google Tasks list found yet. Try the sync button.")); return; }
    const t = { id: "tmp" + Date.now(), listId, date, title, state: "open", gStatus: "needsAction" };
    store.tasks.push(t);
    renderTodos();
    GoogleApi.createTask(listId, { title, due: `${date}T00:00:00.000Z` })
      .then((made) => { t.id = made.id; })
      .catch((e) => { store.tasks = store.tasks.filter((x) => x !== t); showError(e); renderTodos(); });
  }

  function renderTodos() {
    const row = $("todo-row");
    const tasks = store.mode === "google" ? store.tasks : loadTasks();
    const keys = Array.from({ length: 7 }, (_, i) => dateKey(addDays(weekStart, i)));
    const rows = Math.max(MIN_TODO_ROWS, ...keys.map((k) => tasks.filter((t) => t.date === k).length + 1));
    row.replaceChildren(el("div", null, "to-do"));

    keys.forEach((key) => {
      const cell = el("div");
      const mine = tasks.filter((t) => t.date === key);

      mine.forEach((t) => {
        const line = el("div", "todo-line s-" + t.state);
        const mark = el("button", "mark", (STATES.find((s) => s.id === t.state) || STATES[0]).mark);
        mark.title = "Click to change: open → done → migrated → cancelled";
        mark.onclick = () => setTaskState(t, STATES[(STATES.findIndex((s) => s.id === t.state) + 1) % STATES.length].id);
        const txt = el("span", "txt", t.title);
        txt.onclick = () => inlineEdit(txt, t.title, (v) => {
          if (v === null || v === t.title) return renderTodos();
          if (v) renameTask(t, v); else removeTask(t);
        });
        line.append(mark, txt);
        cell.append(line);
      });

      // the next blank line is where you type a new to-do
      const newLine = el("div", "todo-line new");
      newLine.append(el("span", "mark", "•"));
      const input = el("input"); input.placeholder = "add to-do…";
      input.onkeydown = (e) => {
        if (e.key !== "Enter" || !input.value.trim()) return;
        focusNewTask = key;
        addTask(key, input.value.trim());
      };
      newLine.append(input);
      cell.append(newLine);
      if (focusNewTask === key) setTimeout(() => input.focus(), 0);

      for (let i = mine.length + 1; i < rows; i++) {
        const filler = el("div", "todo-line filler");
        filler.append(el("span", "mark", "•"));
        cell.append(filler);
      }
      row.append(cell);
    });
    focusNewTask = null;
  }

  function renderAllDay() {
    const row = $("allday-row");
    row.replaceChildren(el("div", null, "all-day"));
    for (let i = 0; i < 7; i++) {
      const cell = el("div");
      store.allDay.filter((e) => e.day === i && !hiddenCals.has(e.cal)).forEach((e) => {
        const chip = el("div", "chip", e.title);
        chip.style.background = colorOf(e.cal);
        if (e.link) { chip.dataset.link = e.link; chip.style.cursor = "pointer"; chip.onclick = () => window.open(e.link, "_blank", "noopener"); }
        cell.append(chip);
      });
      row.append(cell);
    }
  }

  // Put overlapping events side by side instead of on top of each other.
  function layoutLanes(events) {
    const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
    const groups = [];
    for (const e of sorted) {
      const g = groups.find((grp) => grp.end > e.start);
      if (g) { g.items.push(e); g.end = Math.max(g.end, e.end); }
      else groups.push({ items: [e], end: e.end });
    }
    for (const g of groups) {
      const lanes = [];
      for (const e of g.items) {
        let lane = lanes.findIndex((end) => end <= e.start);
        if (lane === -1) { lane = lanes.length; lanes.push(0); }
        lanes[lane] = e.end;
        e.lane = lane;
      }
      g.items.forEach((e) => (e.lanes = lanes.length));
    }
    return sorted;
  }

  function renderTimeline() {
    const tl = $("timeline");
    tl.replaceChildren();
    const hours = el("div", "hours");
    // labels sit just under their hour line; the grid draws the lines itself
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const lab = el("div", "h", fmtHour(h));
      lab.style.top = (h - START_HOUR) * HOUR_H + "px";
      hours.append(lab);
    }
    tl.append(hours);

    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const col = el("div", "day-col" + (sameDay(d, now) ? " today" : ""));
      const evs = store.events
        .filter((e) => e.day === i && !hiddenCals.has(e.cal) && e.end > START_HOUR && e.start < END_HOUR)
        .map((e) => ({ ...e, start: Math.max(e.start, START_HOUR), end: Math.min(e.end, END_HOUR) }));
      layoutLanes(evs).forEach((e) => {
        const box = el("div", "event");
        box.style.top = (e.start - START_HOUR) * HOUR_H + "px";
        box.style.height = Math.max((e.end - e.start) * HOUR_H - 2, 20) + "px";
        box.style.left = (e.lane / e.lanes) * 100 + 1 + "%";
        box.style.width = 100 / e.lanes - 2 + "%";
        box.style.background = colorOf(e.cal);
        if (e.link) { box.dataset.link = e.link; box.title = "Open in Google Calendar"; box.onclick = () => { if (!decorating) window.open(e.link, "_blank", "noopener"); }; }
        box.append(el("div", "t", e.title), el("div", "time", fmtTime(e.start) + " – " + fmtTime(e.end)));
        col.append(box);
      });
      if (sameDay(d, now)) {
        const nowH = now.getHours() + now.getMinutes() / 60;
        if (nowH >= START_HOUR && nowH <= END_HOUR) {
          const line = el("div", "now-line");
          line.style.top = (nowH - START_HOUR) * HOUR_H + "px";
          col.append(line);
        }
      }
      tl.append(col);
    }
  }

  function renderMiniCal() {
    const box = $("mini-cal");
    const first = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const title = el("div", "mc-title", first.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    const table = el("table");
    const hr = el("tr");
    "SMTWTFS".split("").forEach((c) => hr.append(el("th", null, c)));
    table.append(hr);
    for (let r = 0; r < 6; r++) {
      const tr = el("tr");
      for (let c = 0; c < 7; c++) {
        const d = addDays(gridStart, r * 7 + c);
        const td = el("td");
        const cls = [];
        if (d.getMonth() === first.getMonth()) cls.push("cur-month");
        if (sameDay(startOfWeek(d), weekStart)) cls.push("in-week");
        if (sameDay(d, new Date())) cls.push("today");
        td.className = cls.join(" ");
        td.append(el("span", null, String(d.getDate())));
        td.style.cursor = "pointer";
        td.onclick = () => changeWeek(startOfWeek(d));
        tr.append(td);
      }
      table.append(tr);
    }
    box.replaceChildren(title, table);
  }

  function renderCalList() {
    const ul = $("cal-list");
    ul.replaceChildren();
    store.calendars.forEach((c) => {
      const li = el("li", hiddenCals.has(c.id) ? "off" : "");
      const sw = el("span", "swatch");
      sw.style.background = c.color; sw.style.borderColor = c.color;
      li.append(sw, el("span", null, c.name));
      li.onclick = () => {
        hiddenCals.has(c.id) ? hiddenCals.delete(c.id) : hiddenCals.add(c.id);
        save(hiddenKey(), [...hiddenCals]);
        render();
        if (store.mode === "google") loadWeekData(); // hidden calendars aren't downloaded
      };
      ul.append(li);
    });
  }

  // ---------- weekly goals & habits (both editable) ----------
  function renderGoals() {
    const ul = $("goals");
    const key = "goals2:" + weekKey();
    const goals = load(key, MOCK.goals.map((g, i) => ({ id: "g" + i, title: g, done: false })));
    ul.replaceChildren();
    goals.forEach((g) => {
      const li = el("li", g.done ? "done" : "");
      const mark = el("button", "mark", g.done ? "✓" : "○");
      mark.onclick = () => { g.done = !g.done; save(key, goals); renderGoals(); };
      const txt = el("span", "txt", g.title);
      txt.title = "Click to edit (clear the text to delete)";
      txt.onclick = () => inlineEdit(txt, g.title, (v) => {
        if (v !== null) { if (v) g.title = v; else goals.splice(goals.indexOf(g), 1); save(key, goals); }
        renderGoals();
      });
      li.append(mark, txt);
      ul.append(li);
    });
    const li = el("li");
    const add = el("button", "add-link", "+ Add goal");
    add.onclick = () => inlineEdit(add, "", (v) => {
      if (v) { goals.push({ id: "g" + Date.now(), title: v, done: false }); save(key, goals); }
      renderGoals();
    }, "new goal…");
    li.append(add);
    ul.append(li);
  }

  function renderHabits() {
    const box = $("habits");
    const stateKey = "habits:" + weekKey();
    const state = load(stateKey, {});
    const habits = load("habitList", MOCK.habits.map((n) => ({ id: n, name: n })));
    box.replaceChildren();

    habits.forEach((h) => {
      const wrap = el("div", "habit");
      const head = el("div", "hhead");
      const name = el("span", "name", h.name);
      name.title = "Click to rename";
      name.onclick = () => inlineEdit(name, h.name, (v) => {
        if (v) { h.name = v; save("habitList", habits); }
        renderHabits();
      });
      const del = el("button", "hdel", "×"); del.title = "Remove habit";
      del.onclick = () => {
        if (!confirm(`Remove the habit "${h.name}"?`)) return;
        habits.splice(habits.indexOf(h), 1); save("habitList", habits); renderHabits();
      };
      head.append(name, del);

      const days = el("div", "days");
      for (let i = 0; i < 7; i++) {
        const on = !!(state[h.id] && state[h.id][i]);
        const d = el("div", "d" + (on ? " on" : ""), on ? "✿" : "SMTWTFS"[i]);
        d.onclick = () => {
          state[h.id] = state[h.id] || {};
          state[h.id][i] = !state[h.id][i];
          save(stateKey, state); renderHabits();
        };
        days.append(d);
      }
      wrap.append(head, days);
      box.append(wrap);
    });

    const add = el("button", "add-link", "+ Add habit");
    add.onclick = () => inlineEdit(add, "", (v) => {
      if (v) { habits.push({ id: "h" + Date.now(), name: v }); save("habitList", habits); }
      renderHabits();
    }, "habit name…");
    box.append(add);
  }

  // ---------- rich text for text boxes ----------
  const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN", "DIV", "P", "BR", "FONT"]);
  const SAFE_STYLE_PROPS = /^(color|background-color|text-align|font-weight|font-style|text-decoration(-line)?|font-family|font-size)$/;
  const SAFE_VALUE = /^[#\w\s"',.()%-]+$/;
  function safeStyle(css) {
    return css.split(";").map((x) => x.trim()).filter((x) => {
      const i = x.indexOf(":");
      return i > 0 && SAFE_STYLE_PROPS.test(x.slice(0, i).trim()) && SAFE_VALUE.test(x.slice(i + 1).trim());
    }).join("; ");
  }
  // Rebuild saved note HTML keeping only harmless formatting tags and styles.
  function sanitizeInto(parent, src) {
    for (const n of src.childNodes) {
      if (n.nodeType === 3) parent.append(document.createTextNode(n.nodeValue));
      else if (n.nodeType === 1) {
        if (!ALLOWED_TAGS.has(n.tagName)) { sanitizeInto(parent, n); continue; }
        const c = document.createElement(n.tagName.toLowerCase());
        const st = n.getAttribute("style");
        if (st && safeStyle(st)) c.setAttribute("style", safeStyle(st));
        if (n.tagName === "FONT") for (const a of ["color", "face"]) {
          const v = n.getAttribute(a);
          if (v && SAFE_VALUE.test(v)) c.setAttribute(a, v);
        }
        sanitizeInto(c, n);
        parent.append(c);
      }
    }
  }
  function fillNote(node, html) {
    node.replaceChildren();
    sanitizeInto(node, new DOMParser().parseFromString(html || "", "text/html").body);
  }
  const noteIsEmpty = (html) => !new DOMParser().parseFromString(html || "", "text/html").body.textContent.trim();

  // ---------- decorations: emoji, photos, text ----------
  // Positions are stored as percentages of the spread so they survive window resizes.
  const imgURLs = new Map();
  async function imageURL(id) {
    if (imgURLs.has(id)) return imgURLs.get(id);
    const rec = await dbDo("images", "readonly", (s) => s.get(id));
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    imgURLs.set(id, url);
    return url;
  }

  // Shrink big photos so they stay light, keep transparency for PNG/WebP/GIF.
  async function addImage(file) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 700 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const alpha = file.type !== "image/jpeg";
    const blob = await new Promise((r) => canvas.toBlob(r, alpha ? "image/png" : "image/jpeg", 0.9));
    const id = "img" + Date.now() + Math.random().toString(36).slice(2, 6);
    await dbDo("images", "readwrite", (s) => s.put({ id, blob, alpha, name: file.name }));
    return id;
  }

  const stickerKey = () => "stickers:" + weekKey();
  const moveMode = () => decorating && tool === "move";

  // active text box (for the formatting bar)
  let activeNote = null;
  let savedRange = null;
  document.addEventListener("selectionchange", () => {
    if (!activeNote) return;
    const sel = getSelection();
    if (sel.rangeCount && activeNote.body.contains(sel.anchorNode)) { savedRange = sel.getRangeAt(0).cloneRange(); syncFontSelect(); }
  });

  function pointerDrag(handle, onStart, onMove, onEnd) {
    handle.onpointerdown = (ev) => {
      if (!moveMode()) return;
      ev.preventDefault(); ev.stopPropagation();
      handle.setPointerCapture(ev.pointerId);
      const ctx = onStart(ev);
      handle.onpointermove = (m) => onMove(m, ctx);
      handle.onpointerup = () => { handle.onpointermove = null; handle.onpointerup = null; onEnd(); };
    };
  }

  function buildDeco(s, list) {
    const persist = () => save(stickerKey(), list);
    const node = el("div", "deco deco-" + s.kind);
    node.style.left = s.x + "%"; node.style.top = s.y + "%";
    const applyRot = () => { node.style.transform = `rotate(${s.rot || 0}deg)`; };
    applyRot();

    let body, applySize, getSize, setSize, limits;
    if (s.kind === "emoji") {
      body = el("div", "emoji", s.emoji);
      applySize = () => { body.style.fontSize = s.size + "px"; };
      getSize = () => s.size; setSize = (v) => { s.size = v; }; limits = [14, 320];
    } else if (s.kind === "img") {
      body = el("img", "photo");
      body.draggable = false;
      if (!s.alpha) body.classList.add("bordered");
      imageURL(s.imgId).then((u) => { if (u) body.src = u; else node.remove(); }).catch(() => node.remove());
      applySize = () => { body.style.width = s.w + "px"; };
      getSize = () => s.w; setSize = (v) => { s.w = v; }; limits = [30, 900];
    } else {
      body = el("div", "note");
      fillNote(body, s.html);
      body.contentEditable = moveMode() ? "true" : "false";
      body.oninput = () => { s.html = body.innerHTML; persist(); };
      body.onpaste = (e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); };
      body.onfocus = () => setActiveNote({ body, s, persist });
      body.onblur = () => setTimeout(() => {
        if (activeNote && activeNote.body === body && document.activeElement !== body && !$("subbar").contains(document.activeElement)) setActiveNote(null);
      }, 0);
      applySize = () => { body.style.width = s.w + "px"; body.style.fontSize = s.size + "px"; };
      getSize = () => s.w; setSize = (v) => { s.w = v; }; limits = [60, 800];
    }
    applySize();
    node.append(body);

    const del = el("div", "hdl h-del", "×"); del.title = "Remove";
    del.onclick = () => { list.splice(list.indexOf(s), 1); persist(); if (activeNote && activeNote.body === body) setActiveNote(null); node.remove(); };
    const size = el("div", "hdl h-size", "⇲"); size.title = s.kind === "text" ? "Drag to resize the box" : "Drag to resize";
    const rot = el("div", "hdl h-rot", "↻"); rot.title = "Drag to rotate (hold Shift to snap)";
    node.append(del, size, rot);

    const center = () => { const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

    // resize by distance from the center, so it also works when rotated
    pointerDrag(size,
      (ev) => { const [cx, cy] = center(); return { cx, cy, d0: Math.hypot(ev.clientX - cx, ev.clientY - cy) || 1, v0: getSize() }; },
      (m, c) => {
        setSize(clamp(c.v0 * (Math.hypot(m.clientX - c.cx, m.clientY - c.cy) / c.d0), limits[0], limits[1]));
        applySize();
      }, persist);

    pointerDrag(rot,
      (ev) => { const [cx, cy] = center(); return { cx, cy, a0: Math.atan2(ev.clientY - cy, ev.clientX - cx), r0: s.rot || 0 }; },
      (m, c) => {
        let deg = c.r0 + ((Math.atan2(m.clientY - c.cy, m.clientX - c.cx) - c.a0) * 180) / Math.PI;
        if (m.shiftKey) deg = Math.round(deg / 15) * 15;
        s.rot = Math.round(deg * 10) / 10;
        applyRot();
      }, persist);

    // photos/emoji drag by their body; text boxes drag by a small handle so the text stays editable
    let grip = body;
    if (s.kind === "text") { grip = el("div", "hdl h-move", "✥"); grip.title = "Drag to move"; node.append(grip); }
    pointerDrag(grip,
      (ev) => {
        const rect = $("spread").getBoundingClientRect();
        return { rect, ox: ev.clientX - (rect.left + (s.x / 100) * rect.width), oy: ev.clientY - (rect.top + (s.y / 100) * rect.height) };
      },
      (m, c) => {
        s.x = clamp(((m.clientX - c.ox - c.rect.left) / c.rect.width) * 100, -5, 98);
        s.y = clamp(((m.clientY - c.oy - c.rect.top) / c.rect.height) * 100, -2, 99);
        node.style.left = s.x + "%"; node.style.top = s.y + "%";
      }, persist);
    return node;
  }

  function renderStickers() {
    const layer = $("sticker-layer");
    const list = load(stickerKey(), []);
    layer.replaceChildren(...list.map((s) => buildDeco(s, list)));
  }

  function addDeco(item) {
    if (tool !== "move") setTool("move"); // placing something always returns to Select
    const list = load(stickerKey(), []);
    list.push({ x: 35 + Math.random() * 20, y: 25 + Math.random() * 20, rot: 0, ...item });
    save(stickerKey(), list);
    renderStickers();
  }

  // ---------- drawing (pen, highlighter, eraser) ----------
  const inkKey = () => "ink:" + weekKey();
  function pathD(p) {
    if (p.length < 4) return `M${p[0]} ${p[1]} L${p[0] + 0.01} ${p[1]}`;
    let d = `M${p[0]} ${p[1]}`;
    for (let i = 2; i < p.length - 2; i += 2) d += ` Q${p[i]} ${p[i + 1]} ${(p[i] + p[i + 2]) / 2} ${(p[i + 1] + p[i + 3]) / 2}`;
    return d + ` L${p[p.length - 2]} ${p[p.length - 1]}`;
  }
  function strokePath(s) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathD(s.p));
    path.setAttribute("stroke", s.c);
    path.setAttribute("stroke-width", s.w);
    if (s.t === "marker") path.setAttribute("class", "marker");
    return path;
  }
  function renderInk() {
    $("ink-layer").replaceChildren(...load(inkKey(), []).map(strokePath));
  }

  function setupInk() {
    const svg = $("ink-layer");
    const erase = (e, rect) => {
      const list = load(inkKey(), []);
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const keep = list.filter((s) => {
        const r = 10 + s.w / 2;
        for (let i = 0; i < s.p.length; i += 2) {
          const dx = (s.p[i] / 1000) * rect.width - px, dy = (s.p[i + 1] / 1000) * rect.height - py;
          if (dx * dx + dy * dy < r * r) return false;
        }
        return true;
      });
      if (keep.length !== list.length) { save(inkKey(), keep); renderInk(); }
    };

    svg.onpointerdown = (ev) => {
      if (tool === "move") return;
      ev.preventDefault();
      svg.setPointerCapture(ev.pointerId);
      const rect = $("spread").getBoundingClientRect();
      const norm = (e) => [round1(((e.clientX - rect.left) / rect.width) * 1000), round1(((e.clientY - rect.top) / rect.height) * 1000)];
      const end = () => { svg.onpointermove = null; svg.onpointerup = null; };

      if (tool === "eraser") {
        erase(ev, rect);
        svg.onpointermove = (m) => erase(m, rect);
        svg.onpointerup = end;
        return;
      }
      const cfg = tool === "marker" ? marker : pen;
      const stroke = { t: tool, c: cfg.color, w: cfg.width, p: norm(ev) };
      const path = strokePath(stroke);
      svg.append(path);
      svg.onpointermove = (m) => {
        const [x, y] = norm(m);
        const n = stroke.p.length;
        const dx = ((x - stroke.p[n - 2]) / 1000) * rect.width, dy = ((y - stroke.p[n - 1]) / 1000) * rect.height;
        if (dx * dx + dy * dy < 2) return;
        stroke.p.push(x, y);
        path.setAttribute("d", pathD(stroke.p));
      };
      svg.onpointerup = () => {
        end();
        const list = load(inkKey(), []);
        list.push(stroke); save(inkKey(), list);
      };
    };
  }

  // ---------- dock: tray, text bar, draw bar, emoji panel ----------
  const toolbarBtn = (label, title, onclick, cls) => {
    const b = el("button", cls || "tb", label);
    b.title = title || "";
    b.onmousedown = (e) => e.preventDefault(); // keep the text selection while formatting
    b.onclick = onclick;
    return b;
  };
  const swatch = (color, onclick, on) => {
    const b = el("button", "sw" + (on ? " on" : "") + (color === "transparent" ? " none" : ""));
    if (color !== "transparent") b.style.background = color;
    b.onmousedown = (e) => e.preventDefault();
    b.onclick = onclick;
    return b;
  };

  function formatCmd(name, value) {
    if (!activeNote) return;
    activeNote.body.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(name, false, value);
    activeNote.s.html = activeNote.body.innerHTML;
    activeNote.persist();
    syncFontSelect();
  }

  function fillNoteFontSelect() {
    const sel = document.getElementById("note-font");
    if (!sel) return;
    sel.replaceChildren();
    const names = [...new Set([...HAND_FONTS, "Inter"])];
    names.forEach((n) => { const o = el("option", null, n); o.value = n; o.style.fontFamily = fontStack(n, "hand"); sel.append(o); });
    userFonts.forEach((u) => { const o = el("option", null, "★ " + u.name); o.value = u.family; sel.append(o); });
    syncFontSelect();
  }

  // show the font of the text under the cursor / selection
  function syncFontSelect() {
    const sel = document.getElementById("note-font");
    if (!sel) return;
    sel.selectedIndex = -1;
    if (!activeNote) return;
    const s = getSelection();
    let node = s.rangeCount ? s.anchorNode : null;
    if (node && node.nodeType === 3) node = node.parentElement;
    if (!node || !activeNote.body.contains(node)) node = activeNote.body;
    const first = getComputedStyle(node).fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const opt = [...sel.options].find((o) => o.value === first);
    if (opt) sel.value = first;
  }

  const group = (...kids) => { const g = el("div", "grp"); g.append(...kids); return g; };

  function buildTextBar() {
    const bar = $("textbar");
    const font = el("select"); font.id = "note-font"; font.title = "Font for the selected text";
    font.onchange = () => {
      if (!font.value || !activeNote) return;
      const chosen = font.value;
      activeNote.body.focus();
      if (savedRange) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
      formatCmd("fontName", chosen);
      font.value = chosen;
    };
    const sizeBtn = (label, delta, title) => toolbarBtn(label, title, () => {
      if (!activeNote) return;
      activeNote.s.size = clamp((activeNote.s.size || 24) + delta, 10, 120);
      activeNote.body.style.fontSize = activeNote.s.size + "px";
      activeNote.persist();
    });
    const bold = toolbarBtn("B", "Bold", () => formatCmd("bold"));
    const italic = toolbarBtn("I", "Italic", () => formatCmd("italic"));
    const under = toolbarBtn("U", "Underline", () => formatCmd("underline"));
    bold.style.fontWeight = "700"; italic.style.fontStyle = "italic"; under.style.textDecoration = "underline";
    bar.append(
      group(font, sizeBtn("A−", -2, "Smaller text"), sizeBtn("A+", 2, "Bigger text")),
      group(bold, italic, under),
      group(
        toolbarBtn("⇤", "Align left", () => formatCmd("justifyLeft")),
        toolbarBtn("↔", "Center", () => formatCmd("justifyCenter")),
        toolbarBtn("⇥", "Align right", () => formatCmd("justifyRight")),
      ),
      el("div", "break"),
      group(el("span", "lbl", "Color"), ...INK_COLORS.map((c) => swatch(c, () => formatCmd("foreColor", c)))),
      group(
        el("span", "lbl", "Highlight"),
        ...HILITE_COLORS.map((c) => swatch(c, () => formatCmd("hiliteColor", c))),
        swatch("transparent", () => formatCmd("hiliteColor", "transparent")),
      ),
    );
    fillNoteFontSelect();
  }

  function renderDrawBar() {
    const bar = $("drawbar");
    bar.replaceChildren();
    if (tool === "pen" || tool === "marker") {
      const cfg = tool === "marker" ? marker : pen;
      const colors = tool === "marker" ? MARKER_COLORS : INK_COLORS;
      colors.forEach((c) => bar.append(swatch(c, () => { cfg.color = c; renderDrawBar(); }, cfg.color === c)));
      const range = el("input"); range.type = "range";
      range.min = tool === "marker" ? 8 : 1; range.max = tool === "marker" ? 40 : 14; range.value = cfg.width;
      range.title = "Thickness";
      range.oninput = () => { cfg.width = +range.value; };
      bar.append(el("span", "lbl", "Thin"), range, el("span", "lbl", "Thick"));
    } else {
      bar.append(el("span", "lbl", "Drag over a drawing to erase it"));
    }
    bar.append(el("div", "sep"),
      toolbarBtn("↶ Undo", "Remove the last stroke", () => {
        const list = load(inkKey(), []); list.pop(); save(inkKey(), list); renderInk();
      }),
      toolbarBtn("Clear all", "Remove every drawing on this week", () => {
        if (confirm("Erase all drawings on this week?")) { save(inkKey(), []); renderInk(); }
      }));
  }

  function updateSubbar() {
    const drawing = tool !== "move";
    $("textbar").hidden = !(tool === "move" && activeNote);
    $("drawbar").hidden = !drawing;
    $("subbar").hidden = $("textbar").hidden && $("drawbar").hidden;
  }

  function setActiveNote(n) { activeNote = n; if (!n) savedRange = null; updateSubbar(); syncFontSelect(); }

  function setTool(t) {
    tool = t;
    for (const name of ["move", "pen", "marker", "eraser"]) document.body.classList.toggle("tool-" + name, name === t);
    if (t !== "move") setActiveNote(null);
    renderDrawBar();
    updateSubbar();
    renderStickers(); // text boxes are only editable in "move" mode
    renderTrayTools();
  }

  // emoji library
  let emojiCache = null;
  function emojiCategories() {
    if (emojiCache) return emojiCache;
    const isEmoji = /^\p{Emoji}$/u, isModifier = /\p{Emoji_Modifier}/u;
    const seen = new Set();
    emojiCache = EMOJI_CATS.map(([icon, name, ranges]) => {
      const items = [];
      for (const [a, b] of ranges) for (let cp = a; cp <= b; cp++) {
        if (seen.has(cp)) continue;
        const ch = String.fromCodePoint(cp);
        if (!isEmoji.test(ch) || isModifier.test(ch)) continue;
        seen.add(cp);
        items.push(ch + "️");
      }
      return { icon, name, items };
    });
    return emojiCache;
  }

  let emojiTab = 0;
  function pickEmoji(emoji) {
    const recent = [emoji, ...load("recentEmoji", []).filter((e) => e !== emoji)].slice(0, 30);
    save("recentEmoji", recent);
    addDeco({ kind: "emoji", emoji, size: 44 });
  }
  function renderEmojiPanel() {
    const panel = $("emoji-panel");
    const cats = [{ icon: "🕘", name: "Recently used", items: load("recentEmoji", []) }, ...emojiCategories()];
    emojiTab = Math.min(emojiTab, cats.length - 1);
    const tabs = el("div", "etabs");
    cats.forEach((c, i) => {
      const b = el("button", i === emojiTab ? "on" : "", c.icon);
      b.title = c.name;
      b.onclick = () => { emojiTab = i; renderEmojiPanel(); };
      tabs.append(b);
    });
    const grid = el("div", "egrid");
    cats[emojiTab].items.forEach((e) => { const b = el("button", null, e); b.onclick = () => pickEmoji(e); grid.append(b); });
    if (!cats[emojiTab].items.length) grid.append(el("p", "muted", "Nothing here yet. Emoji you use will show up here."));
    const paste = el("div", "epaste");
    const input = el("input"); input.placeholder = "Or type / paste any emoji (Win + . or Ctrl + Cmd + Space)";
    const add = el("button", "pill", "Add");
    const submit = () => { const v = input.value.trim(); if (v) { pickEmoji(v); input.value = ""; } };
    add.onclick = submit; input.onkeydown = (e) => { if (e.key === "Enter") submit(); };
    paste.append(input, add);
    panel.replaceChildren(tabs, el("p", "ename", cats[emojiTab].name), grid, paste);
  }

  function renderTrayTools() {
    document.querySelectorAll("#tray [data-tool]").forEach((b) => b.classList.toggle("on", b.dataset.tool === tool));
  }

  async function renderTray() {
    const tray = $("tray");
    tray.replaceChildren();
    [["move", "☝ Select"], ["pen", "✏️ Pen"], ["marker", "🖍 Highlighter"], ["eraser", "⌫ Eraser"]].forEach(([id, label]) => {
      const b = el("button", "pill" + (tool === id ? " on" : ""), label);
      b.dataset.tool = id;
      b.title = id === "move" ? "Move, resize and edit decorations" : "Click again to switch the tool off";
      b.onclick = () => setTool(tool === id && id !== "move" ? "move" : id);
      tray.append(b);
    });
    tray.append(el("div", "sep"));

    const addText = el("button", "pill", "Aa Text");
    addText.onclick = () => {
      addDeco({ kind: "text", html: "type here", size: 24, w: 220 });
      const notes = document.querySelectorAll(".deco-text .note");
      const last = notes[notes.length - 1];
      if (last) { last.focus(); getSelection().selectAllChildren(last); }
    };
    const addPhoto = el("button", "pill", "＋ Photo");
    addPhoto.onclick = () => $("photo-file").click();
    tray.append(addText, addPhoto, el("div", "sep"));

    EMOJI_QUICK.forEach((emoji) => {
      const b = el("button", "emo", emoji);
      b.onclick = () => addDeco({ kind: "emoji", emoji, size: 44 });
      tray.append(b);
    });
    const more = el("button", "pill", "😀 All emoji");
    more.onclick = () => {
      const panel = $("emoji-panel");
      panel.hidden = !panel.hidden;
      if (!panel.hidden) renderEmojiPanel();
    };
    tray.append(more);

    // photos you've uploaded earlier
    let imgs = [];
    try { imgs = await dbDo("images", "readonly", (s) => s.getAll()); } catch {}
    if (imgs && imgs.length) tray.append(el("div", "sep"));
    for (const rec of imgs || []) {
      const wrap = el("div", "thumb");
      const img = el("img"); img.title = rec.name || "photo";
      imageURL(rec.id).then((u) => { if (u) img.src = u; });
      img.onclick = () => addDeco({ kind: "img", imgId: rec.id, w: 140, alpha: rec.alpha });
      const x = el("button", "x", "×"); x.title = "Delete from my photos";
      x.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Delete this photo from your sticker library? (Copies already on a week will disappear too.)")) return;
        await dbDo("images", "readwrite", (s) => s.delete(rec.id));
        imgURLs.delete(rec.id);
        renderTray(); renderStickers();
      };
      wrap.append(img, x);
      tray.append(wrap);
    }
  }

  function setupDecorating() {
    $("photo-file").onchange = async (e) => {
      const files = [...e.target.files];
      e.target.value = "";
      for (const f of files) {
        try { await addImage(f); } catch { alert(`Couldn't read "${f.name}" as an image.`); }
      }
      renderTray();
    };
    $("sticker-toggle").onclick = () => {
      decorating = !decorating;
      if (!decorating) {
        setTool("move");
        setActiveNote(null);
        $("emoji-panel").hidden = true;
        // tidy up empty text boxes when you finish decorating
        save(stickerKey(), load(stickerKey(), []).filter((s) => s.kind !== "text" || !noteIsEmpty(s.html)));
      }
      $("dock").hidden = !decorating;
      document.body.classList.toggle("decorating", decorating);
      $("sticker-toggle").classList.toggle("on", decorating);
      $("sticker-toggle").textContent = decorating ? "✓ Done" : "✿ Decorate";
      renderStickers();
    };
    buildTextBar();
    renderDrawBar();
    renderTray();
    setupInk();
  }

  // ---------- Google connection ----------
  function showError(e) {
    console.error(e);
    store.error = (e && e.message) || String(e);
    updateStatus();
  }

  function updateStatus() {
    const st = $("sync-status"), btn = $("google-btn"), refresh = $("refresh-btn");
    const google = store.mode === "google";
    btn.textContent = google ? "Google" : "Connect Google";
    btn.classList.toggle("connected", google);
    refresh.hidden = !google;
    st.className = "sync";
    st.style.cssText = "";
    st.onclick = null; st.title = "";
    if (!google) {
      st.textContent = GoogleApi.available ? "Demo data" : "Preview with demo data";
    } else if (store.needsSignIn) {
      st.textContent = "Sign in again";
      st.className = "sync err";
      st.style.cssText = "background:#ffe9ec;border:1.5px solid #d96c7a;border-radius:999px;padding:4px 12px;color:#2b2b2b";
      st.title = store.error;
    } else if (store.loading) {
      st.textContent = "Syncing…";
    } else if (store.error) {
      st.textContent = "⚠ " + (store.error.length > 60 ? store.error.slice(0, 57) + "…" : store.error);
      st.className = "sync err";
      st.title = store.error;
    } else if (store.syncedAt) {
      st.textContent = "Synced " + store.syncedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else {
      st.textContent = "";
    }
    if (store.needsSignIn) { st.style.cursor = "pointer"; st.onclick = () => connectGoogle(); }
    else st.style.cursor = "";
  }

  function mapEvent(calId, e, events, allDay) {
    if (e.status === "cancelled" || e.eventType === "workingLocation") return;
    if ((e.attendees || []).some((a) => a.self && a.responseStatus === "declined")) return;
    const title = e.summary || "(no title)";
    const link = e.htmlLink;
    if (e.start && e.start.dateTime) {
      const s = new Date(e.start.dateTime), en = new Date(e.end.dateTime);
      for (let i = 0; i < 7; i++) {
        const dayStart = addDays(weekStart, i), dayEnd = addDays(weekStart, i + 1);
        if (s < dayEnd && en > dayStart) {
          events.push({
            day: i, title, cal: calId, link,
            start: (Math.max(s, dayStart) - dayStart) / 36e5,
            end: (Math.min(en, dayEnd) - dayStart) / 36e5,
          });
        }
      }
    } else if (e.start && e.start.date) {
      const s = new Date(e.start.date + "T00:00:00"), en = new Date(e.end.date + "T00:00:00"); // end is exclusive
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        if (d >= s && d < en) allDay.push({ day: i, title, cal: calId, link });
      }
    }
  }

  async function loadWeekData() {
    if (store.mode !== "google") { updateStatus(); return; }
    const seq = ++loadSeq;
    store.loading = true; store.error = ""; store.needsSignIn = false;
    updateStatus();
    try {
      if (!store.calendarsLoaded) {
        store.calendars = await GoogleApi.listCalendars();
        store.calendarsLoaded = true;
        const primary = store.calendars.find((c) => c.primary);
        if (primary) GoogleApi.setEmail(primary.id);
        const saved = load("hiddenCalsG", null);
        hiddenCals = new Set(saved || store.calendars.filter((c) => !c.selected).map((c) => c.id)); // match what Google shows
        save("hiddenCalsG", [...hiddenCals]);
      }
      if (!store.lists) store.lists = await GoogleApi.listTaskLists();

      const timeMin = weekStart.toISOString(), timeMax = addDays(weekStart, 7).toISOString();
      const dueMin = `${dateKey(weekStart)}T00:00:00.000Z`, dueMax = `${dateKey(addDays(weekStart, 7))}T00:00:00.000Z`;
      let failed = 0;
      const [calResults, taskResults] = await Promise.all([
        Promise.all(store.calendars.filter((c) => !hiddenCals.has(c.id)).map((c) =>
          GoogleApi.listEvents(c.id, timeMin, timeMax).then((items) => ({ c, items })).catch((e) => {
            if (e instanceof GoogleApi.AuthError) throw e;
            failed++; return { c, items: [] };
          }))),
        Promise.all(store.lists.map((l) =>
          GoogleApi.listTasks(l.id, dueMin, dueMax).then((items) => items.map((t) => ({ ...t, listId: l.id }))))),
      ]);
      if (seq !== loadSeq) return; // you've moved to a different week since

      const events = [], allDay = [];
      calResults.forEach(({ c, items }) => items.forEach((e) => mapEvent(c.id, e, events, allDay)));
      const extra = taskExtra();
      store.events = events; store.allDay = allDay;
      store.tasks = taskResults.flat().filter((t) => !t.deleted && t.due).map((t) => ({
        id: t.id, listId: t.listId, date: t.due.slice(0, 10), title: t.title || "(untitled)",
        gStatus: t.status, state: t.status === "completed" ? "done" : extra[t.id] || "open",
      }));
      store.syncedAt = new Date();
      if (failed) store.error = `${failed} calendar${failed > 1 ? "s" : ""} couldn't be loaded`;
    } catch (e) {
      if (seq !== loadSeq) return;
      store.error = e.message;
      store.needsSignIn = e instanceof GoogleApi.AuthError;
    } finally {
      if (seq === loadSeq) { store.loading = false; updateStatus(); renderData(); }
    }
  }

  function clearWeekData() { store.events = []; store.allDay = []; store.tasks = []; }

  function enterGoogleMode() {
    store.mode = "google";
    store.calendars = []; store.calendarsLoaded = false; store.lists = null;
    clearWeekData();
    hiddenCals = new Set(load("hiddenCalsG", []));
    render();
    loadWeekData();
  }

  function leaveGoogleMode() {
    store.mode = "demo";
    store.calendars = MOCK.calendars; store.events = MOCK.events; store.allDay = MOCK.allDay; store.tasks = [];
    store.error = ""; store.needsSignIn = false; store.syncedAt = null;
    hiddenCals = new Set(load("hiddenCals", []));
    render();
  }

  async function connectGoogle() {
    try {
      await GoogleApi.signIn();
    } catch (e) {
      showError(e);
      renderGooglePanel(e.message);
      $("google-panel").hidden = false;
      return;
    }
    $("google-panel").hidden = true;
    enterGoogleMode();
  }

  let editingClient = false;
  function renderGooglePanel(message) {
    const panel = $("google-panel");
    panel.replaceChildren(el("h2", null, "Google Calendar & Tasks"));
    const msg = () => message && panel.append(el("div", "msg", message));

    if (!GoogleApi.available) {
      panel.append(el("p", null, "Google sign-in only works inside the Firefox extension. You're previewing the page directly, so you're seeing demo data. Load it as an add-on (see the README) to connect."));
      return;
    }

    const connected = store.mode === "google";
    if (connected && !editingClient) {
      panel.append(el("p", null, "Connected. Events are read from your Google Calendars and to-dos come from Google Tasks, so checking things off here updates Google Tasks too."));
      panel.append(el("p", "muted", "Only to-dos that have a due date show up on the spread. Calendars are shown the same way Google Calendar shows them (use the calendar list on the left to turn them on or off)."));
      msg();
      const row = el("div", "row");
      const out = el("button", "pill", "Disconnect");
      out.onclick = async () => { await GoogleApi.signOut(); leaveGoogleMode(); renderGooglePanel(); updateStatus(); };
      const change = el("button", "pill", "Change Client ID");
      change.onclick = () => { editingClient = true; renderGooglePanel(); };
      row.append(out, change);
      panel.append(row);
      return;
    }

    if (GoogleApi.isConfigured() && !editingClient) {
      panel.append(el("p", null, "Your Client ID is saved. Click below to sign in with Google."));
      msg();
      const row = el("div", "row");
      const go = el("button", "pill on", "Sign in with Google"); go.onclick = connectGoogle;
      const change = el("button", "pill", "Change Client ID"); change.onclick = () => { editingClient = true; renderGooglePanel(); };
      row.append(go, change);
      panel.append(row);
      return;
    }

    // first-time setup
    const redirect = GoogleApi.redirectUrl();
    const steps = el("ol");
    const li = (html) => { const x = el("li"); x.innerHTML = html; steps.append(x); return x; };
    li('Open <b>console.cloud.google.com</b> and create a project (any name).');
    li('Go to <b>APIs &amp; Services → Library</b> and enable <b>Google Calendar API</b> and <b>Google Tasks API</b>.');
    li('Set up the <b>OAuth consent screen</b> (type <b>External</b>) and add your own Google account as a <b>test user</b>.');
    li('Go to <b>Credentials → Create credentials → OAuth client ID</b>, choose <b>Web application</b>, and add this under <b>Authorized redirect URIs</b>:');
    const box = el("code", "copybox", redirect);
    steps.lastChild.append(box);
    const copy = el("button", "pill", "Copy redirect URL");
    copy.onclick = async () => { try { await navigator.clipboard.writeText(redirect); copy.textContent = "Copied ✓"; } catch { copy.textContent = "Select and copy it manually"; } };
    steps.lastChild.append(copy);
    li('Copy the <b>Client ID</b> Google gives you and paste it here:');
    panel.append(steps);

    const input = el("input"); input.type = "text"; input.placeholder = "123456789-abc….apps.googleusercontent.com";
    input.value = GoogleApi.clientId();
    panel.append(input);
    msg();
    const row = el("div", "row");
    const go = el("button", "pill on", "Save & sign in");
    go.onclick = () => {
      const v = input.value.trim();
      if (!/\.apps\.googleusercontent\.com$/.test(v)) { renderGooglePanel("That doesn't look like a Client ID. It should end in .apps.googleusercontent.com"); return; }
      GoogleApi.setClientId(v); editingClient = false; connectGoogle();
    };
    row.append(go);
    if (editingClient) { const cancel = el("button", "pill", "Cancel"); cancel.onclick = () => { editingClient = false; renderGooglePanel(); }; row.append(cancel); }
    panel.append(row);
    panel.append(el("p", "muted", "Tip: in Google's \"testing\" mode you'll be asked to sign in again about once a week. Publishing the app (still just for you) removes that."));
  }

  function setupGoogle() {
    $("google-btn").onclick = () => {
      const panel = $("google-panel");
      panel.hidden = !panel.hidden;
      if (!panel.hidden) { editingClient = false; renderGooglePanel(); }
    };
    $("refresh-btn").onclick = () => loadWeekData();
    // keep data fresh
    setInterval(() => { if (!document.hidden && store.mode === "google" && !store.loading) loadWeekData(); }, 5 * 60 * 1000);
    window.addEventListener("focus", () => {
      if (store.mode === "google" && !store.loading && store.syncedAt && Date.now() - store.syncedAt > 2 * 60 * 1000) loadWeekData();
    });
    updateStatus();
    if (GoogleApi.available && GoogleApi.isConfigured() && GoogleApi.wasConnected()) enterGoogleMode();
  }

  // ---------- wiring ----------
  function renderData() { renderTodos(); renderAllDay(); renderTimeline(); renderCalList(); }
  function render() {
    renderTitle(); renderHead(); renderData();
    renderMiniCal(); renderGoals(); renderHabits(); renderInk(); renderStickers();
    updateStatus();
  }

  const changeWeek = (d) => {
    setActiveNote(null); weekStart = d;
    if (store.mode === "google") clearWeekData();
    render();
    loadWeekData();
  };
  $("today-btn").onclick = () => changeWeek(startOfWeek(new Date()));
  $("prev-btn").onclick = () => changeWeek(addDays(weekStart, -7));
  $("next-btn").onclick = () => changeWeek(addDays(weekStart, 7));

  document.body.classList.add("tool-move");
  setupFonts();
  setupDecorating();
  render();
  setupGoogle();
})();
