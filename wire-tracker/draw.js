/* Touch-first drawing canvas. Talks to the page through a small set of callbacks. */
(function (root) {
  const L = root.WireLogic;
  const FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';

  function resize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(root.devicePixelRatio || 1, 2.5);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { dpr: dpr, cssWidth: rect.width, cssHeight: rect.height };
  }

  function screenToWorld(view, x, y) {
    const scale = view.scale || 1;
    return { x: (x - view.x) / scale, y: (y - view.y) / scale };
  }

  function edgePoint(node, towardX, towardY) {
    const cx = node.x + L.NODE_W / 2;
    const cy = node.y + L.NODE_H / 2;
    const dx = towardX - cx;
    const dy = towardY - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const sx = dx !== 0 ? (L.NODE_W / 2) / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? (L.NODE_H / 2) / Math.abs(dy) : Infinity;
    const scale = Math.min(sx, sy);
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function strokeColors(stroke) {
    if (!stroke) return ["#222222"];
    if (stroke.kind === "cable") {
      return (stroke.conductors === 3 ? ["black", "red", "white"] : ["black", "white"]).map((id) => L.colorStyle({ color: id }).fill);
    }
    return [L.colorStyle({ color: stroke.color, colorOther: stroke.colorOther }).fill];
  }

  function drawCable(ctx, x1, y1, x2, y2, colors, selected, unsure) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = selected ? "#1f6b4a" : "#c4b49a";
    ctx.lineWidth = colors.length === 3 ? 26 : 20;
    if (unsure) ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
    const gap = colors.length === 3 ? 7 : 4.5;
    const start = -((colors.length - 1) * gap) / 2;
    colors.forEach((color, index) => {
      const off = start + index * gap;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      if (color === "#f7f7f5") {
        ctx.strokeStyle = "#8a847a";
        ctx.lineWidth = 4.5;
      }
      ctx.moveTo(x1 + px * off, y1 + py * off);
      ctx.lineTo(x2 + px * off, y2 + py * off);
      ctx.stroke();
    });
  }

  function drawWire(ctx, x1, y1, x2, y2, color, selected, unsure) {
    ctx.save();
    ctx.lineCap = "round";
    if (selected) {
      ctx.strokeStyle = "#1f6b4a";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.strokeStyle = color === "#f7f7f5" ? "#8a847a" : color;
    ctx.lineWidth = color === "#f7f7f5" ? 7 : 6;
    if (unsure) ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPill(ctx, x, y, text, unsure) {
    ctx.font = "700 14px " + FONT;
    const width = Math.min(120, ctx.measureText(text).width + 16);
    ctx.fillStyle = unsure ? "#fff1d6" : "#fffdf8";
    ctx.strokeStyle = unsure ? "#e0b15c" : "#e3d9c8";
    ctx.lineWidth = 2;
    roundRect(ctx, x - width / 2, y - 12, width, 24, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = unsure ? "#8a4e08" : "#1e1a16";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  function drawNode(ctx, node, box, selected) {
    const shape = L.DRAW_SHAPES.find((item) => item.id === node.kind);
    const kind = shape ? shape.label : "Box";
    const name = box ? (L.boxTitle(box) === "Untitled box" ? kind : L.boxTitle(box)) : kind;
    const unsure = box && box.unsure;
    ctx.save();
    ctx.fillStyle = "#fffdf8";
    ctx.strokeStyle = selected ? "#1f6b4a" : (unsure ? "#e0b15c" : "#d9d0c2");
    ctx.lineWidth = selected ? 5 : 3;
    if (unsure) ctx.setLineDash([7, 5]);
    roundRect(ctx, node.x, node.y, L.NODE_W, L.NODE_H, 18);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (node.mark) {
      ctx.fillStyle = "#1f6b4a";
      ctx.beginPath();
      ctx.arc(node.x + 18, node.y + 18, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 14px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.mark, node.x + 18, node.y + 19);
    }
    ctx.fillStyle = "#1e1a16";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 22;
    const max = L.NODE_W - 28;
    ctx.font = "700 " + size + "px " + FONT;
    while (size > 15 && ctx.measureText(name).width > max) {
      size -= 1;
      ctx.font = "700 " + size + "px " + FONT;
    }
    const showKind = kind.toLowerCase() !== String(name).trim().toLowerCase();
    ctx.fillText(name, node.x + L.NODE_W / 2, node.y + (showKind ? 46 : 52));
    if (showKind) {
      ctx.fillStyle = "#5c564e";
      ctx.font = "700 14px " + FONT;
      ctx.fillText(kind, node.x + L.NODE_W / 2, node.y + 70);
    }
    ctx.restore();
  }

  function paint(ctx, cssWidth, cssHeight, dpr, model) {
    const view = model.view || { x: 28, y: 28, scale: 1 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = "#f3efe6";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.x, dpr * view.y);
    const nodes = model.nodes || [];
    const byId = new Map(nodes.map((node) => [node.id, node]));
    (model.strokes || []).forEach((stroke) => {
      const from = byId.get(stroke.fromNodeId);
      const to = byId.get(stroke.toNodeId);
      if (!from || !to) return;
      const a = L.nodeCenter(from);
      const b = L.nodeCenter(to);
      const start = edgePoint(from, b.x, b.y);
      const end = edgePoint(to, a.x, a.y);
      const selected = model.selection && model.selection.type === "stroke" && model.selection.id === stroke.id;
      const colors = strokeColors(stroke);
      if (stroke.kind === "cable") drawCable(ctx, start.x, start.y, end.x, end.y, colors, selected, stroke.unsure);
      else drawWire(ctx, start.x, start.y, end.x, end.y, colors[0], selected, stroke.unsure);
      const label = stroke.label || (stroke.kind === "cable" ? (stroke.conductors === 3 ? "3-wire" : "2-wire") : "");
      if (label || stroke.unsure) {
        drawPill(ctx, (start.x + end.x) / 2, (start.y + end.y) / 2 - 16, stroke.unsure && !stroke.label ? "Not sure" : label, stroke.unsure);
      }
    });
    if (model.rubber && model.rubber.fromId && byId.get(model.rubber.fromId)) {
      const from = byId.get(model.rubber.fromId);
      const center = L.nodeCenter(from);
      const start = edgePoint(from, model.rubber.x, model.rubber.y);
      ctx.save();
      ctx.strokeStyle = model.rubber.color || "#1f6b4a";
      ctx.lineWidth = model.rubber.cable ? 16 : 6;
      ctx.setLineDash([8, 7]);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(model.rubber.x, model.rubber.y);
      ctx.stroke();
      ctx.restore();
      void center;
    }
    nodes.forEach((node) => {
      const selected = model.selection && model.selection.type === "node" && model.selection.id === node.id;
      drawNode(ctx, node, (model.boxes || []).find((box) => box.id === node.boxId), selected);
    });
  }

  function mount(canvas, api) {
    const pointers = new Map();
    let mode = "";
    let gesture = null;
    let pinch = null;
    const observer = new root.ResizeObserver(redraw);
    observer.observe(canvas);

    function model() {
      return api.getModel();
    }

    function redraw() {
      const size = resize(canvas);
      if (size.cssWidth < 2 || size.cssHeight < 2) return;
      const current = model();
      if (current.diagram && !current.diagram.viewScale) {
        const fitted = L.fitView(current.nodes, size.cssWidth, size.cssHeight);
        current.diagram.viewX = fitted.x;
        current.diagram.viewY = fitted.y;
        current.diagram.viewScale = fitted.scale;
        current.view = { x: fitted.x, y: fitted.y, scale: fitted.scale };
        api.saveView();
      }
      paint(canvas.getContext("2d"), size.cssWidth, size.cssHeight, size.dpr, current);
    }

    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function slop(view) {
      return 26 / (view.scale || 1);
    }

    function onDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* synthetic events */ }
      pointers.set(event.pointerId, point(event));
      if (pointers.size >= 2) {
        if (gesture && gesture.undo) {
          if (gesture.moved) api.commitMove();
          else api.cancelUndo();
        }
        mode = "pinch";
        const pts = [...pointers.values()];
        const current = model();
        pinch = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
          scale: current.view.scale || 1,
          mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
          world: screenToWorld(current.view, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2),
        };
        gesture = null;
        return;
      }
      const current = model();
      const here = point(event);
      const world = screenToWorld(current.view, here.x, here.y);
      const hit = L.hitDrawing(current.nodes, current.strokes, world.x, world.y, slop(current.view));
      const tool = current.tool;
      if ((tool === "wire" || tool === "cable") && hit && hit.type === "node") {
        mode = "connect";
        gesture = { fromId: hit.id, x: here.x, y: here.y, moved: false };
        return;
      }
      if (tool === "box" && !(hit && hit.type === "node")) {
        mode = "place";
        gesture = { x: here.x, y: here.y, world: world, moved: false };
        return;
      }
      if (hit && hit.type === "node" && (tool === "move" || tool === "box")) {
        const node = current.nodes.find((item) => item.id === hit.id);
        mode = "node";
        api.armUndo();
        gesture = { id: hit.id, x: here.x, y: here.y, ox: node.x, oy: node.y, moved: false, undo: true };
        return;
      }
      if (hit && tool === "move") {
        mode = "tap";
        gesture = { hit: hit, x: here.x, y: here.y, moved: false };
        return;
      }
      mode = "pan";
      gesture = { x: here.x, y: here.y, vx: current.view.x, vy: current.view.y, moved: false };
    }

    function onMove(event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, point(event));
      const current = model();
      if (mode === "pinch" && pointers.size >= 2 && pinch) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const scale = Math.max(0.45, Math.min(2.2, pinch.scale * (dist / pinch.dist)));
        current.view.scale = scale;
        current.view.x = mid.x - pinch.world.x * scale;
        current.view.y = mid.y - pinch.world.y * scale;
        redraw();
        return;
      }
      if (!gesture) return;
      const here = point(event);
      const moved = Math.hypot(here.x - gesture.x, here.y - gesture.y) > 8;
      if (moved) gesture.moved = true;
      if (mode === "pan" && gesture.moved) {
        current.view.x = gesture.vx + (here.x - gesture.x);
        current.view.y = gesture.vy + (here.y - gesture.y);
        redraw();
      } else if (mode === "node" && gesture.moved) {
        const scale = current.view.scale || 1;
        api.previewMove(gesture.id, gesture.ox + (here.x - gesture.x) / scale, gesture.oy + (here.y - gesture.y) / scale);
        redraw();
      } else if (mode === "connect") {
        const world = screenToWorld(current.view, here.x, here.y);
        api.setRubber({
          fromId: gesture.fromId,
          x: world.x,
          y: world.y,
          cable: current.tool === "cable",
          color: current.tool === "cable" ? "#c4b49a" : L.colorStyle({ color: current.color }).fill,
        });
        redraw();
      } else if (mode === "place" && moved) {
        mode = "pan";
        gesture = { x: gesture.x, y: gesture.y, vx: current.view.x, vy: current.view.y, moved: true };
      }
    }

    function finish(event) {
      pointers.delete(event.pointerId);
      if (mode === "pinch") {
        if (pointers.size < 2) {
          mode = "";
          pinch = null;
          api.saveView();
        }
        return;
      }
      if (!gesture) {
        mode = "";
        return;
      }
      const done = gesture;
      const used = mode;
      mode = "";
      gesture = null;
      const current = model();
      api.setRubber(null);
      if (used === "place") {
        if (!done.moved) api.place(done.world.x, done.world.y);
        else redraw();
        return;
      }
      if (used === "connect") {
        const here = point(event);
        const world = screenToWorld(current.view, here.x, here.y);
        const hit = L.hitDrawing(current.nodes, current.strokes, world.x, world.y, slop(current.view));
        if (done.moved && hit && hit.type === "node" && hit.id !== done.fromId) api.connect(done.fromId, hit.id);
        else if (!done.moved) api.select({ type: "node", id: done.fromId });
        else redraw();
        return;
      }
      if (used === "node") {
        if (done.moved) api.commitMove();
        else {
          api.cancelUndo();
          api.select({ type: "node", id: done.id });
        }
        return;
      }
      if (used === "tap") {
        if (!done.moved) api.select(done.hit);
        return;
      }
      if (used === "pan") {
        if (done.moved) api.saveView();
        else api.select(null);
        redraw();
      }
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    redraw();
    return {
      redraw: redraw,
      destroy: function () {
        observer.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", finish);
        canvas.removeEventListener("pointercancel", finish);
      },
    };
  }

  root.WireDraw = { mount: mount, paint: paint, screenToWorld: screenToWorld };
})(typeof globalThis !== "undefined" ? globalThis : this);
