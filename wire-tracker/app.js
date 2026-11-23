/* Wire Tracker UI. Saves on this device. No account, no server. */
(function () {
  const L = window.WireLogic;
  const DB = window.WireDB;
  const esc = L.escapeHtml;
  const LOCAL_KEY = "wire-tracker-text";
  const STAMP_KEY = "wire-tracker-idb-stamp";
  const SAFETY_KEY = "wire-tracker-safety-ok";

  const state = {
    data: { boxes: [], wires: [], groups: [], photos: [] },
    urls: new Map(),
    route: { name: "home" },
    draft: null,
    query: "",
    roomFilter: "",
    showUntested: false,
    expandedGroupId: null,
    showJoinFor: null,
    confirm: null,
    pendingImport: null,
    exportFile: null,
    photoId: null,
    safetyOpen: false,
    focusSection: null,
    stamp: 0,
    ready: false,
    drawTool: "move",
    drawShape: "3way",
    drawColor: "black",
    drawColorOther: "",
    drawConductors: 2,
    selection: null,
    rubber: null,
  };

  const pending = new Map();
  const drawHist = { undo: [], redo: [] };
  let drawHandle = null;
  let flushTimer = null;
  let toastTimer = null;
  let lastRouteKey = "";

  function findBox(id) {
    return state.data.boxes.find((box) => box.id === id) || null;
  }

  function findWire(id) {
    return state.data.wires.find((wire) => wire.id === id) || null;
  }

  function contentWires(boxId) {
    return state.data.wires.filter((wire) => wire.boxId === boxId && L.wireHasContent(wire));
  }

  function countPhrase(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  }

  function inventory(data, photos) {
    return [
      countPhrase(data.boxes.length, "box", "boxes"),
      countPhrase(data.wires.length, "wire", "wires"),
      countPhrase(photos, "photo", "photos"),
    ].join(", ");
  }

  function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3400);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    const el = document.getElementById("toast");
    if (el) el.hidden = true;
  }

  function rememberText() {
    state.stamp = Date.now();
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({
        savedAt: state.stamp,
        boxes: state.data.boxes,
        wires: state.data.wires,
        groups: state.data.groups,
        diagrams: state.data.diagrams || [],
        nodes: state.data.nodes || [],
        strokes: state.data.strokes || [],
      }));
    } catch (err) { /* private mode or full storage */ }
  }

  function readLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
      if (!raw || typeof raw !== "object") return null;
      const cleaned = L.cleanState(raw);
      return {
        boxes: cleaned.boxes,
        wires: cleaned.wires,
        groups: cleaned.groups,
        diagrams: cleaned.diagrams,
        nodes: cleaned.nodes,
        strokes: cleaned.strokes,
        savedAt: Number(raw.savedAt) || 0,
      };
    } catch (err) {
      return null;
    }
  }

  function queue(store, type, valueOrId) {
    const id = type === "del" ? valueOrId : valueOrId.id;
    if (type === "del") pending.set(store + ":" + id, { store: store, type: "del", id: id });
    else pending.set(store + ":" + id, { store: store, type: "put", value: valueOrId });
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 80);
  }

  function flush() {
    clearTimeout(flushTimer);
    flushTimer = null;
    const ops = [...pending.values()];
    pending.clear();
    if (!ops.length) return Promise.resolve();
    const batchStamp = state.stamp;
    return DB.apply(ops).then(() => {
      try {
        const stored = Number(localStorage.getItem(STAMP_KEY) || 0);
        const next = L.advancePersistedStamp(batchStamp, stored);
        if (next !== stored) localStorage.setItem(STAMP_KEY, String(next));
      } catch (err) { /* ignore */ }
    }).catch((err) => {
      console.error(err);
      toast("Couldn't save just now. Keep this page open and try again.");
    });
  }

  function saveWire(wire) {
    wire.updatedAt = Date.now();
    const box = findBox(wire.boxId);
    if (box) {
      box.updatedAt = Date.now();
      queue("boxes", "put", box);
    }
    queue("wires", "put", wire);
    rememberText();
  }

  function saveBox(box) {
    box.updatedAt = Date.now();
    queue("boxes", "put", box);
    rememberText();
  }

  function refreshUrls() {
    state.urls.forEach((url) => URL.revokeObjectURL(url));
    state.urls = new Map();
    state.data.photos.forEach((photo) => {
      if (photo.blob) state.urls.set(photo.id, URL.createObjectURL(photo.blob));
    });
  }

  function loadData() {
    let idb = { boxes: [], wires: [], groups: [], photos: [] };
    let idbError = null;
    const idbTry = DB.load().catch((err) => {
      idbError = err;
      return null;
    });
    return idbTry.then((loaded) => {
      if (loaded) idb = loaded;
      const local = readLocal();
      let stamp = 0;
      try { stamp = Number(localStorage.getItem(STAMP_KEY) || 0); } catch (err) { stamp = 0; }
      let boxes = idb.boxes || [];
      let wires = idb.wires || [];
      let groups = idb.groups || [];
      let diagrams = idb.diagrams || [];
      let nodes = idb.nodes || [];
      let strokes = idb.strokes || [];
      let restored = false;
      if (local && local.savedAt > stamp) {
        boxes = local.boxes;
        wires = local.wires;
        groups = local.groups;
        diagrams = local.diagrams;
        nodes = local.nodes;
        strokes = local.strokes;
        restored = true;
      } else if (idbError && local) {
        boxes = local.boxes;
        wires = local.wires;
        groups = local.groups;
        diagrams = local.diagrams;
        nodes = local.nodes;
        strokes = local.strokes;
        restored = true;
      }
      const cleaned = L.cleanState({
        boxes: boxes,
        wires: wires,
        groups: groups,
        diagrams: diagrams,
        nodes: nodes,
        strokes: strokes,
      });
      const boxIds = new Set(cleaned.boxes.map((box) => box.id));
      const photos = (idb.photos || []).filter((photo) => photo && photo.blob && boxIds.has(photo.boxId));
      const finish = Promise.resolve();
      return finish.then(() => {
        if (restored && !idbError) {
          return DB.replaceAll({
            boxes: cleaned.boxes,
            wires: cleaned.wires,
            groups: cleaned.groups,
            diagrams: cleaned.diagrams,
            nodes: cleaned.nodes,
            strokes: cleaned.strokes,
            photos: photos,
          }).then(() => {
            try { localStorage.setItem(STAMP_KEY, String(local.savedAt || Date.now())); } catch (err) { /* ignore */ }
          }).catch(() => {});
        }
        return null;
      }).then(() => ({
        boxes: cleaned.boxes,
        wires: cleaned.wires,
        groups: cleaned.groups,
        diagrams: cleaned.diagrams,
        nodes: cleaned.nodes,
        strokes: cleaned.strokes,
        photos: photos,
        idbError: idbError,
        restored: restored,
      }));
    });
  }

  function pruneEmptyWires(exceptId) {
    const drop = state.data.wires.filter((wire) => wire.id !== exceptId && !L.wireHasContent(wire));
    if (!drop.length) return false;
    const ids = new Set(drop.map((wire) => wire.id));
    state.data.wires = state.data.wires.filter((wire) => !ids.has(wire.id));
    drop.forEach((wire) => queue("wires", "del", wire.id));
    return true;
  }

  function parseHash() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    const qIndex = raw.indexOf("?");
    const path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    const query = qIndex >= 0 ? raw.slice(qIndex + 1) : "";
    const parts = path.split("/").filter(Boolean).map((part) => {
      try { return decodeURIComponent(part); } catch (err) { return part; }
    });
    const params = new URLSearchParams(query);
    const focus = params.get("focus") || "";
    if (!parts.length) return { name: "home" };
    if (parts[0] === "todos") return { name: "todos" };
    if (parts[0] === "backup") return { name: "backup" };
    if (parts[0] === "new") return { name: "new-box" };
    if (parts[0] === "drawings") return { name: "drawings" };
    if (parts[0] === "draw" && parts[1]) return { name: "draw", diagramId: parts[1], select: params.get("select") || "" };
    if (parts[0] === "box" && parts[1]) {
      const boxId = parts[1];
      if (parts[2] === "edit") return { name: "edit-box", boxId: boxId, focus: focus };
      if (parts[2] === "diagram") return { name: "diagram", boxId: boxId };
      if (parts[2] === "wire" && parts[3]) return { name: "wire", boxId: boxId, wireId: parts[3], focus: focus };
      return { name: "box", boxId: boxId };
    }
    return { name: "home" };
  }

  function routeKey(route) {
    return [route.name, route.boxId || "", route.wireId || "", route.diagramId || ""].join(":");
  }

  function parentHash(route) {
    if (!route) return "#/";
    if (route.name === "draw") return "#/drawings";
    if (route.name === "drawings") return "#/";
    if (route.boxId && route.name !== "box") return "#/box/" + encodeURIComponent(route.boxId);
    return "#/";
  }

  function onRoute() {
    if (!state.ready) return;
    const previous = state.route;
    const next = parseHash();
    if (previous && previous.name === "wire" && previous.wireId && (next.name !== "wire" || next.wireId !== previous.wireId)) {
      leaveWireIfEmpty(previous.wireId);
    }
    if (previous && previous.name === "new-box" && next.name !== "new-box") state.draft = null;
    if (previous && previous.name === "draw" && next.name !== "draw") {
      drawHist.undo = [];
      drawHist.redo = [];
      state.selection = null;
      state.rubber = null;
    }
    if (next.name === "draw" && (!previous || previous.diagramId !== next.diagramId)) {
      const nodes = (state.data.nodes || []).filter((node) => node.diagramId === next.diagramId);
      state.drawTool = nodes.length ? "move" : "box";
      state.selection = null;
    }
    if (next.select) {
      const splitAt = next.select.indexOf(":");
      if (splitAt > 0) state.selection = { type: next.select.slice(0, splitAt), id: next.select.slice(splitAt + 1) };
    }
    state.route = next;
    if (next.focus) state.focusSection = next.focus;
    render();
  }

  function go(hash) {
    if (location.hash === hash) onRoute();
    else location.hash = hash;
  }

  function replaceHash(hash) {
    if (location.hash === hash) onRoute();
    else location.replace(hash);
  }

  function leaveWireIfEmpty(wireId) {
    const wire = findWire(wireId);
    if (!wire || L.wireHasContent(wire)) return;
    const groupId = wire.groupId;
    const result = L.deleteWire(state.data, wireId);
    if (!result.ok) return;
    queue("wires", "del", wireId);
    if (result.previous) queue("wires", "put", result.previous);
    if (groupId && !state.data.wires.some((item) => item.groupId === groupId)) {
      state.data.groups = state.data.groups.filter((group) => group.id !== groupId);
      queue("groups", "del", groupId);
    }
    rememberText();
  }

  function wantsNav(name) {
    return name === "home" || name === "todos" || name === "backup" || name === "box" || name === "diagram" || name === "drawings";
  }

  function logo() {
    return '<svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"><rect width="42" height="42" rx="12" fill="#1f6b4a"/><rect x="16" y="9" width="18" height="24" rx="4" fill="#f3efe6"/><rect x="6" y="13" width="14" height="3.5" rx="1.7" fill="#222"/><rect x="6" y="19" width="14" height="3.5" rx="1.7" fill="#f7f7f5" stroke="#d9d3c7" stroke-width="0.4"/><rect x="6" y="25" width="14" height="3.5" rx="1.7" fill="#d21f1f"/></svg>';
  }

  function safetyAcked() {
    try { return localStorage.getItem(SAFETY_KEY) === "1"; } catch (err) { return false; }
  }

  function safetyCopy() {
    return '<h2>Before you open a box</h2><p>Turn the breaker off. Then check the wires with a non-contact voltage tester. If it beeps, stop.</p><p>If you are not sure, call an electrician. This app only keeps notes. It can\'t tell you a wire is safe.</p>';
  }

  function render() {
    const route = state.route;
    const key = routeKey(route);
    const keep = key === lastRouteKey;
    const y = keep ? window.scrollY : 0;
    const app = document.getElementById("app");
    const nav = document.getElementById("nav");
    const overlay = document.getElementById("overlay");
    try {
      app.className = "shell" + (route.name === "draw" ? " draw-mode" : "") + (wantsNav(route.name) ? "" : " no-nav") + (route.name === "new-box" ? " has-dock" : "");
      app.innerHTML = paint(route);
      nav.hidden = !wantsNav(route.name);
      nav.innerHTML = wantsNav(route.name) ? renderNav(route) : "";
      overlay.innerHTML = renderOverlay();
      document.body.style.overflow = overlay.innerHTML.trim() ? "hidden" : "";
      if (state.confirm || state.exportFile || state.photoId || state.safetyOpen) hideToast();
      document.title = documentTitle(route);
    } catch (err) {
      console.error(err);
      app.innerHTML = '<h1>Something went wrong</h1><p class="lede">Your notes are still on this phone.</p><a class="btn primary" href="#/">Back to boxes</a>';
      overlay.innerHTML = "";
    }
    lastRouteKey = key;
    if (state.focusSection) {
      const target = document.getElementById(state.focusSection);
      if (target) target.scrollIntoView({ block: "start" });
      state.focusSection = null;
    } else if (keep) {
      window.scrollTo(0, y);
    } else {
      window.scrollTo(0, 0);
    }
    if (drawHandle) {
      drawHandle.destroy();
      drawHandle = null;
    }
    if (route.name === "draw") {
      const canvas = document.getElementById("draw-canvas");
      if (canvas && window.WireDraw) drawHandle = window.WireDraw.mount(canvas, drawApi);
    }
  }

  function documentTitle(route) {
    if (route.name === "box" || route.name === "diagram" || route.name === "edit-box") {
      const box = findBox(route.boxId);
      return (box ? L.boxTitle(box) : "Box") + " · Wire Tracker";
    }
    if (route.name === "wire") return "Wire · Wire Tracker";
    if (route.name === "todos") return "To figure out · Wire Tracker";
    if (route.name === "backup") return "Backup · Wire Tracker";
    if (route.name === "new-box") return "New box · Wire Tracker";
    if (route.name === "drawings") return "Draw · Wire Tracker";
    if (route.name === "draw") return "Drawing · Wire Tracker";
    return "Wire Tracker";
  }

  function renderNav(route) {
    const current = route.name === "todos" ? "todos" : route.name === "backup" ? "backup" : route.name === "drawings" || route.name === "draw" ? "draw" : "home";
    const issues = L.allIssues(state.data).length;
    const badge = issues ? '<span class="badge">' + (issues > 9 ? "9+" : String(issues)) + "</span>" : "";
    return [
      navLink("#/", "Boxes", current === "home"),
      navLink("#/drawings", "Draw", current === "draw"),
      navLink("#/todos", "To-do" + badge, current === "todos"),
      navLink("#/backup", "Backup", current === "backup"),
    ].join("");
  }

  function navLink(href, label, on) {
    return '<a href="' + href + '"' + (on ? ' aria-current="page"' : "") + ">" + label + "</a>";
  }

  function paint(route) {
    if (route.name === "home") return renderHome();
    if (route.name === "drawings") return renderDrawings();
    if (route.name === "draw") return renderDraw(route.diagramId);
    if (route.name === "todos") return renderTodos();
    if (route.name === "backup") return renderBackup();
    if (route.name === "new-box") return renderBoxForm(ensureDraft(), true);
    if (route.name === "edit-box") {
      const box = findBox(route.boxId);
      return box ? renderBoxForm(box, false) : renderMissing("That box");
    }
    if (route.name === "box") {
      const box = findBox(route.boxId);
      return box ? renderBox(box) : renderMissing("That box");
    }
    if (route.name === "diagram") {
      const box = findBox(route.boxId);
      return box ? renderDiagram(box) : renderMissing("That box");
    }
    if (route.name === "wire") {
      const box = findBox(route.boxId);
      const wire = findWire(route.wireId);
      if (!box || !wire || wire.boxId !== box.id) return renderMissing("That wire");
      return renderWire(box, wire);
    }
    return renderHome();
  }

  function ensureDraft() {
    if (!state.draft) state.draft = L.blankBox();
    return state.draft;
  }

  function renderMissing(title) {
    return '<h1>' + esc(title) + ' isn\'t here</h1><p class="lede">It may have been removed on this phone.</p><p><a class="btn primary" href="#/">Back to boxes</a></p>';
  }

  function safetyButton() {
    return '<button type="button" class="text-btn" data-action="open-safety">Safety</button>';
  }

  function renderHome() {
    const boxes = state.data.boxes;
    const issues = L.allIssues(state.data);
    const roomList = L.rooms(boxes);
    let safety = "";
    if (!safetyAcked()) {
      safety = '<section class="safety">' + safetyCopy() + '<button type="button" class="btn primary" data-action="ack-safety">Got it</button></section>';
    }
    let banner = "";
    if (issues.length) {
      banner = '<a class="banner" href="#/todos">' + countPhrase(issues.length, "thing to figure out", "things to figure out") + "</a>";
    }
    let finder = "";
    if (boxes.length >= 5 || state.query) {
      finder = '<label class="field-label" for="find-box">Find a box</label><input id="find-box" type="search" placeholder="Name or room" autocomplete="off" value="' + esc(state.query) + '">';
    }
    let rooms = "";
    if (roomList.length >= 2) {
      rooms = '<div class="chips"><button type="button" class="chip" aria-pressed="' + (!state.roomFilter) + '" data-action="filter-room" data-room="*">All rooms</button>' +
        roomList.map((room) => '<button type="button" class="chip" aria-pressed="' + (state.roomFilter.toLowerCase() === room.toLowerCase()) + '" data-action="filter-room" data-room="' + esc(room) + '">' + esc(room) + "</button>").join("") +
        "</div>";
    }
    let body = "";
    if (!boxes.length) {
      body = '<div class="empty"><p><strong>No boxes yet.</strong></p><p>Start with the one you are looking at.</p><ol class="steps"><li>Add the box</li><li>Add each wire you can see</li><li>Tap Not sure, then come back later</li></ol></div>';
    } else {
      body = '<div id="box-list">' + renderBoxCards() + "</div>";
    }
    return '<div class="topbar"><div class="brand">' + logo() + '<p class="eyebrow">Wire Tracker</p></div>' + safetyButton() + "</div>" +
      "<h1>Your boxes</h1><p class=\"lede\">Write down what you see. Skip anything you are not sure about.</p>" +
      banner +
      '<div class="stack"><button type="button" class="btn primary" data-action="new-box">Add a box</button><a class="btn secondary" href="#/drawings">Draw</a></div>' +
      safety +
      finder + rooms + body;
  }

  function renderBoxCards() {
    const boxes = visibleBoxes();
    if (!boxes.length) return '<div class="empty"><p>No box matches that.</p></div>';
    return boxes.map((box) => {
      const issues = L.allIssues(state.data).filter((item) => item.boxId === box.id);
      const wires = contentWires(box.id);
      const type = L.typeLabel(box);
      const bits = [];
      if ((box.room || "").trim()) bits.push(box.room.trim());
      const breaker = L.breakerLabel(box);
      if (breaker) bits.push(breaker);
      const pill = issues.length === 1
        ? '<span class="pill">' + esc(issues[0].short) + "</span>"
        : issues.length > 1
          ? '<span class="pill">' + issues.length + " open</span>"
          : "";
      return '<a class="box-card" href="#/box/' + encodeURIComponent(box.id) + '">' +
        '<div class="card-top"><h2>' + esc(L.boxTitle(box)) + "</h2>" +
        (type ? '<span class="type-pill">' + esc(type) + "</span>" : "") +
        "</div>" +
        (bits.length ? '<p class="meta">' + esc(bits.join(" · ")) + "</p>" : "") +
        '<p class="meta">' + (wires.length ? countPhrase(wires.length, "wire", "wires") : "No wires yet") + "</p>" +
        pill + "</a>";
    }).join("");
  }

  function visibleBoxes() {
    const q = state.query.trim().toLowerCase();
    const room = state.roomFilter.trim().toLowerCase();
    return [...state.data.boxes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).filter((box) => {
      if (room && (box.room || "").trim().toLowerCase() !== room) return false;
      if (!q) return true;
      const hay = [box.name, box.room, box.breaker, L.typeLabel(box)].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function renderTodos() {
    const issues = L.allIssues(state.data);
    const untested = L.untestedWires(state.data);
    let list = "";
    if (!issues.length) {
      list = '<div class="empty"><p><strong>Nothing waiting.</strong></p><p>When you tap Not sure, it shows up here.</p></div>';
    } else {
      const groups = [];
      issues.forEach((item) => {
        let group = groups.find((entry) => entry.id === item.boxId);
        if (!group) {
          group = { id: item.boxId, items: [] };
          groups.push(group);
        }
        group.items.push(item);
      });
      list = groups.map((group) => {
        const box = findBox(group.id);
        const rows = group.items.map((item) => '<a class="issue-row" href="' + issueHref(item) + '">' + esc(item.text) + "</a>").join("");
        return "<h2>" + esc(box ? L.boxTitle(box) : "Box") + "</h2>" + rows;
      }).join("");
    }
    let later = "";
    if (untested.length) {
      later = '<h2 class="group-title">Not tested yet</h2><button type="button" class="btn secondary" data-action="toggle-untested">' +
        (state.showUntested ? "Hide untested wires" : "Show " + countPhrase(untested.length, "untested wire", "untested wires")) +
        "</button>";
      if (state.showUntested) {
        later += untested.map((wire) => {
          const box = findBox(wire.boxId);
          return '<a class="issue-row" href="#/box/' + encodeURIComponent(wire.boxId) + "/wire/" + encodeURIComponent(wire.id) + '?focus=field-tested">' +
            esc((box ? L.boxTitle(box) : "Box") + " · " + L.wireTitle(wire)) + "</a>";
        }).join("");
      }
    }
    return '<div class="topbar"><span></span>' + safetyButton() + "</div><h1>To figure out</h1>" +
      '<p class="lede">Things you marked not sure, and wires that still need the other end.</p>' + list + later;
  }

  function issueHref(item) {
    if (item.field === "unsure" && item.wireId) {
      const stroke = (state.data.strokes || []).find((itemStroke) => itemStroke.wireIds.indexOf(item.wireId) !== -1);
      if (stroke) return "#/draw/" + encodeURIComponent(stroke.diagramId) + "?select=stroke:" + encodeURIComponent(stroke.id);
    }
    if (item.field === "unsure") {
      const node = (state.data.nodes || []).find((itemNode) => itemNode.boxId === item.boxId);
      if (node) return "#/draw/" + encodeURIComponent(node.diagramId) + "?select=node:" + encodeURIComponent(node.id);
    }
    if (item.kind === "breaker") return "#/box/" + encodeURIComponent(item.boxId) + "/edit?focus=field-breaker";
    return "#/box/" + encodeURIComponent(item.boxId) + "/wire/" + encodeURIComponent(item.wireId) + "?focus=" + encodeURIComponent(item.focus || "");
  }

  function renderBackup() {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    const install = standalone ? "" : '<p class="lede">On iPhone, open this page in Safari, tap Share, then <strong>Add to Home Screen</strong>.</p>';
    return '<div class="topbar"><span></span>' + safetyButton() + "</div><h1>Backup</h1>" +
      '<p class="lede">Notes stay on this phone, even if you close the page. Export a file to keep a copy or move them to your computer.</p>' +
      "<p><strong>" + esc(inventory(state.data, state.data.photos.length)) + "</strong></p>" +
      '<div class="stack"><button type="button" class="btn primary" data-action="export">Export backup</button>' +
      '<button type="button" class="btn secondary" data-action="pick-import">Import backup</button></div>' +
      '<input id="import-file" type="file" accept="application/json,.json" hidden>' +
      '<p class="hint">Import replaces the notes on this phone.</p>' + install +
      '<p class="footer-note">Version 1. The file stays with you unless you share it.</p>';
  }

  function renderBox(box) {
    const wires = contentWires(box.id);
    const issues = L.allIssues(state.data).filter((item) => item.boxId === box.id);
    const type = L.typeLabel(box);
    const bits = [];
    if ((box.room || "").trim()) bits.push(box.room.trim());
    if (type) bits.push(type);
    const breaker = L.breakerLabel(box);
    const live = wires.some((wire) => wire.tested === "live");
    const photos = state.data.photos.filter((photo) => photo.boxId === box.id);
    const groups = state.data.groups.filter((group) => group.boxId === box.id);
    const first = issues[0];
    return '<div class="topbar"><button type="button" class="back" data-action="back">Boxes</button>' + safetyButton() + "</div>" +
      "<h1>" + esc(L.boxTitle(box)) + "</h1>" +
      (bits.length ? '<p class="meta">' + esc(bits.join(" · ")) + "</p>" : "") +
      (breaker ? '<p class="meta">' + esc(breaker) + "</p>" : "") +
      ((box.notes || "").trim() ? '<p class="notes">' + esc(box.notes.trim()) + "</p>" : "") +
      (live ? '<p class="live-note">A wire here beeped on the tester. Treat the box as live until the breaker is off and you test again.</p>' : "") +
      (issues.length ? '<a class="banner" href="' + issueHref(first) + '">' + countPhrase(issues.length, "thing to figure out", "things to figure out") + "</a>" : "") +
      '<div class="stack"><button type="button" class="btn primary" data-action="add-wire" data-box="' + esc(box.id) + '">Add a wire</button>' +
      '<div class="row-2"><a class="btn secondary" href="#/box/' + encodeURIComponent(box.id) + '/diagram">Diagram</a>' +
      '<a class="btn secondary" href="#/box/' + encodeURIComponent(box.id) + '/edit">Edit box</a></div></div>' +
      renderPhotos(box, photos) +
      renderWireList(box, wires) +
      (wires.length || groups.length ? renderNuts(box, groups) : "");
  }

  function renderPhotos(box, photos) {
    const thumbs = photos.map((photo) => {
      const url = state.urls.get(photo.id) || "";
      return '<button type="button" class="thumb" data-action="view-photo" data-id="' + esc(photo.id) + '"><img src="' + esc(url) + '" alt="Photo of ' + esc(L.boxTitle(box)) + '"></button>';
    }).join("");
    return '<div class="photos">' +
      '<button type="button" class="photo-add" data-action="take-photo">Take photo</button>' +
      '<button type="button" class="photo-add" data-action="pick-photo">Choose photo</button>' +
      thumbs + "</div>" +
      '<input id="take-photo" type="file" accept="image/*" capture="environment" hidden>' +
      '<input id="pick-photo" type="file" accept="image/*" multiple hidden>';
  }

  function renderNuts(box, groups) {
    if (!groups.length) {
      return '<button type="button" class="btn secondary" data-action="add-nut" data-box="' + esc(box.id) + '">Group wires under a nut</button>';
    }
    const cards = groups.map((group) => {
      const members = contentWires(box.id).filter((wire) => wire.groupId === group.id);
      const memberText = members.length
        ? members.map((wire) => esc(L.wireTitle(wire))).join(", ")
        : "No wires in this nut yet.";
      const open = state.expandedGroupId === group.id;
      const picker = open ? '<div class="choices" style="margin-top:10px">' + contentWires(box.id).map((wire) => {
        const on = wire.groupId === group.id;
        return '<button type="button" class="choice" aria-pressed="' + on + '" data-action="toggle-member" data-group="' + esc(group.id) + '" data-wire="' + esc(wire.id) + '"><span class="mark" aria-hidden="true"></span><span>' + esc(L.wireTitle(wire)) + "</span></button>";
      }).join("") + "</div>" : "";
      return '<section class="card"><label class="field-label" for="nut-' + esc(group.id) + '">Wire nut name</label>' +
        '<input id="nut-' + esc(group.id) + '" type="text" maxlength="60" autocomplete="off" data-bind="name" data-scope="group" data-id="' + esc(group.id) + '" value="' + esc(group.name) + '">' +
        '<p class="hint">' + memberText + "</p>" +
        '<div class="stack"><button type="button" class="btn secondary" data-action="toggle-nut" data-id="' + esc(group.id) + '">' + (open ? "Hide wires" : "Choose wires") + "</button>" +
        picker +
        '<button type="button" class="btn danger" data-action="delete-nut" data-id="' + esc(group.id) + '">Remove nut</button></div></section>';
    }).join("");
    return '<h2 class="group-title">Wire nuts</h2>' + cards +
      '<button type="button" class="btn secondary" data-action="add-nut" data-box="' + esc(box.id) + '">Add another nut</button>';
  }

  function renderWireList(box, wires) {
    if (!wires.length) {
      return '<div class="empty"><p><strong>No wires yet.</strong></p><p>Add one thing you can see. Leave the rest blank.</p></div>';
    }
    return wiresByCable(wires).map((group) => {
      const rows = group.wires.map((wire) => renderWireRow(box, wire)).join("");
      return '<h3 class="cable-name">' + esc(group.name) + "</h3>" + rows;
    }).join("");
  }

  function wiresByCable(wires) {
    const map = new Map();
    [...wires].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach((wire) => {
      const name = (wire.cable || "").trim() || "Cable not noted";
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(wire);
    });
    return [...map.keys()].sort((a, b) => {
      if (a === "Cable not noted") return 1;
      if (b === "Cable not noted") return -1;
      return a.localeCompare(b);
    }).map((name) => ({ name: name, wires: map.get(name) }));
  }

  function renderWireRow(box, wire) {
    const issues = L.wireIssues(wire, state.data);
    const style = L.colorStyle(wire);
    const sub = wireSub(wire);
    const badges = [];
    if (wire.tested === "live") badges.push('<span class="pill live">Live</span>');
    if (issues.length === 1) badges.push('<span class="pill">' + esc(issues[0].short) + "</span>");
    else if (issues.length > 1) badges.push('<span class="pill">' + issues.length + " open</span>");
    return '<a class="wire-row' + (issues.length ? " has-issue" : "") + '" style="--wire:' + style.fill + '" href="#/box/' +
      encodeURIComponent(box.id) + "/wire/" + encodeURIComponent(wire.id) + '"><span><span class="wire-title">' +
      esc(L.wireTitle(wire)) + "</span>" + (sub ? '<span class="wire-sub">' + esc(sub) + "</span>" : "") +
      '</span><span class="badges">' + badges.join("") + "</span></a>";
  }

  function wireSub(wire) {
    const parts = [];
    if (wire.attachedTo && wire.attachedTo !== "unknown") parts.push(L.attachmentLabel(wire, state.data));
    if (wire.goesTo === "box" && wire.linkedWireId) {
      const other = findBox(wire.goesToBoxId);
      parts.push(other ? "Linked to " + L.boxTitle(other) : "Linked");
    } else if (wire.goesTo && wire.goesTo !== "unknown") parts.push(L.destinationLabel(wire, state.data));
    if (wire.tested === "dead") parts.push("No beep");
    return parts.join(" · ");
  }

  function renderDiagram(box) {
    return '<div class="topbar"><button type="button" class="back" data-action="back">Box</button>' + safetyButton() + "</div>" +
      "<h1>Diagram</h1><p class=\"lede\">" + esc(L.boxTitle(box)) + ". Tap a wire to open it.</p>" + renderSvg(box);
  }

  function renderSvg(box) {
    const model = L.buildDiagram(state.data, box.id);
    if (model.empty) return '<div class="empty"><p>No wires yet.</p><p>Add one and it will show up here.</p></div>';
    const edges = model.edges.map((edge) => {
      const mid = (edge.x1 + edge.x2) / 2;
      const dash = edge.dashed ? ' stroke-dasharray="7 6"' : "";
      return '<path d="M ' + num(edge.x1) + " " + num(edge.y1) + " C " + num(mid) + " " + num(edge.y1) + ", " + num(mid) + " " + num(edge.y2) + ", " + num(edge.x2) + " " + num(edge.y2) + '" fill="none" stroke="' + edge.stroke + '" stroke-width="4" stroke-linecap="round"' + dash + "></path>";
    }).join("");
    const cables = model.cables.map((cable) => {
      const header = '<text x="16" y="' + num(cable.headerY + 16) + '" fill="#5c564e" font-size="14" font-weight="700">' + esc(cable.name) + "</text>";
      const items = cable.items.map((item) => {
        const href = "#/box/" + encodeURIComponent(box.id) + "/wire/" + encodeURIComponent(item.id);
        return '<a href="' + href + '"><rect x="10" y="' + num(item.y - 20) + '" width="146" height="40" rx="12" fill="#fffdf8" stroke="' + item.style.border + '" stroke-width="2"></rect><circle cx="30" cy="' + num(item.y) + '" r="8" fill="' + item.style.fill + '" stroke="' + item.style.border + '" stroke-width="2"></circle><text x="46" y="' + num(item.y + 5) + '" fill="#1e1a16" font-size="15" font-weight="700">' + esc(item.title) + "</text></a>";
      }).join("");
      return header + items;
    }).join("");
    const nodes = model.nodes.map((node) => {
      const fill = node.unknown ? "#fff1d6" : "#fffdf8";
      const stroke = node.unknown ? "#e0b15c" : "#e3d9c8";
      const color = node.unknown ? "#8a4e08" : "#1e1a16";
      return '<rect x="176" y="' + num(node.y - 16) + '" width="86" height="32" rx="16" fill="' + fill + '" stroke="' + stroke + '"></rect><text x="219" y="' + num(node.y + 5) + '" text-anchor="middle" fill="' + color + '" font-size="13" font-weight="700">' + esc(node.label) + "</text>";
    }).join("");
    const dests = model.destinations.map((node) => {
      const color = node.unknown ? "#8a4e08" : "#1e1a16";
      return '<text x="276" y="' + num(node.y + 5) + '" fill="' + color + '" font-size="14" font-weight="700">' + esc(node.label) + "</text>";
    }).join("");
    return '<div class="diagram-wrap"><svg viewBox="0 0 ' + model.width + " " + model.height + '" role="img" aria-label="Diagram of ' + esc(L.boxTitle(box)) + '">' + edges + cables + nodes + dests + "</svg></div>";
  }

  function num(value) {
    return Math.round(value * 10) / 10;
  }

  function renderBoxForm(box, isNew) {
    const scope = isNew ? "draft" : "box";
    const rooms = L.rooms(state.data.boxes).filter((room) => {
      if (isNew) return true;
      return room.toLowerCase() !== (box.room || "").trim().toLowerCase() || true;
    });
    const roomChips = rooms.length ? '<div class="chips">' + rooms.map((room) => {
      const on = (box.room || "").trim().toLowerCase() === room.toLowerCase();
      return '<button type="button" class="chip" aria-pressed="' + on + '" data-action="use-room" data-room="' + esc(room) + '">' + esc(room) + "</button>";
    }).join("") + "</div>" : "";
    const other = box.type === "other"
      ? textInput({ label: "What kind of box", bind: "typeOther", scope: scope, id: box.id, value: box.typeOther, max: L.LIMITS.typeOther, placeholder: "Fan, smoke alarm…" })
      : "";
    return '<div class="topbar"><button type="button" class="back" data-action="back">' + (isNew ? "Boxes" : "Box") + "</button>" + safetyButton() + "</div>" +
      "<h1>" + (isNew ? "New box" : "Edit box") + "</h1>" +
      '<p class="hint">' + (isNew ? "A name is enough. The rest can wait." : "Saves on this phone.") + "</p>" +
      '<section class="card">' + textInput({ label: "Name", bind: "name", scope: scope, id: box.id, value: box.name, max: L.LIMITS.name, placeholder: "Hallway switch", inputId: "box-name" }) + "</section>" +
      '<section class="card">' + textInput({ label: "Room", bind: "room", scope: scope, id: box.id, value: box.room, max: L.LIMITS.room, placeholder: "Hallway", inputId: "box-room" }) + roomChips + "</section>" +
      '<section class="card"><h2>Type</h2><div class="type-grid">' + L.BOX_TYPES.map((type) => choiceHtml(scope, box.id, "type", type, box.type)).join("") + "</div>" + other + "</section>" +
      '<section class="card" id="field-breaker"><h2>Breaker</h2>' +
      textInput({ label: "Which breaker controls this box", bind: "breaker", scope: scope, id: box.id, value: box.breaker, max: L.LIMITS.breaker, placeholder: "12, or Kitchen lights", inputId: "box-breaker" }) +
      '<div class="choices" style="margin-top:10px">' + breakerChoice(scope, box) + "</div></section>" +
      '<section class="card"><label class="field-label" for="box-notes">Notes</label><textarea id="box-notes" maxlength="4000" placeholder="Anything you want to remember" data-bind="notes" data-scope="' + scope + '" data-id="' + esc(box.id) + '">' + esc(box.notes) + "</textarea></section>" +
      (isNew
        ? '<div class="dock"><button type="button" class="btn primary" data-action="create-box"' + (box.name.trim() ? "" : " disabled") + ">Add this box</button></div>"
        : '<button type="button" class="btn danger" data-action="delete-box" data-box="' + esc(box.id) + '">Remove this box</button>');
  }

  function breakerChoice(scope, box) {
    const on = box.breakerStatus === "unknown";
    return '<button type="button" class="choice caution" aria-pressed="' + on + '" data-action="choice" data-scope="' + scope + '" data-id="' + esc(box.id) + '" data-field="breakerStatus" data-value="unknown"><span class="mark" aria-hidden="true"></span><span>Not sure</span>' + (on ? '<span class="sr-only">Selected</span>' : "") + "</button>";
  }

  function renderWire(box, wire) {
    const scope = "wire";
    const cables = L.cablesInBox(state.data, box.id);
    const cableChips = cables.length ? '<div class="chips">' + cables.map((cable) => {
      const on = (wire.cable || "").trim().toLowerCase() === cable.toLowerCase();
      return '<button type="button" class="chip" aria-pressed="' + on + '" data-action="use-cable" data-wire="' + esc(wire.id) + '" data-cable="' + esc(cable) + '">' + esc(cable) + "</button>";
    }).join("") + "</div>" : "";
    const colorOther = wire.color === "other"
      ? textInput({ label: "Color name", bind: "colorOther", scope: scope, id: wire.id, value: wire.colorOther, max: L.LIMITS.colorOther, placeholder: "Orange, gray…", inputId: "color-other" })
      : "";
    const detail = wire.attachedTo === "switch" || wire.attachedTo === "outlet" || wire.attachedTo === "pigtail" || wire.attachedTo === "other"
      ? textInput({ label: "Which one", bind: "attachedDetail", scope: scope, id: wire.id, value: wire.attachedDetail, max: L.LIMITS.attachedDetail, placeholder: detailPlaceholder(wire.attachedTo), inputId: "attached-detail" })
      : "";
    const showNuts = wire.attachedTo === "nut" || wire.groupId || state.showJoinFor === wire.id;
    const joinButton = showNuts ? "" : '<button type="button" class="btn secondary" data-action="show-join" data-wire="' + esc(wire.id) + '">It\'s also in a wire nut</button>';
    const testedHint = wire.tested === "live"
      ? '<p class="hint warn">It was live when you tested. Turn the breaker off and test again before you touch it.</p>'
      : wire.tested === "dead"
        ? '<p class="hint">No beep last time you tested.</p>'
        : "";
    const linked = wire.linkedWireId ? findWire(wire.linkedWireId) : null;
    const otherBox = linked ? findBox(linked.boxId) : null;
    const linkLine = linked && otherBox
      ? '<p class="hint">Other end: <a href="#/box/' + encodeURIComponent(otherBox.id) + "/wire/" + encodeURIComponent(linked.id) + '">' + esc(L.wireTitle(linked) + " in " + L.boxTitle(otherBox)) + "</a></p>"
      : "";
    return '<div class="topbar"><button type="button" class="back" data-action="back">Box</button>' + safetyButton() + "</div>" +
      "<h1>" + esc(L.wireTitle(wire)) + "</h1>" +
      '<p class="hint">Saves on this phone.</p>' +
      linkLine +
      '<section class="card" id="field-color"><h2>Color</h2>' + swatchHtml(scope, wire) + colorOther + "</section>" +
      '<section class="card" id="field-cable"><h2>Came in with</h2>' +
      textInput({ label: "Cable", bind: "cable", scope: scope, id: wire.id, value: wire.cable, max: L.LIMITS.cable, placeholder: "Cable 1 from the top", inputId: "wire-cable" }) +
      cableChips + "</section>" +
      '<section class="card" id="field-attached"><h2>Attached to</h2>' + choiceList(scope, wire.id, "attachedTo", L.ATTACHMENTS, wire.attachedTo) + detail +
      (showNuts ? '<h2 style="margin-top:16px">Wire nut</h2>' + renderNutPicker(wire) : '<div class="stack">' + joinButton + "</div>") +
      "</section>" +
      '<section class="card" id="field-goes"><h2>Where it goes</h2>' + choiceList(scope, wire.id, "goesTo", L.DESTINATIONS, wire.goesTo) + renderDestinationExtra(wire) + "</section>" +
      '<section class="card" id="field-tested"><h2>Tested</h2>' + choiceList(scope, wire.id, "tested", L.TESTED, wire.tested ? wire.tested : "untested") + testedHint + "</section>" +
      '<section class="card"><label class="field-label" for="wire-notes">Notes</label><textarea id="wire-notes" maxlength="4000" placeholder="Anything you want to remember" data-bind="notes" data-scope="wire" data-id="' + esc(wire.id) + '">' + esc(wire.notes) + "</textarea></section>" +
      '<button type="button" class="btn danger" data-action="delete-wire" data-wire="' + esc(wire.id) + '">Remove this wire</button>';
  }

  function detailPlaceholder(attached) {
    if (attached === "switch") return "Top switch, brass screw";
    if (attached === "outlet") return "Right brass screw";
    if (attached === "pigtail") return "To the switch";
    return "What it is";
  }

  function renderNutPicker(wire) {
    const groups = state.data.groups.filter((group) => group.boxId === wire.boxId);
    const rows = groups.map((group) => {
      const on = wire.groupId === group.id;
      return '<button type="button" class="choice" aria-pressed="' + on + '" data-action="pick-group" data-wire="' + esc(wire.id) + '" data-group="' + esc(group.id) + '"><span class="mark" aria-hidden="true"></span><span>' + esc(group.name) + "</span></button>";
    }).join("");
    const hint = wire.attachedTo === "nut" && !wire.groupId ? '<p class="hint">Pick the nut, or make a new one.</p>' : "";
    return '<div class="choices">' + rows +
      '<button type="button" class="choice" data-action="make-group" data-wire="' + esc(wire.id) + '"><span class="mark" aria-hidden="true"></span><span>New wire nut</span></button></div>' + hint;
  }

  function renderDestinationExtra(wire) {
    if (wire.goesTo === "light") {
      return textInput({ label: "Which light", bind: "goesToLabel", scope: "wire", id: wire.id, value: wire.goesToLabel, max: L.LIMITS.goesToLabel, placeholder: "Porch light", inputId: "goes-label" });
    }
    if (wire.goesTo === "panel") {
      return textInput({ label: "Breaker or note", bind: "goesToLabel", scope: "wire", id: wire.id, value: wire.goesToLabel, max: L.LIMITS.goesToLabel, placeholder: "Breaker 12", inputId: "goes-label" });
    }
    if (wire.goesTo === "other") {
      return textInput({ label: "Where", bind: "goesToLabel", scope: "wire", id: wire.id, value: wire.goesToLabel, max: L.LIMITS.goesToLabel, placeholder: "Furnace", inputId: "goes-label" });
    }
    if (wire.goesTo !== "box") return "";
    const boxes = state.data.boxes.filter((box) => box.id !== wire.boxId);
    if (!boxes.length) return '<p class="hint">No other box yet. Add one, then come back. This wire stays saved.</p>';
    const choices = boxes.map((box) => {
      const on = wire.goesToBoxId === box.id;
      const label = L.boxTitle(box) + ((box.room || "").trim() ? " · " + box.room.trim() : "");
      return '<button type="button" class="choice" aria-pressed="' + on + '" data-action="pick-box" data-wire="' + esc(wire.id) + '" data-box="' + esc(box.id) + '"><span class="mark" aria-hidden="true"></span><span>' + esc(label) + "</span></button>";
    }).join("");
    return '<div class="choices" style="margin-top:10px">' + choices + "</div>" + (wire.goesToBoxId ? renderOtherEnd(wire) : "");
  }

  function renderOtherEnd(wire) {
    const box = findBox(wire.goesToBoxId);
    const name = box ? L.boxTitle(box) : "that box";
    const linked = wire.linkedWireId ? findWire(wire.linkedWireId) : null;
    const others = state.data.wires.filter((item) => item.boxId === wire.goesToBoxId && L.wireHasContent(item) && (!item.linkedWireId || item.linkedWireId === wire.id));
    const rows = others.map((item) => {
      const on = wire.linkedWireId === item.id;
      return '<button type="button" class="choice" aria-pressed="' + on + '" data-action="link-wire" data-wire="' + esc(wire.id) + '" data-other="' + esc(item.id) + '"><span class="mark" aria-hidden="true"></span><span>' + esc(L.wireTitle(item)) + "</span></button>";
    }).join("");
    const undo = linked
      ? '<button type="button" class="btn secondary" data-action="unlink" data-wire="' + esc(wire.id) + '">Undo this connection</button>'
      : "";
    const hint = linked ? "" : '<p class="hint">Linking can wait.</p>';
    return '<h2 style="margin-top:16px">Other end in ' + esc(name) + "</h2>" + undo +
      '<div class="choices"' + (undo ? ' style="margin-top:10px"' : "") + ">" + rows +
      '<button type="button" class="choice" data-action="create-end" data-wire="' + esc(wire.id) + '" data-box="' + esc(wire.goesToBoxId) + '"><span class="mark" aria-hidden="true"></span><span>Add the other end now</span></button></div>' + hint;
  }

  function choiceList(scope, id, field, options, current) {
    return '<div class="choices">' + options.map((opt) => choiceHtml(scope, id, field, opt, current)).join("") + "</div>";
  }

  function choiceHtml(scope, id, field, opt, current) {
    const on = current === opt.id;
    const caution = opt.id === "unknown" ? " caution" : "";
    return '<button type="button" class="choice' + caution + '" aria-pressed="' + on + '" data-action="choice" data-scope="' + scope + '" data-id="' + esc(id) + '" data-field="' + field + '" data-value="' + esc(opt.id) + '"><span class="mark" aria-hidden="true"></span><span>' + esc(opt.label) + "</span>" + (on ? '<span class="sr-only">Selected</span>' : "") + "</button>";
  }

  function swatchHtml(scope, wire) {
    return '<div class="swatches">' + L.COLORS.map((color) => {
      const on = wire.color === color.id;
      const caution = color.id === "unknown" ? " caution" : "";
      const mark = color.id === "unknown" ? "?" : "";
      return '<button type="button" class="swatch' + caution + '" aria-pressed="' + on + '" data-action="choice" data-scope="' + scope + '" data-id="' + esc(wire.id) + '" data-field="color" data-value="' + color.id + '"><span class="dot" style="background:' + color.fill + ";border-color:" + color.border + ";color:" + color.ink + '">' + mark + '</span><span>' + esc(color.label) + "</span>" + (on ? '<span class="sr-only">Selected</span>' : "") + "</button>";
    }).join("") + "</div>";
  }

  function textInput(opts) {
    return '<label class="field-label" for="' + esc(opts.inputId) + '">' + esc(opts.label) + "</label>" +
      '<input id="' + esc(opts.inputId) + '" type="text" maxlength="' + opts.max + '" placeholder="' + esc(opts.placeholder || "") + '" autocomplete="off" data-bind="' + opts.bind + '" data-scope="' + opts.scope + '" data-id="' + esc(opts.id) + '" value="' + esc(opts.value || "") + '">';
  }

  function renderOverlay() {
    if (state.confirm) {
      return '<div class="scrim"><div class="sheet" data-action="stop"><h2>' + esc(state.confirm.title) + '</h2><p class="lede">' + esc(state.confirm.body) + '</p><div class="stack"><button type="button" class="btn primary" data-action="confirm-yes">' + esc(state.confirm.confirmLabel) + '</button><button type="button" class="btn secondary" data-action="confirm-no">Cancel</button></div></div></div>';
    }
    if (state.exportFile) {
      const kb = Math.max(1, Math.round(state.exportFile.size / 1024));
      return '<div class="scrim"><div class="sheet" data-action="stop"><h2>Backup ready</h2><p class="lede">' + esc(state.exportFile.name) + " · " + kb + ' KB</p><div class="stack"><button type="button" class="btn primary" data-action="deliver-export">Share or save</button><button type="button" class="btn secondary" data-action="close-export">Close</button></div></div></div>';
    }
    if (state.photoId) {
      const photo = state.data.photos.find((item) => item.id === state.photoId);
      const url = photo ? state.urls.get(photo.id) : "";
      if (!photo || !url) return "";
      const box = findBox(photo.boxId);
      return '<div class="scrim" data-action="close-photo"><div class="sheet" data-action="stop"><img src="' + esc(url) + '" alt="Photo of ' + esc(box ? L.boxTitle(box) : "box") + '"><div class="stack"><button type="button" class="btn secondary" data-action="close-photo">Close</button><button type="button" class="btn danger" data-action="delete-photo" data-id="' + esc(photo.id) + '">Delete photo</button></div></div></div>';
    }
    if (state.safetyOpen) {
      return '<div class="scrim" data-action="close-safety"><div class="sheet" data-action="stop">' + safetyCopy() + '<div class="stack"><button type="button" class="btn primary" data-action="ack-safety">Got it</button></div></div></div>';
    }
    return "";
  }

  function boundObject(el) {
    const scope = el.dataset.scope;
    const id = el.dataset.id;
    if (scope === "draft") return state.draft;
    if (scope === "box") return findBox(id);
    if (scope === "wire") return findWire(id);
    if (scope === "group") return state.data.groups.find((group) => group.id === id) || null;
    return null;
  }

  function limitFor(scope, bind) {
    if (scope === "group" && bind === "name") return L.LIMITS.groupName;
    return L.LIMITS[bind] || 4000;
  }

  function onInput(event) {
    const el = event.target;
    if (el.id === "draw-label" || el.id === "draw-color-other") {
      onDrawInput(el);
      return;
    }
    if (el.id === "find-box") {
      state.query = el.value;
      const list = document.getElementById("box-list");
      if (list) list.innerHTML = renderBoxCards();
      return;
    }
    const bind = el.dataset.bind;
    if (!bind) return;
    const obj = boundObject(el);
    if (!obj) return;
    obj[bind] = String(el.value || "").slice(0, limitFor(el.dataset.scope, bind));
    if (bind === "breaker") {
      if (obj.breaker.trim()) {
        if (obj.breakerStatus === "unknown") {
          const chip = document.querySelector('[data-field="breakerStatus"]');
          if (chip) chip.setAttribute("aria-pressed", "false");
        }
        obj.breakerStatus = "known";
      } else if (obj.breakerStatus !== "unknown") obj.breakerStatus = "blank";
    }
    obj.updatedAt = Date.now();
    if (el.dataset.scope === "draft") {
      const button = document.querySelector("[data-action='create-box']");
      if (button && bind === "name") button.disabled = !obj.name.trim();
      return;
    }
    const store = el.dataset.scope === "group" ? "groups" : el.dataset.scope === "box" ? "boxes" : "wires";
    queue(store, "put", obj);
    if (store === "wires") {
      const box = findBox(obj.boxId);
      if (box) {
        box.updatedAt = Date.now();
        queue("boxes", "put", box);
      }
    }
    rememberText();
  }

  function onChange(event) {
    const el = event.target;
    if (el.id === "pick-photo" || el.id === "take-photo") {
      const files = [...(el.files || [])];
      const boxId = state.route.boxId;
      el.value = "";
      if (boxId && files.length) addPhotos(boxId, files);
      return;
    }
    if (el.id === "import-file") {
      const file = el.files && el.files[0];
      el.value = "";
      if (file) readImport(file);
    }
  }

  function onKey(event) {
    const typing = event.target && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA");
    if (!typing && state.route.name === "draw" && (event.metaKey || event.ctrlKey) && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      if (event.shiftKey) redoDraw();
      else undoDraw();
      return;
    }
    if (event.key !== "Escape") return;
    if (state.confirm) {
      state.confirm = null;
      state.pendingImport = null;
      render();
    } else if (state.exportFile) {
      state.exportFile = null;
      render();
    } else if (state.photoId) {
      state.photoId = null;
      render();
    } else if (state.safetyOpen) {
      state.safetyOpen = false;
      render();
    }
  }

  function onClick(event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === "stop") return;
    if (action.indexOf("draw-") === 0) {
      event.preventDefault();
      onDrawAction(action, actionEl);
      return;
    }
    if (action === "confirm-no" || action === "close-export" || action === "close-photo" || action === "close-safety" || action === "ack-safety" || action === "back" || action === "new-box") {
      event.preventDefault();
    }
    if (action === "ack-safety") {
      try { localStorage.setItem(SAFETY_KEY, "1"); } catch (err) { /* ignore */ }
      state.safetyOpen = false;
      render();
      return;
    }
    if (action === "open-safety") {
      state.safetyOpen = true;
      render();
      return;
    }
    if (action === "close-safety" || action === "close-photo") {
      state.safetyOpen = false;
      state.photoId = null;
      render();
      return;
    }
    if (action === "close-export") {
      state.exportFile = null;
      render();
      return;
    }
    if (action === "confirm-no") {
      state.confirm = null;
      state.pendingImport = null;
      render();
      return;
    }
    if (action === "confirm-yes") {
      const fn = state.confirm && state.confirm.onYes;
      state.confirm = null;
      if (fn) fn();
      else render();
      return;
    }
    if (action === "back") {
      flush();
      replaceHash(parentHash(state.route));
      return;
    }
    if (action === "new-box") {
      state.draft = L.blankBox();
      go("#/new");
      return;
    }
    if (action === "create-box") {
      createBox();
      return;
    }
    if (action === "filter-room") {
      state.roomFilter = actionEl.dataset.room === "*" ? "" : actionEl.dataset.room;
      render();
      return;
    }
    if (action === "choice") {
      onChoice(actionEl);
      return;
    }
    if (action === "use-room") {
      const box = state.route.name === "new-box" ? state.draft : findBox(state.route.boxId);
      if (!box) return;
      box.room = actionEl.dataset.room || "";
      box.updatedAt = Date.now();
      if (state.route.name !== "new-box") saveBox(box);
      render();
      return;
    }
    if (action === "use-cable") {
      const wire = findWire(actionEl.dataset.wire);
      if (!wire) return;
      wire.cable = actionEl.dataset.cable || "";
      saveWire(wire);
      render();
      return;
    }
    if (action === "add-wire") {
      addWire(actionEl.dataset.box);
      return;
    }
    if (action === "show-join") {
      state.showJoinFor = actionEl.dataset.wire;
      render();
      return;
    }
    if (action === "make-group") {
      makeGroup(actionEl.dataset.wire);
      return;
    }
    if (action === "pick-group") {
      pickGroup(actionEl.dataset.wire, actionEl.dataset.group);
      return;
    }
    if (action === "pick-box") {
      pickBox(actionEl.dataset.wire, actionEl.dataset.box);
      return;
    }
    if (action === "link-wire") {
      onLink(actionEl.dataset.wire, actionEl.dataset.other);
      return;
    }
    if (action === "create-end") {
      onCreateEnd(actionEl.dataset.wire, actionEl.dataset.box);
      return;
    }
    if (action === "unlink") {
      onUnlink(actionEl.dataset.wire);
      return;
    }
    if (action === "delete-wire") {
      askDeleteWire(actionEl.dataset.wire);
      return;
    }
    if (action === "delete-box") {
      askDeleteBox(actionEl.dataset.box);
      return;
    }
    if (action === "add-nut") {
      addNut(actionEl.dataset.box);
      return;
    }
    if (action === "toggle-nut") {
      state.expandedGroupId = state.expandedGroupId === actionEl.dataset.id ? null : actionEl.dataset.id;
      render();
      return;
    }
    if (action === "toggle-member") {
      toggleMember(actionEl.dataset.group, actionEl.dataset.wire);
      return;
    }
    if (action === "delete-nut") {
      askDeleteNut(actionEl.dataset.id);
      return;
    }
    if (action === "take-photo") {
      const input = document.getElementById("take-photo");
      if (input) input.click();
      return;
    }
    if (action === "pick-photo") {
      const input = document.getElementById("pick-photo");
      if (input) input.click();
      return;
    }
    if (action === "view-photo") {
      state.photoId = actionEl.dataset.id;
      render();
      return;
    }
    if (action === "delete-photo") {
      askDeletePhoto(actionEl.dataset.id);
      return;
    }
    if (action === "toggle-untested") {
      state.showUntested = !state.showUntested;
      render();
      return;
    }
    if (action === "export") {
      prepareExport();
      return;
    }
    if (action === "deliver-export") {
      if (state.exportFile) deliverFile(state.exportFile);
      return;
    }
    if (action === "pick-import") {
      const input = document.getElementById("import-file");
      if (input) input.click();
    }
  }

  function onChoice(el) {
    const obj = boundObject(el);
    if (!obj) return;
    const field = el.dataset.field;
    const value = el.dataset.value;
    const beforeLink = obj.linkedWireId;
    const result = L.applyChoice(obj, field, value);
    if (!result.ok) return;
    if (result.unlink && beforeLink) {
      if (state.data.wires.indexOf(obj) !== -1) {
        const other = L.unlinkWire(state.data, obj.id);
        if (other) queue("wires", "put", other);
      } else obj.linkedWireId = null;
    }
    if (el.dataset.scope === "draft") {
      render();
      return;
    }
    const store = el.dataset.scope === "box" ? "boxes" : "wires";
    queue(store, "put", obj);
    if (store === "wires") {
      const box = findBox(obj.boxId);
      if (box) {
        box.updatedAt = Date.now();
        queue("boxes", "put", box);
      }
    }
    rememberText();
    render();
  }

  function createBox() {
    const draft = state.draft;
    if (!draft || !draft.name.trim()) {
      toast("Give the box a name first.");
      return;
    }
    draft.name = draft.name.trim();
    draft.updatedAt = Date.now();
    state.data.boxes.push(draft);
    state.draft = null;
    queue("boxes", "put", draft);
    rememberText();
    toast("Box added");
    replaceHash("#/box/" + encodeURIComponent(draft.id));
  }

  function addWire(boxId) {
    const box = findBox(boxId);
    if (!box) return;
    const wire = L.blankWire(boxId);
    state.data.wires.push(wire);
    box.updatedAt = Date.now();
    queue("wires", "put", wire);
    queue("boxes", "put", box);
    rememberText();
    go("#/box/" + encodeURIComponent(boxId) + "/wire/" + encodeURIComponent(wire.id));
  }

  function makeGroup(wireId) {
    const wire = findWire(wireId);
    if (!wire) return;
    const group = L.blankGroup(wire.boxId, L.nextGroupName(state.data, wire.boxId));
    state.data.groups.push(group);
    wire.groupId = group.id;
    if (!wire.attachedTo || wire.attachedTo === "unknown") wire.attachedTo = "nut";
    queue("groups", "put", group);
    saveWire(wire);
    render();
  }

  function pickGroup(wireId, groupId) {
    const wire = findWire(wireId);
    if (!wire) return;
    const next = wire.groupId === groupId ? null : groupId;
    const result = L.setWireGroup(state.data, wireId, next);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    if (next && (!wire.attachedTo || wire.attachedTo === "unknown")) wire.attachedTo = "nut";
    saveWire(wire);
    render();
  }

  function pickBox(wireId, boxId) {
    const wire = findWire(wireId);
    if (!wire) return;
    if (wire.linkedWireId && wire.goesToBoxId !== boxId) {
      const other = L.unlinkWire(state.data, wire.id);
      if (other) queue("wires", "put", other);
    }
    wire.goesTo = "box";
    wire.goesToBoxId = boxId;
    wire.goesToLabel = "";
    saveWire(wire);
    render();
  }

  function onLink(wireId, otherId) {
    const result = L.linkWires(state.data, wireId, otherId);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    result.wires.forEach((wire) => queue("wires", "put", wire));
    const boxes = new Set(result.wires.map((wire) => wire.boxId));
    boxes.forEach((id) => {
      const box = findBox(id);
      if (box) {
        box.updatedAt = Date.now();
        queue("boxes", "put", box);
      }
    });
    rememberText();
    render();
  }

  function onCreateEnd(wireId, boxId) {
    const result = L.createLinkedEnd(state.data, wireId, boxId);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    queue("wires", "put", result.wire);
    queue("wires", "put", result.source);
    if (result.previous) queue("wires", "put", result.previous);
    [result.wire.boxId, result.source.boxId].forEach((id) => {
      const box = findBox(id);
      if (box) {
        box.updatedAt = Date.now();
        queue("boxes", "put", box);
      }
    });
    rememberText();
    const otherBox = findBox(result.wire.boxId);
    toast("Other end added in " + (otherBox ? L.boxTitle(otherBox) : "the other box"));
    render();
  }

  function onUnlink(wireId) {
    const other = L.unlinkWire(state.data, wireId);
    const wire = findWire(wireId);
    if (wire) queue("wires", "put", wire);
    if (other) queue("wires", "put", other);
    rememberText();
    render();
  }

  function addNut(boxId) {
    const group = L.blankGroup(boxId, L.nextGroupName(state.data, boxId));
    state.data.groups.push(group);
    queue("groups", "put", group);
    state.expandedGroupId = group.id;
    rememberText();
    render();
  }

  function toggleMember(groupId, wireId) {
    const wire = findWire(wireId);
    if (!wire) return;
    const next = wire.groupId === groupId ? null : groupId;
    const result = L.setWireGroup(state.data, wireId, next);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    if (next && !wire.attachedTo) wire.attachedTo = "nut";
    saveWire(wire);
    render();
  }

  function askDeleteWire(wireId) {
    const wire = findWire(wireId);
    if (!wire) return;
    state.confirm = {
      title: "Remove this wire?",
      body: "It will come off this box. This can't be undone.",
      confirmLabel: "Yes, remove it",
      onYes: function () {
        const result = L.deleteWire(state.data, wireId);
        if (!result.ok) return;
        queue("wires", "del", wireId);
        if (result.previous) queue("wires", "put", result.previous);
        rememberText();
        replaceHash("#/box/" + encodeURIComponent(result.boxId));
      },
    };
    render();
  }

  function askDeleteBox(boxId) {
    const box = findBox(boxId);
    if (!box) return;
    state.confirm = {
      title: "Remove " + L.boxTitle(box) + "?",
      body: "The box, its wires, and its photos will be removed from this phone. This can't be undone.",
      confirmLabel: "Yes, remove it",
      onYes: function () {
        const result = L.deleteBox(state.data, boxId);
        if (!result.ok) return;
        queue("boxes", "del", boxId);
        result.removedWireIds.forEach((id) => queue("wires", "del", id));
        result.removedGroupIds.forEach((id) => queue("groups", "del", id));
        result.removedPhotoIds.forEach((id) => {
          const url = state.urls.get(id);
          if (url) URL.revokeObjectURL(url);
          state.urls.delete(id);
          queue("photos", "del", id);
        });
        result.touched.forEach((wire) => queue("wires", "put", wire));
        (result.removedNodeIds || []).forEach((id) => queue("nodes", "del", id));
        (result.removedStrokeIds || []).forEach((id) => queue("strokes", "del", id));
        rememberText();
        replaceHash("#/");
      },
    };
    render();
  }

  function askDeleteNut(groupId) {
    const group = state.data.groups.find((item) => item.id === groupId);
    if (!group) return;
    state.confirm = {
      title: "Remove " + group.name + "?",
      body: "The wires stay. They just won't be grouped.",
      confirmLabel: "Remove nut",
      onYes: function () {
        const result = L.deleteGroup(state.data, groupId);
        queue("groups", "del", groupId);
        result.touched.forEach((wire) => queue("wires", "put", wire));
        if (state.expandedGroupId === groupId) state.expandedGroupId = null;
        rememberText();
        render();
      },
    };
    render();
  }

  function askDeletePhoto(photoId) {
    state.photoId = null;
    state.confirm = {
      title: "Delete this photo?",
      body: "The box and wires stay.",
      confirmLabel: "Delete photo",
      onYes: function () {
        state.data.photos = state.data.photos.filter((photo) => photo.id !== photoId);
        const url = state.urls.get(photoId);
        if (url) URL.revokeObjectURL(url);
        state.urls.delete(photoId);
        queue("photos", "del", photoId);
        render();
      },
    };
    render();
  }

  function addPhotos(boxId, files) {
    const saved = [];
    let chain = Promise.resolve();
    files.forEach((file) => {
      chain = chain.then(() => {
        if (!file.type || file.type.indexOf("image/") !== 0) {
          toast("That file isn't a photo.");
          return null;
        }
        return compressImage(file).catch(() => {
          if (file.size < 4 * 1024 * 1024) return file;
          throw new Error("unreadable");
        }).then((blob) => {
          const photo = { id: L.uid(), boxId: boxId, createdAt: Date.now(), blob: blob };
          state.data.photos.push(photo);
          state.urls.set(photo.id, URL.createObjectURL(blob));
          return DB.apply([{ store: "photos", type: "put", value: photo }]).then(() => {
            saved.push(photo.id);
          }).catch((err) => {
            console.error(err);
            state.data.photos = state.data.photos.filter((item) => item.id !== photo.id);
            const url = state.urls.get(photo.id);
            if (url) URL.revokeObjectURL(url);
            state.urls.delete(photo.id);
            toast("Not enough room for that photo. Export a backup, then remove an old one.");
          });
        }).catch(() => {
          toast("Couldn't read that photo. Try a smaller one.");
        });
      });
    });
    return chain.then(() => {
      if (!saved.length) return;
      const box = findBox(boxId);
      if (box) {
        box.updatedAt = Date.now();
        queue("boxes", "put", box);
        rememberText();
      }
      toast(saved.length === 1 ? "Photo saved" : saved.length + " photos saved");
      render();
    });
  }

  function compressImage(file) {
    return createImageBitmap(file).then((bitmap) => new Promise((resolve, reject) => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (bitmap.close) bitmap.close();
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("empty"));
        else resolve(blob);
      }, "image/jpeg", 0.72);
    }));
  }

  function prepareExport() {
    toast("Preparing backup…");
    flush().then(() => {
      const photos = [];
      let skipped = 0;
      let chain = Promise.resolve();
      state.data.photos.forEach((photo) => {
        chain = chain.then(() => blobToBase64(photo.blob).then((data) => {
          photos.push({
            id: photo.id,
            boxId: photo.boxId,
            createdAt: photo.createdAt,
            type: (photo.blob && photo.blob.type) || "image/jpeg",
            dataBase64: data,
          });
        }).catch(() => { skipped += 1; }));
      });
      return chain.then(() => ({ photos: photos, skipped: skipped }));
    }).then((result) => {
      const payload = {
        app: "wire-tracker",
        version: 2,
        exportedAt: new Date().toISOString(),
        boxes: state.data.boxes,
        wires: state.data.wires,
        groups: state.data.groups,
        diagrams: state.data.diagrams || [],
        nodes: state.data.nodes || [],
        strokes: state.data.strokes || [],
        photos: result.photos,
      };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      state.exportFile = new File([blob], backupName(), { type: "application/json" });
      if (result.skipped) toast(result.skipped + " photo couldn't be added.");
      render();
    }).catch((err) => {
      console.error(err);
      toast("Couldn't make the backup.");
    });
  }

  function backupName() {
    const date = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return "wire-tracker-" + date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + ".json";
  }

  function deliverFile(file) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Wire Tracker backup" }).then(() => {
        state.exportFile = null;
        render();
      }).catch((err) => {
        if (err && err.name === "AbortError") return;
        downloadFile(file);
      });
      return;
    }
    downloadFile(file);
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    state.exportFile = null;
    toast("Backup downloaded");
    render();
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const comma = text.indexOf(",");
        resolve(comma >= 0 ? text.slice(comma + 1) : text);
      };
      reader.onerror = () => reject(reader.error || new Error("read failed"));
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(data, type) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: type || "image/jpeg" });
  }

  function readImport(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result || "").replace(/^\uFEFF/, ""));
      } catch (err) {
        toast("That file isn't a backup this app can read.");
        return;
      }
      const result = L.importBackup(parsed);
      if (!result.ok) {
        toast(result.error);
        return;
      }
      state.pendingImport = result;
      const hasCurrent = state.data.boxes.length || state.data.wires.length || state.data.photos.length;
      let body = hasCurrent
        ? "This phone has " + inventory(state.data, state.data.photos.length) + ". The file has " + inventory(result.data, result.photos.length) + ". Notes on this phone will be replaced."
        : "The file has " + inventory(result.data, result.photos.length) + ".";
      if (result.skippedPhotos) body += " " + result.skippedPhotos + (result.skippedPhotos === 1 ? " photo was skipped." : " photos were skipped.");
      state.confirm = {
        title: hasCurrent ? "Replace notes on this phone?" : "Load this backup?",
        body: body,
        confirmLabel: hasCurrent ? "Replace with backup" : "Load backup",
        onYes: applyImport,
      };
      render();
    };
    reader.onerror = () => toast("Couldn't read that file.");
    reader.readAsText(file);
  }

  function applyImport() {
    const pendingImport = state.pendingImport;
    state.pendingImport = null;
    if (!pendingImport) return;
    const photos = [];
    let skipped = pendingImport.skippedPhotos || 0;
    pendingImport.photos.forEach((photo) => {
      try {
        photos.push({
          id: photo.id,
          boxId: photo.boxId,
          createdAt: photo.createdAt,
          blob: base64ToBlob(photo.dataBase64, photo.type),
        });
      } catch (err) {
        skipped += 1;
      }
    });
    const next = {
      boxes: pendingImport.data.boxes,
      wires: pendingImport.data.wires,
      groups: pendingImport.data.groups,
      diagrams: pendingImport.data.diagrams || [],
      nodes: pendingImport.data.nodes || [],
      strokes: pendingImport.data.strokes || [],
      photos: photos,
    };
    pending.clear();
    clearTimeout(flushTimer);
    DB.replaceAll(next).then(() => {
      state.data = next;
      refreshUrls();
      rememberText();
      try { localStorage.setItem(STAMP_KEY, String(state.stamp)); } catch (err) { /* ignore */ }
      let message = "Backup loaded. " + inventory(next, photos.length) + ".";
      if (skipped) message += " Skipped " + skipped + (skipped === 1 ? " photo." : " photos.");
      toast(message);
      replaceHash("#/");
    }).catch((err) => {
      console.error(err);
      toast("Couldn't load that backup. The notes on this phone were left as they were.");
      render();
    });
  }

  function findDiagram(id) {
    return (state.data.diagrams || []).find((diagram) => diagram.id === id) || null;
  }

  function textSnapshot() {
    return JSON.parse(JSON.stringify({
      boxes: state.data.boxes,
      wires: state.data.wires,
      groups: state.data.groups,
      diagrams: state.data.diagrams || [],
      nodes: state.data.nodes || [],
      strokes: state.data.strokes || [],
    }));
  }

  function syncText(before, after) {
    ["boxes", "wires", "groups", "diagrams", "nodes", "strokes"].forEach((name) => {
      const next = after[name] || [];
      const prev = before[name] || [];
      const ids = new Set(next.map((item) => item.id));
      prev.forEach((item) => {
        if (!ids.has(item.id)) queue(name, "del", item.id);
      });
      next.forEach((item) => queue(name, "put", item));
    });
  }

  function pushUndo() {
    drawHist.undo.push(textSnapshot());
    if (drawHist.undo.length > 40) drawHist.undo.shift();
    drawHist.redo = [];
  }

  function applySnapshot(snap) {
    const before = textSnapshot();
    state.data.boxes = snap.boxes;
    state.data.wires = snap.wires;
    state.data.groups = snap.groups;
    state.data.diagrams = snap.diagrams;
    state.data.nodes = snap.nodes;
    state.data.strokes = snap.strokes;
    syncText(before, snap);
    rememberText();
  }

  function undoDraw() {
    if (!drawHist.undo.length) return;
    drawHist.redo.push(textSnapshot());
    const snap = drawHist.undo.pop();
    applySnapshot(snap);
    state.selection = null;
    if (state.route.name === "draw" && !findDiagram(state.route.diagramId)) {
      replaceHash("#/drawings");
      return;
    }
    render();
  }

  function redoDraw() {
    if (!drawHist.redo.length) return;
    drawHist.undo.push(textSnapshot());
    const snap = drawHist.redo.pop();
    applySnapshot(snap);
    state.selection = null;
    render();
  }

  function commitDrawing(mutator) {
    pushUndo();
    const before = drawHist.undo[drawHist.undo.length - 1];
    const result = mutator(state.data);
    syncText(before, textSnapshot());
    rememberText();
    return result;
  }

  function drawNodes(diagramId) {
    return (state.data.nodes || []).filter((node) => node.diagramId === diagramId);
  }

  function drawStrokes(diagramId) {
    return (state.data.strokes || []).filter((stroke) => stroke.diagramId === diagramId);
  }

  const drawApi = {
    getModel: function () {
      const diagram = findDiagram(state.route.diagramId) || { viewX: 28, viewY: 28, viewScale: 1 };
      return {
        diagram: diagram,
        nodes: drawNodes(diagram.id),
        strokes: drawStrokes(diagram.id),
        boxes: state.data.boxes,
        view: {
          get x() { return diagram.viewX; },
          set x(value) { diagram.viewX = value; },
          get y() { return diagram.viewY; },
          set y(value) { diagram.viewY = value; },
          get scale() { return diagram.viewScale || 1; },
          set scale(value) { diagram.viewScale = value; },
        },
        tool: state.drawTool,
        color: state.drawColor,
        selection: state.selection,
        rubber: state.rubber,
      };
    },
    setRubber: function (rubber) { state.rubber = rubber; },
    saveView: function () {
      const diagram = findDiagram(state.route.diagramId);
      if (!diagram) return;
      diagram.updatedAt = Date.now();
      queue("diagrams", "put", diagram);
      rememberText();
    },
    armUndo: function () { pushUndo(); },
    cancelUndo: function () { drawHist.undo.pop(); },
    previewMove: function (id, x, y) { L.moveDrawnNode(state.data, id, x, y); },
    commitMove: function () {
      const before = drawHist.undo[drawHist.undo.length - 1];
      if (before) syncText(before, textSnapshot());
      rememberText();
      if (drawHandle) drawHandle.redraw();
    },
    place: function (x, y) {
      const diagram = findDiagram(state.route.diagramId);
      if (!diagram) return;
      const shape = L.DRAW_SHAPES.find((item) => item.id === state.drawShape) || L.DRAW_SHAPES[0];
      const count = drawNodes(diagram.id).filter((node) => node.kind === shape.id).length;
      commitDrawing((data) => L.addDrawnBox(data, {
        diagramId: diagram.id,
        kind: shape.id,
        name: count ? shape.label + " " + (count + 1) : shape.label,
        x: x - L.NODE_W / 2,
        y: y - L.NODE_H / 2,
      }));
      render();
    },
    connect: function (fromId, toId) {
      const result = commitDrawing((data) => L.addDrawnStroke(data, {
        fromNodeId: fromId,
        toNodeId: toId,
        kind: state.drawTool === "cable" ? "cable" : "wire",
        conductors: state.drawConductors,
        color: state.drawColor,
        colorOther: state.drawColorOther,
      }));
      if (!result.ok) {
        drawHist.undo.pop();
        toast(result.error);
        if (drawHandle) drawHandle.redraw();
        return;
      }
      render();
    },
    select: function (hit) {
      state.selection = hit;
      state.labelUndo = false;
      render();
    },
  };

  function renderDrawings() {
    const diagrams = state.data.diagrams || [];
    const cards = diagrams.map((diagram) => {
      const count = drawNodes(diagram.id).length;
      return '<a class="box-card" href="#/draw/' + encodeURIComponent(diagram.id) + '"><h2>' + esc(diagram.name || "Drawing") + "</h2><p class=\"meta\">" +
        (count ? countPhrase(count, "box", "boxes") : "Empty") + "</p></a>";
    }).join("");
    return '<div class="topbar"><button type="button" class="back" data-action="back">Boxes</button>' + safetyButton() + "</div>" +
      "<h1>Draw</h1><p class=\"lede\">Drop boxes on the page. Drag a finger from one box to another to add a wire.</p>" +
      '<div class="stack"><button type="button" class="btn primary" data-action="draw-new">New drawing</button>' +
      '<button type="button" class="btn secondary" data-action="draw-example">Garage example</button></div>' +
      cards;
  }

  function drawHint() {
    if (state.drawTool === "box") return "Tap the page to drop a box.";
    if (state.drawTool === "wire") return "Drag from one box to another.";
    if (state.drawTool === "cable") return "Drag a whole cable from box to box.";
    return "Drag a box. Tap it to edit.";
  }

  function renderDraw(diagramId) {
    const diagram = findDiagram(diagramId);
    if (!diagram) return renderMissing("That drawing");
    const nodes = drawNodes(diagramId);
    const selectedNode = state.selection && state.selection.type === "node"
      ? nodes.find((node) => node.id === state.selection.id) : null;
    const selectedStroke = state.selection && state.selection.type === "stroke"
      ? drawStrokes(diagramId).find((stroke) => stroke.id === state.selection.id) : null;
    const tools = [
      ["move", "Move"],
      ["box", "Add box"],
      ["wire", "Wire"],
      ["cable", "Cable"],
    ].map((pair) => '<button type="button" class="tool" aria-pressed="' + (state.drawTool === pair[0]) + '" data-action="draw-tool" data-tool="' + pair[0] + '">' + pair[1] + "</button>").join("");
    let extra = "";
    if (!state.selection && state.drawTool === "box") {
      extra = '<div class="choice-row">' + L.DRAW_SHAPES.map((shape) => '<button type="button" class="mini" aria-pressed="' + (state.drawShape === shape.id) + '" data-action="draw-shape" data-shape="' + shape.id + '">' + esc(shape.label) + "</button>").join("") + "</div>";
    } else if (!state.selection && state.drawTool === "wire") {
      extra = '<div class="choice-row">' + L.DRAW_COLORS.map((color) => {
        const style = L.colorStyle({ color: color.id });
        const caution = color.id === "other" ? " caution" : "";
        return '<button type="button" class="mini' + caution + '" aria-pressed="' + (state.drawColor === color.id) + '" data-action="draw-color" data-color="' + color.id + '"><span class="swatch-dot" style="background:' + style.fill + ";border-color:" + style.border + '"></span>' + esc(color.label) + "</button>";
      }).join("") + "</div>";
      if (state.drawColor === "other") {
        extra += '<input id="draw-color-other" type="text" maxlength="40" placeholder="Color name" autocomplete="off" value="' + esc(state.drawColorOther) + '" style="margin-top:8px">';
      }
    } else if (!state.selection && state.drawTool === "cable") {
      extra = '<div class="choice-row"><button type="button" class="mini" aria-pressed="' + (state.drawConductors === 2) + '" data-action="draw-conductors" data-n="2">2-wire</button><button type="button" class="mini" aria-pressed="' + (state.drawConductors === 3) + '" data-action="draw-conductors" data-n="3">3-wire</button></div>';
    }
    let sheet = "";
    if (selectedNode) {
      const box = findBox(selectedNode.boxId);
      sheet = '<div class="draw-sheet"><label class="field-label" for="draw-label">Name</label><input id="draw-label" type="text" maxlength="80" autocomplete="off" value="' + esc(box ? box.name : "") + '">' +
        '<div class="stack"><button type="button" class="mini caution" aria-pressed="' + !!(box && box.unsure) + '" data-action="draw-unsure">Not sure</button>' +
        '<a class="btn secondary" href="#/box/' + encodeURIComponent(selectedNode.boxId) + '">Open box</a>' +
        '<button type="button" class="btn danger" data-action="draw-delete">Remove this box</button>' +
        '<button type="button" class="btn primary" data-action="draw-done">Done</button></div></div>';
    } else if (selectedStroke) {
      const wireColors = selectedStroke.kind === "wire"
        ? '<div class="choice-row">' + L.DRAW_COLORS.map((color) => {
          const style = L.colorStyle({ color: color.id });
          return '<button type="button" class="mini" aria-pressed="' + (selectedStroke.color === color.id) + '" data-action="draw-recolor" data-color="' + color.id + '"><span class="swatch-dot" style="background:' + style.fill + '"></span>' + esc(color.label) + "</button>";
        }).join("") + "</div>"
        : "";
      sheet = '<div class="draw-sheet"><h2>' + (selectedStroke.kind === "cable" ? (selectedStroke.conductors === 3 ? "3-wire cable" : "2-wire cable") : "Wire") + "</h2>" +
        '<label class="field-label" for="draw-label">Label</label><input id="draw-label" type="text" maxlength="80" autocomplete="off" placeholder="Optional" value="' + esc(selectedStroke.label || "") + '">' +
        wireColors +
        '<div class="stack"><button type="button" class="mini caution" aria-pressed="' + !!selectedStroke.unsure + '" data-action="draw-unsure">Not sure</button>' +
        '<button type="button" class="btn danger" data-action="draw-delete">Remove this wire</button>' +
        '<button type="button" class="btn primary" data-action="draw-done">Done</button></div></div>';
    }
    const dock = sheet || ('<div class="draw-dock"><div class="tool-row">' + tools + "</div>" + extra + "</div>");
    return '<div class="draw-top"><button type="button" class="back" data-action="back">Back</button><strong>' + esc(diagram.name || "Drawing") + "</strong>" +
      '<button type="button" class="text-btn" data-action="draw-undo"' + (drawHist.undo.length ? "" : " disabled") + ">Undo</button>" +
      '<button type="button" class="text-btn" data-action="draw-redo"' + (drawHist.redo.length ? "" : " disabled") + ">Redo</button></div>" +
      '<p class="draw-hint">' + esc(drawHint()) + "</p>" +
      '<div class="draw-stage"><canvas id="draw-canvas" aria-label="Drawing of ' + esc(diagram.name || "your boxes") + '"></canvas>' +
      (nodes.length || state.drawTool === "box" ? "" : '<p class="draw-empty">Tap Add box, then tap the page.</p>') +
      "</div>" + dock;
  }

  function onDrawInput(el) {
    if (el.id === "draw-color-other") {
      state.drawColorOther = el.value.slice(0, 40);
      return;
    }
    if (!state.labelUndo) {
      pushUndo();
      state.labelUndo = true;
    }
    const before = drawHist.undo[drawHist.undo.length - 1];
    if (state.selection && state.selection.type === "node") L.renameDrawnNode(state.data, state.selection.id, el.value);
    if (state.selection && state.selection.type === "stroke") L.renameDrawnStroke(state.data, state.selection.id, el.value);
    if (before) syncText(before, textSnapshot());
    rememberText();
    const title = document.querySelector(".draw-top strong");
    if (state.selection && state.selection.type === "node" && title) {
      const node = (state.data.nodes || []).find((item) => item.id === state.selection.id);
      const box = node && findBox(node.boxId);
      if (box && findDiagram(state.route.diagramId) && node.diagramId === state.route.diagramId) {
        /* keep the drawing title */
      }
    }
    if (drawHandle) drawHandle.redraw();
  }

  function onDrawAction(action, el) {
    if (action === "draw-tool") {
      state.drawTool = el.dataset.tool || "move";
      state.selection = null;
      render();
      return;
    }
    if (action === "draw-shape") {
      state.drawShape = el.dataset.shape;
      state.drawTool = "box";
      render();
      return;
    }
    if (action === "draw-color") {
      state.drawColor = el.dataset.color;
      state.drawTool = "wire";
      render();
      return;
    }
    if (action === "draw-conductors") {
      state.drawConductors = Number(el.dataset.n) === 3 ? 3 : 2;
      state.drawTool = "cable";
      render();
      return;
    }
    if (action === "draw-undo") { undoDraw(); return; }
    if (action === "draw-redo") { redoDraw(); return; }
    if (action === "draw-done") {
      state.selection = null;
      state.labelUndo = false;
      render();
      return;
    }
    if (action === "draw-new") {
      const diagram = L.blankDiagram("Drawing " + ((state.data.diagrams || []).length + 1));
      state.data.diagrams = state.data.diagrams || [];
      state.data.diagrams.push(diagram);
      queue("diagrams", "put", diagram);
      rememberText();
      state.drawTool = "box";
      go("#/draw/" + encodeURIComponent(diagram.id));
      return;
    }
    if (action === "draw-example") {
      const existing = (state.data.diagrams || []).find((diagram) => diagram.example);
      if (existing) {
        go("#/draw/" + encodeURIComponent(existing.id));
        return;
      }
      const built = L.garageExample();
      commitDrawing((data) => {
        if (!data.diagrams) data.diagrams = [];
        if (!data.nodes) data.nodes = [];
        if (!data.strokes) data.strokes = [];
        built.diagrams.forEach((item) => data.diagrams.push(item));
        built.boxes.forEach((item) => data.boxes.push(item));
        built.nodes.forEach((item) => data.nodes.push(item));
        built.wires.forEach((item) => data.wires.push(item));
        built.strokes.forEach((item) => data.strokes.push(item));
      });
      go("#/draw/" + encodeURIComponent(built.diagrams[0].id));
      return;
    }
    if (action === "draw-unsure") {
      if (!state.selection) return;
      commitDrawing((data) => {
        if (state.selection.type === "node") {
          const node = data.nodes.find((item) => item.id === state.selection.id);
          const box = node && data.boxes.find((item) => item.id === node.boxId);
          L.setNodeUnsure(data, state.selection.id, !(box && box.unsure));
        } else {
          const stroke = data.strokes.find((item) => item.id === state.selection.id);
          L.setStrokeUnsure(data, state.selection.id, !(stroke && stroke.unsure));
        }
      });
      render();
      return;
    }
    if (action === "draw-recolor") {
      if (!state.selection || state.selection.type !== "stroke") return;
      commitDrawing((data) => L.recolorDrawnStroke(data, state.selection.id, el.dataset.color, state.drawColorOther));
      render();
      return;
    }
    if (action === "draw-delete") {
      if (!state.selection) return;
      const selection = state.selection;
      const node = selection.type === "node";
      state.confirm = {
        title: node ? "Remove this box?" : "Remove this wire?",
        body: node ? "The box and the wires drawn to it come off this phone." : "The wire comes off both boxes.",
        confirmLabel: node ? "Yes, remove it" : "Remove wire",
        onYes: function () {
          let photoIds = [];
          commitDrawing((data) => {
            const result = node ? L.deleteDrawnNode(data, selection.id) : L.deleteDrawnStroke(data, selection.id);
            if (result && result.boxResult && result.boxResult.removedPhotoIds) photoIds = result.boxResult.removedPhotoIds;
          });
          photoIds.forEach((id) => {
            const url = state.urls.get(id);
            if (url) URL.revokeObjectURL(url);
            state.urls.delete(id);
            queue("photos", "del", id);
          });
          state.selection = null;
          render();
        },
      };
      render();
    }
  }

  function init() {
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    document.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onRoute);
    window.addEventListener("pagehide", () => { flush(); });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flush();
    });
    loadData().then((loaded) => {
      state.data = {
        boxes: loaded.boxes,
        wires: loaded.wires,
        groups: loaded.groups,
        diagrams: loaded.diagrams || [],
        nodes: loaded.nodes || [],
        strokes: loaded.strokes || [],
        photos: loaded.photos,
      };
      refreshUrls();
      if (!location.hash) location.replace("#/");
      state.route = parseHash();
      if (state.route.focus) state.focusSection = state.route.focus;
      const exceptId = state.route.name === "wire" ? state.route.wireId : null;
      if (pruneEmptyWires(exceptId)) rememberText();
      state.ready = true;
      render();
      if (loaded.idbError) toast("Photo storage didn't open. Written notes were restored if this phone had them.");
      const host = location.hostname;
      const local = host === "localhost" || host === "127.0.0.1";
      if ("serviceWorker" in navigator && !local) navigator.serviceWorker.register("sw.js").catch(() => {});
    }).catch((err) => {
      console.error(err);
      state.ready = true;
      document.getElementById("app").innerHTML = '<h1>Wire Tracker</h1><p class="lede">This browser blocked local storage, so notes can\'t be saved here. Try Safari or Chrome with private mode off.</p>';
    });
  }

  init();
})();
