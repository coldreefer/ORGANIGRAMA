/******************************************************************************************
 *  ORGANIGRAMA EMR — WORKDAY REAL (ESTABLE + FIX DEFINITIVO)
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIG UI
   ======================================================================================== */
const UI = {
  avatar: 42,
  cardMargin: 12,
  workerCols: 6,
  cellPadding: 12,
  overlayMaxWidth: 980,
  overlayMaxHeight: 420
};

/* ========================================================================================
   AVATAR DEFAULT
   ======================================================================================== */
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#ffffff"/>
  <circle cx="50" cy="50" r="46" fill="#f1f5f9"/>
  <circle cx="50" cy="42" r="16" fill="#9ca3af"/>
  <path d="M22 88c4-20 52-20 56 0" fill="#9ca3af"/>
</svg>
`);

/* ========================================================================================
   ESTADO
   ======================================================================================== */
let TEAM_DATA = [];
let VENDOR_DATA = [];
let ACTIVE_OVERLAY = null;
let ACTIVE_SUPERVISOR_KEY = null;

/* ========================================================================================
   DIAGRAM
   ======================================================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.4,
  maxScale: 2.5,
  padding: 40,
  "animationManager.isEnabled": true,
  "animationManager.duration": 250
});

/* ========================================================================================
   LINKS
   ======================================================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
);

/* ========================================================================================
   HELPERS
   ======================================================================================== */
function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function resolveImage(row) {
  if (!row || !row.ImageURL) return DEFAULT_AVATAR;
  const u = String(row.ImageURL).trim();
  return u || DEFAULT_AVATAR;
}

function sanitizeWorker(w) {
  if (!w) return null;
  if (!w.name) return null;

  return {
    name: safeText(w.name),
    role: safeText(w.role),
    image: w.image || DEFAULT_AVATAR
  };
}

/* ========================================================================================
   CARD
   ======================================================================================== */
function photo() {
  return $(
    go.Picture,
    {
      width: UI.avatar,
      height: UI.avatar,
      margin: new go.Margin(0, 10, 0, 0),
      imageStretch: go.GraphObject.UniformToFill
    },
    new go.Binding("source", "image")
  );
}

function card(stroke, withPhoto, showCount) {
  return $(
    go.Panel, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke,
      strokeWidth: 2
    }),
    $(
      go.Panel, "Horizontal",
      { margin: UI.cardMargin },
      withPhoto ? photo() : $(go.Panel),
      $(
        go.Panel, "Vertical",
        $(go.TextBlock, { font: "bold 13px sans-serif" },
          new go.Binding("text", "name")),
        $(go.TextBlock, { font: "11px sans-serif", stroke: "#475569" },
          new go.Binding("text", "role")),
        showCount
          ? $(go.TextBlock, {
              margin: new go.Margin(6, 0, 0, 0),
              font: "10px sans-serif",
              stroke: "#64748b"
            },
            new go.Binding("visible", "count", c => c > 0),
            new go.Binding("text", "count", c => `👤 ${c}`)
          )
          : $(go.Panel)
      )
    )
  );
}

/* ========================================================================================
   OVERLAY
   ======================================================================================== */
function removeOverlay() {
  if (ACTIVE_OVERLAY) {
    diagram.remove(ACTIVE_OVERLAY);
    ACTIVE_OVERLAY = null;
    ACTIVE_SUPERVISOR_KEY = null;
  }
}

function buildWorkerCell(worker) {
  return $(
    go.Panel,
    "Auto",
    { margin: UI.cellPadding },
    card("#e5e7eb", true, false),
    { data: worker }
  );
}

function buildWorkerGrid(workers) {
  const table = $(go.Panel, "Table");
  let r = 0, c = 0;

  workers.forEach(w => {
    table.add(buildWorkerCell(w), { row: r, column: c });
    c++;
    if (c >= UI.workerCols) { c = 0; r++; }
  });

  return table;
}

function buildOverlay(node) {
  const workers =
    (node.data.workers || [])
      .map(sanitizeWorker)
      .filter(Boolean);

  return $(
    go.Part,
    "Auto",
    { layerName: "Foreground", selectable: false },
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: "#14b8a6",
      strokeWidth: 2
    }),
    $(
      go.Panel,
      "Vertical",
      { margin: 16 },
      $(go.TextBlock, safeText(node.data.name), {
        font: "bold 14px sans-serif",
        margin: new go.Margin(0, 0, 12, 0)
      }),
      $(go.Panel, "Auto",
        { maxSize: new go.Size(UI.overlayMaxWidth, UI.overlayMaxHeight) },
        buildWorkerGrid(workers)
      )
    )
  );
}

function toggleOverlay(node) {
  if (ACTIVE_SUPERVISOR_KEY === node.data.key) {
    removeOverlay();
    return;
  }

  removeOverlay();
  ACTIVE_OVERLAY = buildOverlay(node);
  diagram.add(ACTIVE_OVERLAY);
  ACTIVE_OVERLAY.location = node.getDocumentPoint(go.Spot.Bottom);
  ACTIVE_SUPERVISOR_KEY = node.data.key;
}

/* ========================================================================================
   TEMPLATES
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "Leader",
  $(go.Node, "Auto", card("#2563eb", true, true))
);

diagram.nodeTemplateMap.add(
  "Supervisor",
  $(go.Node, "Auto",
    {
      cursor: "pointer",
      click: (e, node) => {
        if (!node.data.workers || node.data.workers.length === 0) return;
        toggleOverlay(node);
      }
    },
    card("#14b8a6", true, true)
  )
);

/* ========================================================================================
   BUILD TEAMS
   ======================================================================================== */
function buildTeam(rows) {

  removeOverlay();

  const nodes = [];
  const links = [];

  const people = rows.filter(r => r && r["First name (required)"]);
  people.forEach(p => p.id = p["Email (required)"]);

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  const supervisors = people.filter(p => p["SupervisorEmail (required)"] === leader.id);

  nodes.push({
    key: leader.id,
    category: "Leader",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: resolveImage(leader),
    count: supervisors.length
  });

  supervisors.forEach(s => {

    const workers = people
      .filter(w => w["SupervisorEmail (required)"] === s.id)
      .map(w => ({
        name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
        role: w.Position || "",
        image: resolveImage(w)
      }));

    nodes.push({
      key: s.id,
      category: "Supervisor",
      name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
      role: s.Position || "",
      image: resolveImage(s),
      count: workers.length,
      workers
    });

    links.push({ from: leader.id, to: s.id });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 90 });
}

/* ========================================================================================
   LOAD CSV
   ======================================================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => {
    TEAM_DATA = r.data || [];
    buildTeam(TEAM_DATA);
  }
});
