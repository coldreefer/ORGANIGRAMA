/******************************************************************************************
 *  ORGANIGRAMA EMR — WORKDAY-LIKE FINAL
 *  Overlay centrado, fondo bloqueado, grilla 6 columnas, scroll interno
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ======================================================================================
   CONFIG UI
   ====================================================================================== */
const UI = {
  avatar: 42,
  cardMargin: 12,
  cols: 6,
  cellGap: 16,
  overlayWidth: 1000,
  overlayHeight: 460
};

/* ======================================================================================
   AVATAR DEFAULT
   ====================================================================================== */
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#ffffff"/>
  <circle cx="50" cy="50" r="46" fill="#f1f5f9"/>
  <circle cx="50" cy="42" r="16" fill="#9ca3af"/>
  <path d="M22 88c4-20 52-20 56 0" fill="#9ca3af"/>
</svg>`);

/* ======================================================================================
   STATE
   ====================================================================================== */
let TEAM_DATA = [];
let ACTIVE_OVERLAY = null;
let ACTIVE_SUPERVISOR = null;
let BLOCK_LAYER = null;

/* ======================================================================================
   DIAGRAM
   ====================================================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.4,
  maxScale: 2.5,
  padding: 40
});

/* ======================================================================================
   LINKS
   ====================================================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
);

/* ======================================================================================
   HELPERS
   ====================================================================================== */
function safe(v) {
  return v === undefined || v === null ? "" : String(v);
}

function resolveImage(row) {
  if (!row || !row.ImageURL) return DEFAULT_AVATAR;
  const u = String(row.ImageURL).trim();
  return u || DEFAULT_AVATAR;
}

/* ======================================================================================
   CARD
   ====================================================================================== */
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

/* ======================================================================================
   BLOCK LAYER (fondo atenuado)
   ====================================================================================== */
function showBlockLayer() {
  BLOCK_LAYER = $(
    go.Part,
    "Position",
    {
      layerName: "Foreground",
      selectable: false,
      location: diagram.viewportBounds.position
    },
    $(go.Shape, "Rectangle", {
      fill: "rgba(15,23,42,0.35)",
      width: diagram.viewportBounds.width,
      height: diagram.viewportBounds.height
    })
  );
  diagram.add(BLOCK_LAYER);
  diagram.isEnabled = false;
}

function hideBlockLayer() {
  if (BLOCK_LAYER) diagram.remove(BLOCK_LAYER);
  BLOCK_LAYER = null;
  diagram.isEnabled = true;
}

/* ======================================================================================
   OVERLAY
   ====================================================================================== */
function closeOverlay() {
  if (ACTIVE_OVERLAY) diagram.remove(ACTIVE_OVERLAY);
  ACTIVE_OVERLAY = null;
  ACTIVE_SUPERVISOR = null;
  hideBlockLayer();
}

function buildWorkerGrid(workers) {
  const table = $(go.Panel, "Table");
  let r = 0, c = 0;

  workers.forEach(w => {
    const cell = $(
      go.Panel, "Auto",
      { margin: UI.cellGap },
      card("#e5e7eb", true, false)
    );
    cell.data = w;
    cell.row = r;
    cell.column = c;
    table.add(cell);

    c++;
    if (c >= UI.cols) { c = 0; r++; }
  });

  return table;
}

function buildOverlay(node) {
  const workers = node.data.workers || [];

  const overlay = $(
    go.Part,
    "Position",
    {
      layerName: "Foreground",
      selectable: false
    },
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: "#14b8a6",
      strokeWidth: 2
    }),
    $(
      go.Panel, "Vertical",
      { margin: 20 },
      $(go.TextBlock, safe(node.data.name), {
        font: "bold 15px sans-serif",
        margin: new go.Margin(0, 0, 12, 0)
      }),
      $(go.Panel, "Auto",
        {
          maxSize: new go.Size(UI.overlayWidth, UI.overlayHeight)
        },
        buildWorkerGrid(workers)
      ),
      $(go.TextBlock, "← Volver al organigrama", {
        margin: new go.Margin(14, 0, 0, 0),
        stroke: "#2563eb",
        cursor: "pointer",
        click: closeOverlay
      })
    )
  );

  // centrar en viewport
  const vb = diagram.viewportBounds;
  overlay.location = new go.Point(
    vb.centerX - UI.overlayWidth / 2,
    vb.centerY - UI.overlayHeight / 2
  );

  return overlay;
}

function toggleOverlay(node) {
  if (ACTIVE_SUPERVISOR === node.data.key) {
    closeOverlay();
    return;
  }

  closeOverlay();
  showBlockLayer();
  ACTIVE_OVERLAY = buildOverlay(node);
  diagram.add(ACTIVE_OVERLAY);
  ACTIVE_SUPERVISOR = node.data.key;
}

/* ======================================================================================
   TEMPLATES
   ====================================================================================== */
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

/* ======================================================================================
   BUILD TEAM
   ====================================================================================== */
function buildTeam(rows) {

  closeOverlay();

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

/* ======================================================================================
   LOAD CSV
   ====================================================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => {
    TEAM_DATA = r.data || [];
    buildTeam(TEAM_DATA);
  }
});
