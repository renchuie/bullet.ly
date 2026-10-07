// Living GCal planner (prototype: runs on fake data from mock-data.js)
(() => {
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const START_HOUR = 6, END_HOUR = 23;
  const HOUR_H = 48;
  const STICKERS = ["🌸", "⭐", "💖", "🍓", "☕", "📚", "✨", "🎀", "🌙", "🐱", "🍀", "✏️"];

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

  const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const weekKey = (d) => d.toISOString().slice(0, 10);
  const fmtHour = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 || h === 24 ? " AM" : " PM");
  const fmtTime = (t) => {
    const h = Math.floor(t), m = Math.round((t - h) * 60);
    return (h % 12 === 0 ? 12 : h % 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? "am" : "pm");
  };

  // ---------- state ----------
  let weekStart = startOfWeek(new Date());
  const hiddenCals = new Set(load("hiddenCals", []));
  const calColor = Object.fromEntries(MOCK.calendars.map((c) => [c.id, c.color]));

  // ---------- rendering ----------
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
      cell.append(el("div", "dow", DAYS[i]), el("div", "dom", String(d.getDate())));
      head.append(cell);
    }
  }

  function renderTodos() {
    const row = $("todo-row");
    const tasks = load("tasks", MOCK.tasks);
    row.replaceChildren(el("div", null, "to-do"));
    for (let i = 0; i < 7; i++) {
      const cell = el("div");
      tasks.filter((t) => t.day === i).forEach((t) => {
        const item = el("div", "todo" + (t.done ? " done" : ""));
        item.append(el("span", "mark", t.done ? "✓" : "•"), el("span", null, t.title));
        item.onclick = () => { t.done = !t.done; save("tasks", tasks); renderTodos(); };
        cell.append(item);
      });
      const add = el("button", "todo-add", "+ add");
      add.onclick = () => {
        const title = prompt("New to-do");
        if (!title) return;
        tasks.push({ id: Date.now(), day: i, title, done: false });
        save("tasks", tasks); renderTodos();
      };
      cell.append(add);
      row.append(cell);
    }
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
    const key = "goals:" + weekKey(weekStart);
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
    const key = "habits:" + weekKey(weekStart);
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

  // ---------- stickers ----------
  // Positions are stored as percentages of the spread so they survive window resizes.
  function renderStickers() {
    const layer = $("sticker-layer");
    const key = "stickers:" + weekKey(weekStart);
    const list = load(key, []);
    layer.replaceChildren();
    list.forEach((s) => {
      const node = el("div", "sticker", s.emoji);
      node.style.left = s.x + "%"; node.style.top = s.y + "%";
      node.style.fontSize = (s.size || 40) + "px";
      node.title = "Drag to move · double-click to remove";
      node.ondblclick = () => { list.splice(list.indexOf(s), 1); save(key, list); renderStickers(); };
      node.onpointerdown = (ev) => {
        ev.preventDefault();
        node.setPointerCapture(ev.pointerId);
        const rect = $("spread").getBoundingClientRect();
        node.onpointermove = (m) => {
          s.x = Math.min(98, Math.max(0, ((m.clientX - rect.left) / rect.width) * 100 - 1));
          s.y = Math.min(98, Math.max(0, ((m.clientY - rect.top) / rect.height) * 100 - 1));
          node.style.left = s.x + "%"; node.style.top = s.y + "%";
        };
        node.onpointerup = () => { node.onpointermove = null; node.onpointerup = null; save(key, list); };
      };
      layer.append(node);
    });
  }

  function setupTray() {
    const tray = $("tray");
    STICKERS.forEach((emoji) => {
      const b = el("button", null, emoji);
      b.onclick = () => {
        const key = "stickers:" + weekKey(weekStart);
        const list = load(key, []);
        list.push({ emoji, x: 40 + Math.random() * 20, y: 30 + Math.random() * 20, size: 40 });
        save(key, list); renderStickers();
      };
      tray.append(b);
    });
    tray.append(el("span", "hint", "drag to move · double-click to remove"));
    $("sticker-toggle").onclick = () => {
      const on = tray.hidden;
      tray.hidden = !on;
      document.body.classList.toggle("decorating", on);
      $("sticker-toggle").classList.toggle("on", on);
    };
  }

  // ---------- wiring ----------
  function render() {
    renderTitle(); renderHead(); renderTodos(); renderAllDay(); renderTimeline();
    renderMiniCal(); renderCalList(); renderGoals(); renderHabits(); renderStickers();
  }

  $("today-btn").onclick = () => { weekStart = startOfWeek(new Date()); render(); };
  $("prev-btn").onclick = () => { weekStart = addDays(weekStart, -7); render(); };
  $("next-btn").onclick = () => { weekStart = addDays(weekStart, 7); render(); };

  setupTray();
  render();
})();
