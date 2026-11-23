/* Pure data rules for Wire Tracker. No DOM, no storage. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WireLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const BOX_TYPES = [
    { id: "switch", label: "Switch" },
    { id: "outlet", label: "Outlet" },
    { id: "light", label: "Light" },
    { id: "junction", label: "Junction" },
    { id: "panel", label: "Panel" },
    { id: "other", label: "Other" },
  ];

  const COLORS = [
    { id: "black", label: "Black", fill: "#222222", ink: "#ffffff", border: "#222222" },
    { id: "white", label: "White", fill: "#f7f7f5", ink: "#222222", border: "#8a847a" },
    { id: "red", label: "Red", fill: "#d21f1f", ink: "#ffffff", border: "#d21f1f" },
    { id: "bare", label: "Bare copper", fill: "#d7a15e", ink: "#2a2118", border: "#a67a3d" },
    { id: "green", label: "Green", fill: "#2f8f46", ink: "#ffffff", border: "#2f8f46" },
    { id: "blue", label: "Blue", fill: "#1d6fd4", ink: "#ffffff", border: "#1d6fd4" },
    { id: "yellow", label: "Yellow", fill: "#f2c200", ink: "#2a2118", border: "#c9a000" },
    { id: "other", label: "Other", fill: "#8d6b9a", ink: "#ffffff", border: "#8d6b9a" },
    { id: "unknown", label: "Not sure", fill: "#fff1d6", ink: "#7a4508", border: "#e3b15a" },
  ];

  const ATTACHMENTS = [
    { id: "switch", label: "Switch terminal" },
    { id: "outlet", label: "Outlet screw" },
    { id: "nut", label: "Wire nut" },
    { id: "pigtail", label: "Pigtail" },
    { id: "ground", label: "Ground screw" },
    { id: "other", label: "Something else" },
    { id: "unknown", label: "Not sure" },
  ];

  const DESTINATIONS = [
    { id: "box", label: "Another box" },
    { id: "light", label: "A light" },
    { id: "panel", label: "The panel" },
    { id: "other", label: "Somewhere else" },
    { id: "unknown", label: "Not sure" },
  ];

  const TESTED = [
    { id: "untested", label: "Not tested yet" },
    { id: "live", label: "Tester beeped" },
    { id: "dead", label: "No beep" },
  ];

  const COLOR_ORDER = ["black", "red", "blue", "yellow", "other", "white", "bare", "green", "unknown", ""];

  const ALLOWED = {
    color: new Set(COLORS.map((item) => item.id)),
    attachedTo: new Set(ATTACHMENTS.map((item) => item.id)),
    goesTo: new Set(DESTINATIONS.map((item) => item.id)),
    tested: new Set(["untested", "live", "dead"]),
    type: new Set(BOX_TYPES.map((item) => item.id)),
  };

  const LIMITS = {
    name: 80,
    room: 60,
    typeOther: 40,
    breaker: 80,
    notes: 4000,
    cable: 120,
    colorOther: 40,
    attachedDetail: 80,
    goesToLabel: 120,
    groupName: 60,
  };

  function uid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function clip(value, max) {
    if (typeof value !== "string") return "";
    return value.replace(/\u0000/g, "").slice(0, max);
  }

  function cleanId(value) {
    if (typeof value !== "string") return "";
    const id = value.trim();
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return "";
    return id;
  }

  function asTime(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return Date.now();
    return n;
  }

  function blankBox() {
    const now = Date.now();
    return {
      id: uid(),
      name: "",
      room: "",
      type: "",
      typeOther: "",
      breaker: "",
      breakerStatus: "blank",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
  }

  function blankWire(boxId) {
    const now = Date.now();
    return {
      id: uid(),
      boxId: boxId,
      color: "",
      colorOther: "",
      cable: "",
      attachedTo: "",
      attachedDetail: "",
      goesTo: "",
      goesToBoxId: null,
      goesToLabel: "",
      linkedWireId: null,
      tested: "",
      notes: "",
      groupId: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  function blankGroup(boxId, name) {
    const now = Date.now();
    return {
      id: uid(),
      boxId: boxId,
      name: name || "Wire nut",
      createdAt: now,
      updatedAt: now,
    };
  }

  function boxTitle(box) {
    const name = box && typeof box.name === "string" ? box.name.trim() : "";
    return name || "Untitled box";
  }

  function typeLabel(box) {
    if (!box || !box.type) return "";
    if (box.type === "other") return (box.typeOther || "").trim() || "Other";
    const found = BOX_TYPES.find((item) => item.id === box.type);
    return found ? found.label : "";
  }

  function breakerLabel(box) {
    if (!box) return "";
    const text = (box.breaker || "").trim();
    if (box.breakerStatus === "unknown") {
      return text ? "Breaker not sure (" + text + ")" : "Breaker not sure";
    }
    return text ? "Breaker " + text : "";
  }

  function wireTitle(wire) {
    if (!wire) return "Wire";
    if (wire.color === "bare") return "Bare copper";
    if (wire.color === "other") {
      const name = (wire.colorOther || "").trim();
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Other color";
    }
    if (wire.color && wire.color !== "unknown") {
      const found = COLORS.find((item) => item.id === wire.color);
      return (found ? found.label : "Wire") + " wire";
    }
    const cable = (wire.cable || "").trim();
    if (cable) return "Wire, " + cable;
    return "Wire";
  }

  function colorStyle(wire) {
    const empty = { fill: "#d9d3c7", ink: "#1e1a16", border: "#8a847a" };
    if (!wire || !wire.color) return empty;
    if (wire.color === "other") return { fill: "#8d6b9a", ink: "#ffffff", border: "#8d6b9a" };
    const found = COLORS.find((item) => item.id === wire.color);
    return found
      ? { fill: found.fill, ink: found.ink, border: found.border || found.fill }
      : empty;
  }

  function wireHasContent(wire) {
    if (!wire) return false;
    return Boolean(
      wire.color ||
        (wire.colorOther || "").trim() ||
        (wire.cable || "").trim() ||
        wire.attachedTo ||
        (wire.attachedDetail || "").trim() ||
        wire.goesTo ||
        wire.goesToBoxId ||
        (wire.goesToLabel || "").trim() ||
        wire.linkedWireId ||
        wire.tested ||
        (wire.notes || "").trim() ||
        wire.groupId
    );
  }

  function attachmentLabel(wire, data) {
    if (!wire || !wire.attachedTo) return "";
    if (wire.attachedTo === "unknown") return "Attachment not sure";
    if (wire.attachedTo === "nut") {
      const group = (data.groups || []).find((item) => item.id === wire.groupId);
      return group ? group.name : "Wire nut";
    }
    const found = ATTACHMENTS.find((item) => item.id === wire.attachedTo);
    const base = found ? found.label : "";
    const detail = (wire.attachedDetail || "").trim();
    if (detail && wire.attachedTo !== "unknown") return base + " (" + detail + ")";
    return base;
  }

  function destinationLabel(wire, data) {
    if (!wire || !wire.goesTo) return "";
    if (wire.goesTo === "unknown") {
      const was = (wire.goesToLabel || "").trim();
      return was ? "Was " + was : "Where it goes: not sure";
    }
    if (wire.goesTo === "box") {
      const box = (data.boxes || []).find((item) => item.id === wire.goesToBoxId);
      const name = box ? boxTitle(box) : "another box";
      if (!wire.goesToBoxId) return "Another box";
      if (wire.linkedWireId) {
        const other = (data.wires || []).find((item) => item.id === wire.linkedWireId);
        return other ? "Linked to " + name + " · " + wireTitle(other) : "Linked to " + name;
      }
      return "Goes to " + name;
    }
    if (wire.goesTo === "light") {
      const label = (wire.goesToLabel || "").trim();
      return label ? "To " + label : "To a light";
    }
    if (wire.goesTo === "panel") {
      const label = (wire.goesToLabel || "").trim();
      return label ? "To the panel · " + label : "To the panel";
    }
    if (wire.goesTo === "other") return (wire.goesToLabel || "").trim() || "Somewhere else";
    return "";
  }

  function shortName(value, max) {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    if (text.length <= max) return text;
    return text.slice(0, Math.max(1, max - 1)).trim() + "…";
  }

  function issue(partial) {
    return {
      id: partial.id,
      kind: partial.kind,
      field: partial.field,
      focus: partial.focus,
      boxId: partial.boxId,
      wireId: partial.wireId || null,
      text: partial.text,
      short: partial.short,
    };
  }

  function wireIssues(wire, data) {
    const issues = [];
    const title = wireTitle(wire);
    function add(field, focus, phrase, short) {
      issues.push(issue({
        id: wire.id + ":" + field,
        kind: "wire",
        field: field,
        focus: focus,
        boxId: wire.boxId,
        wireId: wire.id,
        text: title + ": " + phrase,
        short: short,
      }));
    }
    if (wire.color === "unknown") add("color", "field-color", "what color is it?", "Color?");
    if (wire.attachedTo === "unknown") add("attached", "field-attached", "what is it attached to?", "Attached to?");
    if (wire.attachedTo === "nut" && !wire.groupId) add("nut", "field-attached", "which wire nut?", "Which nut?");
    if (wire.goesTo === "unknown") {
      const was = (wire.goesToLabel || "").trim();
      add("goes", "field-goes", was ? "where does it go? (was " + was + ")" : "where does it go?", "Where to?");
    }
    if (wire.goesTo === "box" && !wire.goesToBoxId) {
      add("which-box", "field-goes", "which box does it go to?", "Which box?");
    }
    if (wire.goesTo === "box" && wire.goesToBoxId && !wire.linkedWireId) {
      const other = (data.boxes || []).find((item) => item.id === wire.goesToBoxId);
      const name = other ? boxTitle(other) : "the other box";
      add("link", "field-goes", "link the other end in " + name, "Link other end");
    }
    if (wire.goesTo === "box" && wire.linkedWireId) {
      const other = (data.wires || []).find((item) => item.id === wire.linkedWireId);
      if (!other) add("missing", "field-goes", "the other end is missing", "Other end missing");
    }
    return issues;
  }

  function boxIssues(box) {
    if (!box || box.breakerStatus !== "unknown") return [];
    return [issue({
      id: box.id + ":breaker",
      kind: "breaker",
      field: "breaker",
      focus: "field-breaker",
      boxId: box.id,
      text: "Which breaker controls it?",
      short: "Breaker?",
    })];
  }

  function allIssues(data) {
    const list = [];
    const boxes = [...(data.boxes || [])].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      list.push.apply(list, boxIssues(box));
      const wires = (data.wires || [])
        .filter((wire) => wire.boxId === box.id)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      for (let j = 0; j < wires.length; j++) list.push.apply(list, wireIssues(wires[j], data));
    }
    return list;
  }

  function untestedWires(data) {
    return (data.wires || []).filter((wire) => wireHasContent(wire) && !wire.tested);
  }

  function filledCount(wire) {
    let n = 0;
    if (wire.color) n += 1;
    if ((wire.cable || "").trim()) n += 1;
    if (wire.attachedTo) n += 1;
    if (wire.goesTo) n += 1;
    if (wire.tested) n += 1;
    return { n: n, total: 5 };
  }

  function cablesInBox(data, boxId) {
    const seen = new Set();
    const list = [];
    (data.wires || []).forEach((wire) => {
      if (wire.boxId !== boxId) return;
      const cable = (wire.cable || "").trim();
      const key = cable.toLowerCase();
      if (!cable || seen.has(key)) return;
      seen.add(key);
      list.push(cable);
    });
    return list;
  }

  function rooms(boxes) {
    const seen = new Set();
    const list = [];
    (boxes || []).forEach((box) => {
      const room = (box.room || "").trim();
      const key = room.toLowerCase();
      if (!room || seen.has(key)) return;
      seen.add(key);
      list.push(room);
    });
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }

  function nextGroupName(data, boxId) {
    const used = new Set(
      (data.groups || []).filter((group) => group.boxId === boxId).map((group) => group.name)
    );
    let i = 1;
    while (used.has("Wire nut " + i)) i += 1;
    return "Wire nut " + i;
  }

  function applyChoice(entity, field, value) {
    if (!entity || typeof entity !== "object") return { ok: false };
    if (field === "breakerStatus") {
      if (entity.breakerStatus === "unknown") {
        entity.breakerStatus = String(entity.breaker || "").trim() ? "known" : "blank";
      } else {
        entity.breakerStatus = "unknown";
      }
      entity.updatedAt = Date.now();
      return { ok: true };
    }
    const allowed = ALLOWED[field];
    if (!allowed || !allowed.has(value)) return { ok: false };
    if (field === "tested") {
      entity.tested = value === "untested" ? "" : value;
      entity.updatedAt = Date.now();
      return { ok: true };
    }
    const clearing = entity[field] === value;
    entity[field] = clearing ? "" : value;
    if (field === "goesTo" && entity.goesTo !== "box") entity.goesToBoxId = null;
    entity.updatedAt = Date.now();
    return { ok: true, cleared: clearing, unlink: field === "goesTo" && entity.goesTo !== "box" };
  }

  function findWire(data, id) {
    return (data.wires || []).find((wire) => wire.id === id) || null;
  }

  function unlinkWire(data, wireId) {
    const wire = findWire(data, wireId);
    if (!wire || !wire.linkedWireId) return null;
    const other = findWire(data, wire.linkedWireId);
    wire.linkedWireId = null;
    wire.updatedAt = Date.now();
    if (other && other.linkedWireId === wireId) {
      other.linkedWireId = null;
      other.updatedAt = Date.now();
      return other;
    }
    return null;
  }

  function linkWires(data, aId, bId) {
    const a = findWire(data, aId);
    const b = findWire(data, bId);
    if (!a || !b) return { ok: false, error: "Can't find that wire." };
    if (a.id === b.id) return { ok: false, error: "Pick the wire on the other end." };
    if (a.boxId === b.boxId) return { ok: false, error: "Pick a wire in the other box." };
    const touched = [];
    const leftA = unlinkWire(data, a.id);
    const leftB = unlinkWire(data, b.id);
    if (leftA) touched.push(leftA);
    if (leftB && leftB.id !== a.id) touched.push(leftB);
    a.linkedWireId = b.id;
    b.linkedWireId = a.id;
    a.goesTo = "box";
    b.goesTo = "box";
    a.goesToBoxId = b.boxId;
    b.goesToBoxId = a.boxId;
    const now = Date.now();
    a.updatedAt = now;
    b.updatedAt = now;
    return { ok: true, wires: [a, b].concat(touched) };
  }

  function createLinkedEnd(data, wireId, otherBoxId) {
    const wire = findWire(data, wireId);
    const otherBox = (data.boxes || []).find((box) => box.id === otherBoxId);
    if (!wire || !otherBox) return { ok: false, error: "Can't find that box." };
    if (wire.boxId === otherBoxId) return { ok: false, error: "Pick a different box." };
    const origin = (data.boxes || []).find((box) => box.id === wire.boxId);
    const previous = unlinkWire(data, wire.id);
  const other = blankWire(otherBoxId);
  other.color = wire.color || "";
  other.colorOther = wire.colorOther || "";
  other.attachedTo = "unknown";
  other.notes = "Other end from " + (origin ? boxTitle(origin) : "the other box") + ".";
    other.goesTo = "box";
    other.goesToBoxId = wire.boxId;
    other.linkedWireId = wire.id;
    wire.goesTo = "box";
    wire.goesToBoxId = otherBoxId;
    wire.goesToLabel = "";
    wire.linkedWireId = other.id;
    const now = Date.now();
    wire.updatedAt = now;
    other.updatedAt = now;
    if (origin) origin.updatedAt = now;
    otherBox.updatedAt = now;
    data.wires.push(other);
    return { ok: true, wire: other, previous: previous, source: wire };
  }

  function deleteWire(data, wireId) {
    const wire = findWire(data, wireId);
    if (!wire) return { ok: false };
    const previous = unlinkWire(data, wireId);
    data.wires = data.wires.filter((item) => item.id !== wireId);
    return { ok: true, removedId: wireId, boxId: wire.boxId, previous: previous };
  }

  function deleteBox(data, boxId) {
    const box = (data.boxes || []).find((item) => item.id === boxId);
    if (!box) return { ok: false };
    const removedWireIds = data.wires.filter((wire) => wire.boxId === boxId).map((wire) => wire.id);
    const removedGroupIds = data.groups.filter((group) => group.boxId === boxId).map((group) => group.id);
    const photos = data.photos || [];
    const removedPhotoIds = photos.filter((photo) => photo.boxId === boxId).map((photo) => photo.id);
    const removedSet = new Set(removedWireIds);
    const touched = [];
    data.wires.forEach((wire) => {
      if (wire.boxId === boxId) return;
      let changed = false;
      if (wire.linkedWireId && removedSet.has(wire.linkedWireId)) {
        wire.linkedWireId = null;
        changed = true;
      }
      if (wire.goesToBoxId === boxId) {
        wire.goesToBoxId = null;
        wire.goesTo = "unknown";
        wire.goesToLabel = box.name.trim() || "a removed box";
        changed = true;
      }
      if (changed) {
        wire.updatedAt = Date.now();
        touched.push(wire);
      }
    });
    data.wires = data.wires.filter((wire) => wire.boxId !== boxId);
    data.groups = data.groups.filter((group) => group.boxId !== boxId);
    if (data.photos) data.photos = data.photos.filter((photo) => photo.boxId !== boxId);
    data.boxes = data.boxes.filter((item) => item.id !== boxId);
    return { ok: true, removedWireIds, removedGroupIds, removedPhotoIds, touched };
  }

  function deleteGroup(data, groupId) {
    const touched = [];
    data.wires.forEach((wire) => {
      if (wire.groupId !== groupId) return;
      wire.groupId = null;
      wire.updatedAt = Date.now();
      touched.push(wire);
    });
    data.groups = data.groups.filter((group) => group.id !== groupId);
    return { ok: true, touched };
  }

  function setWireGroup(data, wireId, groupId) {
    const wire = findWire(data, wireId);
    if (!wire) return { ok: false, error: "Can't find that wire." };
    if (!groupId) {
      wire.groupId = null;
      wire.updatedAt = Date.now();
      return { ok: true, wire: wire };
    }
    const group = (data.groups || []).find((item) => item.id === groupId);
    if (!group || group.boxId !== wire.boxId) {
      return { ok: false, error: "That wire nut is in a different box." };
    }
    wire.groupId = groupId;
    wire.updatedAt = Date.now();
    return { ok: true, wire: wire };
  }

  function takeUnique(list, build) {
    const seen = new Set();
    const out = [];
    (Array.isArray(list) ? list : []).forEach((raw) => {
      const item = build(raw);
      if (!item || !item.id || seen.has(item.id)) return;
      seen.add(item.id);
      out.push(item);
    });
    return out;
  }

  function cleanState(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const boxes = takeUnique(source.boxes, (rawBox) => {
      if (!rawBox || typeof rawBox !== "object") return null;
      const id = cleanId(rawBox.id);
      if (!id) return null;
      const type = ALLOWED.type.has(rawBox.type) ? rawBox.type : "";
      let breakerStatus = rawBox.breakerStatus;
      const breaker = clip(rawBox.breaker, LIMITS.breaker);
      if (breakerStatus !== "unknown" && breakerStatus !== "known" && breakerStatus !== "blank") {
        breakerStatus = breaker.trim() ? "known" : "blank";
      }
      if (breakerStatus === "blank" && breaker.trim()) breakerStatus = "known";
      return {
        id: id,
        name: clip(rawBox.name, LIMITS.name),
        room: clip(rawBox.room, LIMITS.room),
        type: type,
        typeOther: clip(rawBox.typeOther, LIMITS.typeOther),
        breaker: breaker,
        breakerStatus: breakerStatus,
        notes: clip(rawBox.notes, LIMITS.notes),
        createdAt: asTime(rawBox.createdAt),
        updatedAt: asTime(rawBox.updatedAt),
      };
    });
    const boxIds = new Set(boxes.map((box) => box.id));
    const groups = takeUnique(source.groups, (rawGroup) => {
      if (!rawGroup || typeof rawGroup !== "object") return null;
      const id = cleanId(rawGroup.id);
      const boxId = cleanId(rawGroup.boxId);
      if (!id || !boxId || !boxIds.has(boxId)) return null;
      return {
        id: id,
        boxId: boxId,
        name: clip(rawGroup.name, LIMITS.groupName) || "Wire nut",
        createdAt: asTime(rawGroup.createdAt),
        updatedAt: asTime(rawGroup.updatedAt),
      };
    });
    const groupIds = new Set(groups.map((group) => group.id));
    let wires = takeUnique(source.wires, (rawWire) => {
      if (!rawWire || typeof rawWire !== "object") return null;
      const id = cleanId(rawWire.id);
      const boxId = cleanId(rawWire.boxId);
      if (!id || !boxId || !boxIds.has(boxId)) return null;
      const color = ALLOWED.color.has(rawWire.color) ? rawWire.color : "";
      const attachedTo = ALLOWED.attachedTo.has(rawWire.attachedTo) ? rawWire.attachedTo : "";
      const goesTo = ALLOWED.goesTo.has(rawWire.goesTo) ? rawWire.goesTo : "";
      const tested = rawWire.tested === "live" || rawWire.tested === "dead" ? rawWire.tested : "";
      const goesToBoxId = cleanId(rawWire.goesToBoxId);
      const groupId = cleanId(rawWire.groupId);
      return {
        id: id,
        boxId: boxId,
        color: color,
        colorOther: clip(rawWire.colorOther, LIMITS.colorOther),
        cable: clip(rawWire.cable, LIMITS.cable),
        attachedTo: attachedTo,
        attachedDetail: clip(rawWire.attachedDetail, LIMITS.attachedDetail),
        goesTo: goesTo,
        goesToBoxId: goesTo === "box" && goesToBoxId && boxIds.has(goesToBoxId) ? goesToBoxId : null,
        goesToLabel: clip(rawWire.goesToLabel, LIMITS.goesToLabel),
        linkedWireId: cleanId(rawWire.linkedWireId) || null,
        tested: tested,
        notes: clip(rawWire.notes, LIMITS.notes),
        groupId: groupId && groupIds.has(groupId) ? groupId : null,
        createdAt: asTime(rawWire.createdAt),
        updatedAt: asTime(rawWire.updatedAt),
      };
    });
    const byId = new Map(wires.map((wire) => [wire.id, wire]));
    wires.forEach((wire) => {
      if (wire.groupId) {
        const group = groups.find((item) => item.id === wire.groupId);
        if (!group || group.boxId !== wire.boxId) wire.groupId = null;
      }
      if (!wire.linkedWireId) return;
      const other = byId.get(wire.linkedWireId);
      if (!other || other.id === wire.id || other.boxId === wire.boxId) {
        wire.linkedWireId = null;
        return;
      }
      if (other.linkedWireId && other.linkedWireId !== wire.id) {
        wire.linkedWireId = null;
        return;
      }
      other.linkedWireId = wire.id;
      other.goesTo = "box";
      other.goesToBoxId = wire.boxId;
      wire.goesTo = "box";
      wire.goesToBoxId = other.boxId;
    });
    return { boxes: boxes, wires: wires, groups: groups };
  }

  function importBackup(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "That file doesn't look like a Wire Tracker backup." };
    }
    if (raw.app !== "wire-tracker") {
      return { ok: false, error: "That file doesn't look like a Wire Tracker backup." };
    }
    if (raw.version !== 1) {
      return { ok: false, error: "This backup is from a different version of Wire Tracker." };
    }
    const cleaned = cleanState(raw);
    const boxIds = new Set(cleaned.boxes.map((box) => box.id));
    const photos = [];
    let skippedPhotos = 0;
    (Array.isArray(raw.photos) ? raw.photos : []).forEach((photo) => {
      if (!photo || typeof photo !== "object") {
        skippedPhotos += 1;
        return;
      }
      const id = cleanId(photo.id);
      const boxId = cleanId(photo.boxId);
      const dataBase64 = typeof photo.dataBase64 === "string" ? photo.dataBase64.replace(/\s+/g, "") : "";
      const type = photo.type === "image/png" ? "image/png" : "image/jpeg";
      if (!id || !boxId || !boxIds.has(boxId) || !dataBase64 || dataBase64.length > 8000000) {
        skippedPhotos += 1;
        return;
      }
      if (!/^[A-Za-z0-9+/=]+$/.test(dataBase64)) {
        skippedPhotos += 1;
        return;
      }
      photos.push({
        id: id,
        boxId: boxId,
        createdAt: asTime(photo.createdAt),
        type: type,
        dataBase64: dataBase64,
      });
    });
    return {
      ok: true,
      data: cleaned,
      photos: photos,
      skippedPhotos: skippedPhotos,
    };
  }

  function advancePersistedStamp(batchStamp, storedStamp) {
    const batch = Number(batchStamp) || 0;
    const stored = Number(storedStamp) || 0;
    return batch > stored ? batch : stored;
  }

  function buildDiagram(data, boxId) {
    const wires = (data.wires || []).filter((wire) => wire.boxId === boxId && wireHasContent(wire));
    const width = 400;
    if (!wires.length) {
      return { width: width, height: 160, empty: true, cables: [], nodes: [], destinations: [], edges: [] };
    }
    const cableMap = new Map();
    wires.forEach((wire) => {
      const name = (wire.cable || "").trim() || "Cable not noted";
      if (!cableMap.has(name)) cableMap.set(name, []);
      cableMap.get(name).push(wire);
    });
    const cableNames = [...cableMap.keys()].sort((a, b) => {
      if (a === "Cable not noted") return 1;
      if (b === "Cable not noted") return -1;
      return a.localeCompare(b);
    });
    cableNames.forEach((name) => {
      cableMap.get(name).sort((a, b) => {
        const ia = COLOR_ORDER.indexOf(a.color);
        const ib = COLOR_ORDER.indexOf(b.color);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a.createdAt || 0) - (b.createdAt || 0);
      });
    });

    let y = 12;
    const cables = [];
    const wireY = new Map();
    cableNames.forEach((name) => {
      const headerY = y;
      y += 28;
      const items = [];
      cableMap.get(name).forEach((wire) => {
        const cy = y + 22;
        wireY.set(wire.id, cy);
        items.push({
          id: wire.id,
          y: cy,
          title: shortName(wireTitle(wire), 16),
          style: colorStyle(wire),
        });
        y += 52;
      });
      cables.push({ name: shortName(name, 28), headerY: headerY, items: items });
      y += 8;
    });

    function attKey(wire) {
      if (!wire.attachedTo) return "";
      if (wire.attachedTo === "nut") return "nut:" + (wire.groupId || "none");
      if (wire.attachedTo === "unknown") return "unknown";
      if (wire.attachedTo === "other") return "other:" + ((wire.attachedDetail || "").trim());
      if ((wire.attachedTo === "switch" || wire.attachedTo === "outlet") && (wire.attachedDetail || "").trim()) {
        return wire.attachedTo + ":" + wire.attachedDetail.trim().toLowerCase();
      }
      return wire.attachedTo;
    }

    function attShort(wire, key) {
      if (key === "unknown") return "Not sure";
      if (key.startsWith("nut:")) {
        if (key === "nut:none") return "Wire nut";
        const group = (data.groups || []).find((item) => item.id === wire.groupId);
        return shortName(group ? group.name : "Wire nut", 12);
      }
      if (key === "switch" || key.startsWith("switch:")) return key === "switch" ? "Switch" : shortName(wire.attachedDetail.trim(), 12);
      if (key === "outlet" || key.startsWith("outlet:")) return key === "outlet" ? "Outlet" : shortName(wire.attachedDetail.trim(), 12);
      if (key === "pigtail") return "Pigtail";
      if (key === "ground") return "Ground";
      if (key.startsWith("other:")) return shortName((wire.attachedDetail || "").trim() || "Other", 12);
      return "Other";
    }

    const attMap = new Map();
    wires.forEach((wire) => {
      const key = attKey(wire);
      if (!key) return;
      if (!attMap.has(key)) {
        attMap.set(key, {
          key: key,
          label: attShort(wire, key),
          unknown: key === "unknown" || key === "nut:none",
          wireIds: [],
        });
      }
      attMap.get(key).wireIds.push(wire.id);
    });
    let nodes = [...attMap.values()].map((node) => {
      const ys = node.wireIds.map((id) => wireY.get(id));
      const avg = ys.reduce((sum, n) => sum + n, 0) / ys.length;
      return { key: node.key, label: node.label, unknown: node.unknown, y: avg, wireIds: node.wireIds };
    });
    nodes.sort((a, b) => a.y - b.y);
    let last = -Infinity;
    nodes.forEach((node) => {
      if (node.y < 36) node.y = 36;
      if (node.y < last + 42) node.y = last + 42;
      last = node.y;
    });
    const nodeByKey = new Map(nodes.map((node) => [node.key, node]));

    function destKey(wire) {
      if (!wire.goesTo) return "";
      if (wire.goesTo === "box") return "box:" + (wire.goesToBoxId || "");
      if (wire.goesTo === "unknown") return "unknown";
      if (wire.goesTo === "light") return "light:" + ((wire.goesToLabel || "").trim().toLowerCase());
      if (wire.goesTo === "panel") return "panel:" + ((wire.goesToLabel || "").trim().toLowerCase());
      return "other:" + ((wire.goesToLabel || "").trim().toLowerCase());
    }

    function destShort(wire) {
      if (wire.goesTo === "unknown") return "Where?";
      if (wire.goesTo === "box") {
        const box = (data.boxes || []).find((item) => item.id === wire.goesToBoxId);
        return shortName(box ? boxTitle(box) : "Other box", 16);
      }
      if (wire.goesTo === "light") return shortName((wire.goesToLabel || "").trim() || "A light", 16);
      if (wire.goesTo === "panel") return shortName((wire.goesToLabel || "").trim() ? "Panel " + wire.goesToLabel.trim() : "Panel", 16);
      return shortName((wire.goesToLabel || "").trim() || "Other", 16);
    }

    const destMap = new Map();
    wires.forEach((wire) => {
      const key = destKey(wire);
      if (!key) return;
      if (!destMap.has(key)) {
        destMap.set(key, {
          key: key,
          label: destShort(wire),
          unknown: wire.goesTo === "unknown",
          wireIds: [],
        });
      }
      destMap.get(key).wireIds.push(wire.id);
    });
    let destinations = [...destMap.values()].map((node) => {
      const ys = node.wireIds.map((id) => wireY.get(id));
      const avg = ys.reduce((sum, n) => sum + n, 0) / ys.length;
      return { key: node.key, label: node.label, unknown: node.unknown, y: avg, wireIds: node.wireIds };
    });
    destinations.sort((a, b) => a.y - b.y);
    last = -Infinity;
    destinations.forEach((node) => {
      if (node.y < 36) node.y = 36;
      if (node.y < last + 40) node.y = last + 40;
      last = node.y;
    });
    const destByKey = new Map(destinations.map((node) => [node.key, node]));

    const edges = [];
    wires.forEach((wire) => {
      const style = colorStyle(wire);
      const dashed = !wire.attachedTo || wire.attachedTo === "unknown" || wire.color === "unknown";
      const y1 = wireY.get(wire.id);
      const att = nodeByKey.get(attKey(wire));
      const dest = destByKey.get(destKey(wire));
      if (att) {
        edges.push({
          wireId: wire.id,
          x1: 158,
          y1: y1,
          x2: 176,
          y2: att.y,
          stroke: style.border,
          dashed: dashed,
        });
      }
      if (dest) {
        edges.push({
          wireId: wire.id,
          x1: att ? 262 : 158,
          y1: att ? att.y : y1,
          x2: 274,
          y2: dest.y,
          stroke: style.border,
          dashed: wire.goesTo === "unknown" || !wire.goesTo,
        });
      }
    });

    const bottom = Math.max(
      y,
      ...nodes.map((node) => node.y + 28),
      ...destinations.map((node) => node.y + 28),
      120
    );
    return {
      width: width,
      height: bottom + 12,
      empty: false,
      cables: cables,
      nodes: nodes,
      destinations: destinations,
      edges: edges,
    };
  }

  return {
    BOX_TYPES: BOX_TYPES,
    COLORS: COLORS,
    ATTACHMENTS: ATTACHMENTS,
    DESTINATIONS: DESTINATIONS,
    TESTED: TESTED,
    LIMITS: LIMITS,
    uid: uid,
    escapeHtml: escapeHtml,
    blankBox: blankBox,
    blankWire: blankWire,
    blankGroup: blankGroup,
    boxTitle: boxTitle,
    typeLabel: typeLabel,
    breakerLabel: breakerLabel,
    wireTitle: wireTitle,
    colorStyle: colorStyle,
    wireHasContent: wireHasContent,
    attachmentLabel: attachmentLabel,
    destinationLabel: destinationLabel,
    shortName: shortName,
    wireIssues: wireIssues,
    boxIssues: boxIssues,
    allIssues: allIssues,
    untestedWires: untestedWires,
    filledCount: filledCount,
    cablesInBox: cablesInBox,
    rooms: rooms,
    nextGroupName: nextGroupName,
    applyChoice: applyChoice,
    linkWires: linkWires,
    unlinkWire: unlinkWire,
    createLinkedEnd: createLinkedEnd,
    deleteWire: deleteWire,
    deleteBox: deleteBox,
    deleteGroup: deleteGroup,
    setWireGroup: setWireGroup,
    cleanState: cleanState,
    importBackup: importBackup,
    advancePersistedStamp: advancePersistedStamp,
    buildDiagram: buildDiagram,
  };
});
