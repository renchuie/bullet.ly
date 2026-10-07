// Living GCal planner (prototype: events/tasks come from fake data in mock-data.js)
(() => {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const START_HOUR = 6, END_HOUR = 23;
  const HOUR_H = 48;
  const MIN_TODO_ROWS = 7;
  const EMOJI = ["🌸", "⭐", "💖", "🍓", "☕", "📚", "✨", "🎀", "🌙", "🐱", "🍀", "✏️"];

  const HAND_FONTS = [
    "Caveat", "Patrick Hand", "Kalam", "Gaegu", "Nanum Pen Script", "Shadows Into Light",
    "Reenie Beanie", "Indie Flower", "Handlee", "Gochi Hand", "Architects Daughter",
    "Covered By Your Grace", "Just Another Hand", "Schoolbell", "Short Stack",
    "Sue Ellen Francisco", "Over the Rainbow", "Delicious Handrawn", "Mynerve",
    "Nothing You Could Do", "Homemade Apple", "Gloria Hallelujah",
  ];
  const BODY_FONTS = ["Patrick Hand", "Quicksand", "Nunito", "Kalam", "Gaegu", "Handlee", "Architects Daughter"];

  // bullet-journal task states; clicking the bullet cycles through them
  const STATES = [
    { id: "open", mark: "•" },
    { id: "done", mark: "✓" },
    { id: "migrate", mark: ">" },
    { id: "cancel", mark: "×" },
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

  const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmtHour = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 || h === 24 ? " AM" : " PM");
  const fmtTime = (t) => {
    const h = Math.floor(t), m = Math.round((t - h) * 60);
    return (h % 12 === 0 ? 12 : h % 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? "am" : "pm");
  };

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
  let focusNewTask = null; // date key whose "new to-do" box should get focus after a re-render
  const hiddenCals = new Set(load("hiddenCals", []));
  const calColor = Object.fromEntries(MOCK.calendars.map((c) => [c.id, c.color]));
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

  function renderTodos() {
    const row = $("todo-row");
    const tasks = loadTasks();
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
        mark.onclick = () => {
          const next = STATES[(STATES.findIndex((s) => s.id === t.state) + 1) % STATES.length];
          t.state = next.id; save("tasks2", tasks); renderTodos();
        };
        const txt = el("span", "txt", t.title);
        txt.onclick = () => {
          const input = el("input"); input.value = t.title;
          let finished = false;
          const finish = (commit) => {
            if (finished) return; finished = true;
            if (commit) {
              const v = input.value.trim();
              if (v) t.title = v; else tasks.splice(tasks.indexOf(t), 1);
              save("tasks2", tasks);
            }
            renderTodos();
          };
          input.onblur = () => finish(true);
          input.onkeydown = (e) => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); };
          txt.replaceWith(input); input.focus();
        };
        line.append(mark, txt);
        cell.append(line);
      });

      // the next blank ruled line is where you type a new to-do
      const newLine = el("div", "todo-line new");
      newLine.append(el("span", "mark", "•"));
      const input = el("input"); input.placeholder = "add to-do…";
      input.onkeydown = (e) => {
        if (e.key !== "Enter" || !input.value.trim()) return;
        tasks.push({ id: Date.now(), date: key, title: input.value.trim(), state: "open" });
        save("tasks2", tasks); focusNewTask = key; renderTodos();
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
      MOCK.allDay.filter((e) => e.day === i && !hiddenCals.has(e.cal)).forEach((e) => {
        const chip = el("div", "chip", e.title);
        chip.style.background = calColor[e.cal];
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
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const lab = el("div", "h", fmtHour(h));
      lab.style.top = (h - START_HOUR) * HOUR_H + "px";
      hours.append(lab);
    }
    tl.append(hours);

    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const col = el("div", "day-col" + (sameDay(d, now) ? " today" : ""));
      for (let h = START_HOUR; h <= END_HOUR; h++) {
        const line = el("div", "hline");
        line.style.top = (h - START_HOUR) * HOUR_H + "px";
        col.append(line);
      }
      const evs = MOCK.events.filter((e) => e.day === i && !hiddenCals.has(e.cal)).map((e) => ({ ...e }));
      layoutLanes(evs).forEach((e) => {
        const box = el("div", "event");
        box.style.top = (e.start - START_HOUR) * HOUR_H + "px";
        box.style.height = Math.max((e.end - e.start) * HOUR_H - 2, 20) + "px";
        box.style.left = (e.lane / e.lanes) * 100 + 1 + "%";
        box.style.width = 100 / e.lanes - 2 + "%";
        box.style.background = calColor[e.cal];
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
        td.onclick = () => { weekStart = startOfWeek(d); render(); };
        tr.append(td);
      }
      table.append(tr);
    }
    box.replaceChildren(title, table);
  }

  function renderCalList() {
    const ul = $("cal-list");
    ul.replaceChildren();
    MOCK.calendars.forEach((c) => {
      const li = el("li", hiddenCals.has(c.id) ? "off" : "");
      const sw = el("span", "swatch");
      sw.style.background = c.color; sw.style.borderColor = c.color;
      li.append(sw, el("span", null, c.name));
      li.onclick = () => {
        hiddenCals.has(c.id) ? hiddenCals.delete(c.id) : hiddenCals.add(c.id);
        save("hiddenCals", [...hiddenCals]);
        render();
      };
      ul.append(li);
    });
  }

  function renderGoals() {
    const ul = $("goals");
    const key = "goals:" + weekKey();
    const state = load(key, MOCK.goals.map((g) => ({ title: g, done: false })));
    ul.replaceChildren();
    state.forEach((g) => {
      const li = el("li", g.done ? "done" : "");
      li.append(el("span", null, g.done ? "✓" : "○"), el("span", null, g.title));
      li.onclick = () => { g.done = !g.done; save(key, state); renderGoals(); };
      ul.append(li);
    });
  }

  function renderHabits() {
    const box = $("habits");
    const key = "habits:" + weekKey();
    const state = load(key, {});
    box.replaceChildren();
    MOCK.habits.forEach((name) => {
      const wrap = el("div", "habit");
      wrap.append(el("div", "name", name));
      const days = el("div", "days");
      for (let i = 0; i < 7; i++) {
        const on = !!(state[name] && state[name][i]);
        const d = el("div", "d" + (on ? " on" : ""), on ? "✿" : "SMTWTFS"[i]);
        d.onclick = () => {
          state[name] = state[name] || {};
          state[name][i] = !state[name][i];
          save(key, state); renderHabits();
        };
        days.append(d);
      }
      wrap.append(days);
      box.append(wrap);
    });
  }

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

  function pointerDrag(handle, onStart, onMove, onEnd) {
    handle.onpointerdown = (ev) => {
      if (!decorating) return;
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

    let body, applySize;
    if (s.kind === "emoji") {
      body = el("div", "emoji", s.emoji);
      applySize = () => { body.style.fontSize = s.size + "px"; };
    } else if (s.kind === "img") {
      body = el("img", "photo");
      body.draggable = false;
      if (!s.alpha) body.classList.add("bordered");
      imageURL(s.imgId).then((u) => { if (u) body.src = u; else node.remove(); }).catch(() => node.remove());
      applySize = () => { body.style.width = s.w + "px"; };
    } else {
      body = el("div", "note", s.text);
      body.contentEditable = decorating ? "true" : "false";
      body.style.color = s.color;
      body.oninput = () => { s.text = body.innerText; persist(); };
      body.onpaste = (e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); };
      applySize = () => { body.style.fontSize = s.size + "px"; };
    }
    applySize();
    node.append(body);

    const del = el("div", "hdl h-del", "×"); del.title = "Remove";
    del.onclick = () => { list.splice(list.indexOf(s), 1); persist(); node.remove(); };
    const size = el("div", "hdl h-size", "⇲"); size.title = "Drag to resize";
    node.append(del, size);

    pointerDrag(size,
      (ev) => ({ x0: ev.clientX, start: s.kind === "img" ? s.w : s.size }),
      (m, c) => {
        const dx = m.clientX - c.x0;
        if (s.kind === "img") s.w = clamp(c.start + dx, 40, 700);
        else s.size = clamp(c.start + dx * 0.4, 12, 160);
        applySize();
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
    const list = load(stickerKey(), []);
    list.push({ x: 35 + Math.random() * 20, y: 25 + Math.random() * 20, ...item });
    save(stickerKey(), list);
    renderStickers();
    return list.length - 1;
  }

  async function renderTray() {
    const tray = $("tray");
    tray.replaceChildren();
    EMOJI.forEach((emoji) => {
      const b = el("button", "emo", emoji);
      b.onclick = () => addDeco({ kind: "emoji", emoji, size: 40 });
      tray.append(b);
    });
    tray.append(el("div", "sep"));

    // photos you've uploaded earlier
    let imgs = [];
    try { imgs = await dbDo("images", "readonly", (s) => s.getAll()); } catch {}
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
    const addPhoto = el("button", "pill", "＋ Photo");
    addPhoto.onclick = () => $("photo-file").click();
    tray.append(addPhoto, el("div", "sep"));

    const color = el("input"); color.type = "color"; color.value = load("noteColor", "#2b2b2b"); color.title = "Text color";
    color.oninput = () => save("noteColor", color.value);
    const addText = el("button", "pill", "Aa Text");
    addText.onclick = () => {
      addDeco({ kind: "text", text: "type here", size: 26, color: color.value });
      const notes = document.querySelectorAll(".deco-text .note");
      const last = notes[notes.length - 1];
      if (last) { last.focus(); document.getSelection().selectAllChildren(last); }
    };
    tray.append(addText, color, el("span", "hint", "drag to move · corner handles resize or remove"));
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
      if (!decorating) { // tidy up empty text boxes when you finish decorating
        const list = load(stickerKey(), []).filter((s) => s.kind !== "text" || s.text.trim());
        save(stickerKey(), list);
      }
      $("tray").hidden = !decorating;
      document.body.classList.toggle("decorating", decorating);
      $("sticker-toggle").classList.toggle("on", decorating);
      $("sticker-toggle").textContent = decorating ? "✓ Done" : "✿ Decorate";
      renderStickers();
    };
    renderTray();
  }

  // ---------- wiring ----------
  function render() {
    renderTitle(); renderHead(); renderTodos(); renderAllDay(); renderTimeline();
    renderMiniCal(); renderCalList(); renderGoals(); renderHabits(); renderStickers();
  }

  $("today-btn").onclick = () => { weekStart = startOfWeek(new Date()); render(); };
  $("prev-btn").onclick = () => { weekStart = addDays(weekStart, -7); render(); };
  $("next-btn").onclick = () => { weekStart = addDays(weekStart, 7); render(); };

  setupFonts();
  setupDecorating();
  render();
})();
