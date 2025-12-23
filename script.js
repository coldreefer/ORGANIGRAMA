/******************************************************************************************
 *  ORGANIGRAMA EMR — WORKDAY STYLE (REAL)
 *  GoJS solo para organigrama
 *  Teams renderizados en overlay HTML (fuera del canvas)
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIGURACIÓN UI
   ======================================================================================== */
const UI = {
  avatarSize: 42,
  workerColumns: 6
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
let TEAM_DATA = [];
let VENDOR_DATA = [];
let ACTIVE_SUPERVISOR = null;

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
   HELPERS
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
      { margin: 12 },
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
   OVERLAY HTML (WORKDAY REAL)
   ======================================================================================== */
const overlay = document.getElementById("teamOverlay");
const overlayTitle = document.getElementById("teamTitle");
const overlayGrid = document.getElementById("teamGrid");
const overlayClose = document.getElementById("btnCloseTeam");

function closeOverlay() {
  overlay.classList.remove("visible");
  overlayGrid.innerHTML = "";
  ACTIVE_SUPERVISOR = null;
}

overlayClose.addEventListener("click", closeOverlay);

function openOverlay(supervisor) {
  if (!overlay || !overlayGrid || !overlayTitle) {
    console.error("Overlay HTML no encontrado");
    return;
  }

  if (ACTIVE_SUPERVISOR === supervisor) {
    closeOverlay();
    return;
  }

  ACTIVE_SUPERVISOR = supervisor;
  overlayTitle.textContent = supervisor.name;
  overlayGrid.innerHTML = "";

  supervisor.workers.forEach(w => {
    const card = document.createElement("div");
    card.className = "team-card";

    const img = document.createElement("img");
    img.src = w.image || DEFAULT_AVATAR;

    const name = document.createElement("div");
    name.textContent = w.name;
    name.style.fontWeight = "600";

    const role = document.createElement("div");
    role.textContent = w.role || "";
    role.style.fontSize = "12px";
    role.style.color = "#475569";

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(role);
    overlayGrid.appendChild(card);
  });

  overlay.classList.add("visible");
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
          const g = panel.part;
          if (!g.data.hasChildren) return;
          openOverlay(g.data);
        }
      },
      card("#14b8a6", true, true)
    ),
    $(go.Placeholder, { padding: 10 })
  )
);

/* ========================================================================================
   VENDORS (NO TOCADO)
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

  closeOverlay();

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

  closeOverlay();

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
