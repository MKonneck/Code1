const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

function fixture() {
  const hall = L.blankBox();
  hall.name = "Hall switch";
  hall.room = "Hall";
  const kitchen = L.blankBox();
  kitchen.name = "Kitchen light";
  kitchen.room = "Kitchen";
  const red = L.blankWire(hall.id);
  red.color = "red";
  red.cable = "Cable 1 from the top";
  const white = L.blankWire(hall.id);
  white.color = "white";
  white.cable = "Cable 1 from the top";
  const otherRed = L.blankWire(kitchen.id);
  otherRed.color = "red";
  return {
    boxes: [hall, kitchen],
    wires: [red, white, otherRed],
    groups: [],
    photos: [],
  };
}

test("blank fields are not to-dos, Not sure is", () => {
  const data = fixture();
  const wire = data.wires[0];
  assert.equal(L.wireIssues(wire, data).length, 0);
  wire.color = "unknown";
  wire.goesTo = "unknown";
  const issues = L.wireIssues(wire, data);
  assert.ok(issues.some((item) => item.field === "color"));
  assert.ok(issues.some((item) => item.field === "goes"));
  assert.equal(L.wireHasContent(wire), true);
});

test("breaker not sure is a box to-do", () => {
  const data = fixture();
  data.boxes[0].breakerStatus = "unknown";
  const issues = L.allIssues(data);
  assert.ok(issues.some((item) => item.kind === "breaker" && item.boxId === data.boxes[0].id));
});

test("linking a wire shows up from both sides", () => {
  const data = fixture();
  const result = L.linkWires(data, data.wires[0].id, data.wires[2].id);
  assert.equal(result.ok, true);
  assert.equal(data.wires[0].linkedWireId, data.wires[2].id);
  assert.equal(data.wires[2].linkedWireId, data.wires[0].id);
  assert.equal(data.wires[0].goesToBoxId, data.boxes[1].id);
  assert.equal(data.wires[2].goesToBoxId, data.boxes[0].id);
  assert.match(L.destinationLabel(data.wires[0], data), /Kitchen light/);
  assert.match(L.destinationLabel(data.wires[2], data), /Hall switch/);
  const sameBox = L.linkWires(data, data.wires[0].id, data.wires[1].id);
  assert.equal(sameBox.ok, false);
});

test("unfinished box link stays on the to-do list", () => {
  const data = fixture();
  data.wires[0].goesTo = "box";
  data.wires[0].goesToBoxId = data.boxes[1].id;
  const issues = L.wireIssues(data.wires[0], data);
  assert.ok(issues.some((item) => item.field === "link"));
});

test("removing a box marks the other end not sure and keeps the name", () => {
  const data = fixture();
  L.linkWires(data, data.wires[0].id, data.wires[2].id);
  const removedName = data.boxes[0].name;
  const result = L.deleteBox(data, data.boxes[0].id);
  assert.equal(result.ok, true);
  assert.equal(data.boxes.length, 1);
  const survivor = data.wires.find((wire) => wire.color === "red");
  assert.ok(survivor);
  assert.equal(survivor.linkedWireId, null);
  assert.equal(survivor.goesTo, "unknown");
  assert.equal(survivor.goesToLabel, removedName);
  assert.match(L.wireIssues(survivor, data)[0].text, /Hall switch/);
});

test("removing a wire clears the other end's link only", () => {
  const data = fixture();
  L.linkWires(data, data.wires[0].id, data.wires[2].id);
  const result = L.deleteWire(data, data.wires[0].id);
  assert.equal(result.ok, true);
  assert.equal(result.previous.linkedWireId, null);
  assert.equal(data.wires.some((wire) => wire.id === result.removedId), false);
  assert.equal(result.previous.goesTo, "box");
});

test("wire nut group stays inside one box", () => {
  const data = fixture();
  const group = L.blankGroup(data.boxes[0].id, L.nextGroupName(data, data.boxes[0].id));
  data.groups.push(group);
  assert.equal(group.name, "Wire nut 1");
  const joined = L.setWireGroup(data, data.wires[0].id, group.id);
  assert.equal(joined.ok, true);
  const blocked = L.setWireGroup(data, data.wires[2].id, group.id);
  assert.equal(blocked.ok, false);
  L.setWireGroup(data, data.wires[1].id, group.id);
  const removed = L.deleteGroup(data, group.id);
  assert.equal(removed.touched.length, 2);
  assert.equal(data.wires[0].groupId, null);
  assert.equal(data.groups.length, 0);
});

test("import keeps known fields, repairs a one-sided link, and drops junk", () => {
  const data = fixture();
  const payload = {
    app: "wire-tracker",
    version: 1,
    boxes: data.boxes.map((box) => ({ ...box, evil: "<script>" })),
    wires: data.wires.map((wire, index) => (
      index === 0 ? { ...wire, linkedWireId: data.wires[2].id, goesTo: "light" } : { ...wire }
    )),
    groups: [{ id: "not-a-real-group", boxId: "missing", name: "nope" }],
    photos: [{ id: data.boxes[0].id, boxId: "missing-box", type: "image/jpeg", dataBase64: "aaaa" }],
  };
  const result = L.importBackup(payload);
  assert.equal(result.ok, true);
  assert.equal(result.data.boxes[0].evil, undefined);
  assert.equal(result.data.groups.length, 0);
  assert.equal(result.skippedPhotos, 1);
  const a = result.data.wires.find((wire) => wire.id === data.wires[0].id);
  const b = result.data.wires.find((wire) => wire.id === data.wires[2].id);
  assert.equal(a.linkedWireId, b.id);
  assert.equal(b.linkedWireId, a.id);
  assert.equal(a.goesTo, "box");
  assert.equal(b.goesToBoxId, data.boxes[0].id);
});

test("import rejects a file that is not a backup", () => {
  const result = L.importBackup({ hello: "world" });
  assert.equal(result.ok, false);
  assert.match(result.error, /Wire Tracker backup/);
});

test("diagram draws a nut and a destination without dropping wires", () => {
  const data = fixture();
  const group = L.blankGroup(data.boxes[0].id, "Wire nut 1");
  data.groups.push(group);
  data.wires[0].attachedTo = "nut";
  data.wires[0].groupId = group.id;
  data.wires[1].attachedTo = "nut";
  data.wires[1].groupId = group.id;
  data.wires[0].goesTo = "box";
  data.wires[0].goesToBoxId = data.boxes[1].id;
  const diagram = L.buildDiagram(data, data.boxes[0].id);
  assert.equal(diagram.empty, false);
  assert.equal(diagram.cables.length, 1);
  assert.equal(diagram.cables[0].items.length, 2);
  assert.equal(diagram.nodes.length, 1);
  assert.ok(diagram.destinations.some((node) => /Kitchen/.test(node.label)));
  assert.ok(diagram.edges.length >= 2);
});

test("tapping the same choice again clears it", () => {
  const wire = L.blankWire("box");
  L.applyChoice(wire, "color", "red");
  assert.equal(wire.color, "red");
  const cleared = L.applyChoice(wire, "color", "red");
  assert.equal(cleared.cleared, true);
  assert.equal(wire.color, "");
  L.applyChoice(wire, "tested", "live");
  L.applyChoice(wire, "tested", "untested");
  assert.equal(wire.tested, "");
});

test("escapeHtml neutralizes markup", () => {
  assert.equal(L.escapeHtml(`<b class="a">&"'</b>`), "&lt;b class=&quot;a&quot;&gt;&amp;&quot;&#39;&lt;/b&gt;");
});
