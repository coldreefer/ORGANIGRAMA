/******************************************************************************************
 *  ORGANIGRAMA EMR — SCRIPT PRINCIPAL (WORKDAY-LIKE REAL — FINAL FIX)
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIGURACIÓN GLOBAL
   ======================================================================================== */
const UI = {
  avatarSize: 42,
  cardMargin: 12,
  workerColumns: 6,
  workerSpacing: 24,
  overlayMaxWidth: 960,
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
   ESTADO GLOBAL
   ======================================================================================== */
let TEAM_OVERLAY = null;
let ACTIVE_SUPERVISOR = null;
let TEAM_DATA = [];
let VENDOR_DATA = [];

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
  "animationManager.duration": 300
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
   HELPERS VISUALES
   ======================================================================================== */
function resolveImage(row) {
  if (!row || !row.ImageURL) return DEFAULT_AVATAR;
  const url = row.ImageURL.toString().trim();
  return url || DEFAULT_AVATAR;
}

function photo() {
  return $(
    go.Picture,
    {
      width: UI.avatarSize,
      height: UI.avatarSize,
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
   TEAM OVERLAY (WORKDAY REAL)
   ======================================================================================== */
function hideTeamOverlay() {
  if (TEAM_OVERLAY) {
    diagram.remove(TEAM_OVERLAY);
    TEAM_OVERLAY = null;
    ACTIVE_SUPERVISOR = null;
  }
}

function buildTeamOverlay(supervisorGroup) {

  const workers = supervisorGroup.data.workers || [];

  const workersPanel = $(
    go.Panel,
    {
      itemTemplate:
        $(go.Node, "Auto",
          card("#e5e7eb", true, false)
        ),
      itemArray: workers,
      layout: $(go.GridLayout, {
        wrappingColumn: UI.workerColumns,
        spacing: new go.Size(UI.workerSpacing, UI.workerSpacing)
      })
    }
  );

  return $(
    go.Part,
    "Auto",
    {
      layerName: "Foreground",
      selectable: false,
      locationSpot: go.Spot.Top
    },
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: "#14b8a6",
      strokeWidth: 2
    }),
    $(
      go.Panel,
      "Vertical",
      { margin: 16 },
      $(go.TextBlock,
        supervisorGroup.data.name,
        {
          font: "bold 14px sans-serif",
          margin: new go.Margin(0, 0, 12, 0)
        }
      ),
      $(
        go.Panel,
        "Auto",
        { maxSize: new go.Size(UI.overlayMaxWidth, UI.overlayMaxHeight) },
        workersPanel
      )
    )
  );
}

function toggleTeamOverlay(supervisorGroup) {

  if (ACTIVE_SUPERVISOR === supervisorGroup) {
    hideTeamOverlay();
    return;
  }

  hideTeamOverlay();

  TEAM_OVERLAY = buildTeamOverlay(supervisorGroup);
  diagram.add(TEAM_OVERLAY);

  TEAM_OVERLAY.location =
    supervisorGroup.getDocumentPoint(go.Spot.Bottom);

  ACTIVE_SUPERVISOR = supervisorGroup;
}

/* ========================================================================================
   TEMPLATES TEAMS
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "Leader",
  $(go.Node, "Auto", card("#2563eb", true, true))
);

diagram.groupTemplateMap.add(
  "Supervisor",
  $(go.Group, "Vertical",
    {
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 20,
        layerSpacing: 30
      })
    },
    $(
      go.Panel,
      "Auto",
      {
        cursor: "pointer",
        click: (e, panel) => {
          const group = panel.part;
          if (!group.data.hasChildren) return;
          toggleTeamOverlay(group);
        }
      },
      card("#14b8a6", true, true)
    ),
    $(go.Placeholder, { padding: 10 })
  )
);

/* ========================================================================================
   TEMPLATES VENDORS (SIN CAMBIOS)
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "VendorRoot",
  $(go.Node, "Auto", card("#64748b", false, true))
);

diagram.nodeTemplateMap.add(
  "VendorArea",
  $(go.Node, "Auto", card("#7c3aed", false, true))
);

diagram.nodeTemplateMap.add(
  "VendorItem",
  $(go.Node, "Auto", card("#e5e7eb", false, false))
);

/* ========================================================================================
   BUILD TEAMS
   ======================================================================================== */
function buildTeam(rows) {

  hideTeamOverlay();

  const nodes = [];
  const links = [];

  const people = rows.filter(r => r["First name (required)"]);
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

    const workers = people.filter(w => w["SupervisorEmail (required)"] === s.id);

    nodes.push({
      key: s.id,
      isGroup: true,
      category: "Supervisor",
      name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
      role: s.Position || "",
      image: resolveImage(s),
      count: workers.length,
      hasChildren: workers.length > 0,
      workers: workers.map(w => ({
        name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
        role: w.Position || "",
        image: resolveImage(w)
      }))
    });

    links.push({ from: leader.id, to: s.id });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 90 });
}

/* ========================================================================================
   BUILD VENDORS
   ======================================================================================== */
function buildVendors(rows) {

  hideTeamOverlay();

  const nodes = [];
  const links = [];

  nodes.push({
    key: "VENDORS",
    category: "VendorRoot",
    name: "Vendors",
    count: rows.length
  });

  const byDept = {};

  rows.forEach(v => {
    if (!v.Department) return;
    if (!byDept[v.Department]) byDept[v.Department] = [];
    byDept[v.Department].push(v);
  });

  let areaIdx = 0;
  let vendorIdx = 0;

  Object.entries(byDept).forEach(([dept, vendors]) => {

    const areaKey = `AREA_${areaIdx++}`;

    nodes.push({
      key: areaKey,
      category: "VendorArea",
      name: dept,
      count: vendors.length
    });

    links.push({ from: "VENDORS", to: areaKey });

    vendors.forEach(v => {
      const vk = `V_${vendorIdx++}`;
      nodes.push({
        key: vk,
        category: "VendorItem",
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`.trim(),
        role: v.Position || ""
      });
      links.push({ from: areaKey, to: vk });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, {
    angle: 90,
    layerSpacing: 70,
    nodeSpacing: 30,
    arrangement: go.TreeLayout.ArrangementFixedRoots
  });
}

/* ========================================================================================
   LOAD CSV
   ======================================================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => {
    TEAM_DATA = r.data;
    buildTeam(TEAM_DATA);
  }
});

Papa.parse("vendors.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => {
    VENDOR_DATA = r.data;
  }
});

/* ========================================================================================
   BOTONES
   ======================================================================================== */
document.getElementById("btnTeams").onclick = () => buildTeam(TEAM_DATA);
document.getElementById("btnVendorsDept").onclick = () => buildVendors(VENDOR_DATA);
