/******************************************************************************************
 *  ORGANIGRAMA EMR — SCRIPT PRINCIPAL (WORKDAY-LIKE FINAL)
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIGURACIÓN UI
   ======================================================================================== */
const UI = {
  avatarSize: 42,
  cardMargin: 12,
  workerColumns: 6,
  workerGap: 20
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
  padding: 40
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
   OVERLAY WORKDAY (HTML)
   ======================================================================================== */
const overlay = document.getElementById("teamOverlay");
const overlayTitle = document.getElementById("teamTitle");
const overlayGrid = document.getElementById("teamGrid");
const btnClose = document.getElementById("btnCloseTeam");

btnClose.addEventListener("click", closeTeamOverlay);

function openTeamOverlay(supervisorData) {
  ACTIVE_SUPERVISOR = supervisorData;

  if (!overlay || !overlayGrid || !overlayTitle) return;

  overlayTitle.textContent = supervisorData.name || "";
  overlayGrid.innerHTML = "";

  /* ================= SUPERVISOR ARRIBA ================= */
  const supervisorWrap = document.createElement("div");
  supervisorWrap.className = "team-header";
  supervisorWrap.style.width = "100%";
  supervisorWrap.style.display = "flex";
  supervisorWrap.style.justifyContent = "center";

  const supervisorCard = document.createElement("div");
  supervisorCard.className = "team-card";
  supervisorCard.style.maxWidth = "260px";

  supervisorCard.innerHTML = `
    <img src="${supervisorData.image || DEFAULT_AVATAR}">
    <div>${supervisorData.name}</div>
    <div>${supervisorData.role || ""}</div>
  `;

  supervisorWrap.appendChild(supervisorCard);
  overlayGrid.appendChild(supervisorWrap);

  /* ================= WORKERS GRID ================= */
  const workersSection = document.createElement("div");
  workersSection.className = "team-workers";
  workersSection.style.width = "100%";

  const grid = document.createElement("div");
  grid.className = "team-grid";

  if (Array.isArray(supervisorData.workers)) {
    supervisorData.workers.forEach(w => {
      const workerCard = document.createElement("div");
      workerCard.className = "team-card";

      workerCard.innerHTML = `
        <img src="${w.image || DEFAULT_AVATAR}">
        <div>${w.name}</div>
        <div>${w.role || ""}</div>
      `;

      grid.appendChild(workerCard);
    });
  }

  workersSection.appendChild(grid);
  overlayGrid.appendChild(workersSection);

  overlay.classList.add("visible");
}

function closeTeamOverlay() {
  overlay.classList.remove("visible");
  overlayGrid.innerHTML = "";
  ACTIVE_SUPERVISOR = null;
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
      layout: $(go.TreeLayout, { angle: 90, nodeSpacing: 20, layerSpacing: 30 })
    },
    $(
      go.Panel,
      "Auto",
      {
        cursor: "pointer",
        click: (e, panel) => {
          const g = panel.part;
          if (!g.data.hasChildren) return;
          openTeamOverlay(g.data);
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
diagram.nodeTemplateMap.add("VendorRoot",
  $(go.Node, "Auto", card("#64748b", false, true))
);
diagram.nodeTemplateMap.add("VendorArea",
  $(go.Node, "Auto", card("#7c3aed", false, true))
);
diagram.nodeTemplateMap.add("VendorItem",
  $(go.Node, "Auto", card("#e5e7eb", false, false))
);

/* ========================================================================================
   BUILD TEAMS
   ======================================================================================== */
function buildTeam(rows) {

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

  closeTeamOverlay();

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
    (byDept[v.Department] ||= []).push(v);
  });

  let a = 0, i = 0;

  Object.entries(byDept).forEach(([dept, vendors]) => {
    const areaKey = `AREA_${a++}`;

    nodes.push({
      key: areaKey,
      category: "VendorArea",
      name: dept,
      count: vendors.length
    });

    links.push({ from: "VENDORS", to: areaKey });

    vendors.forEach(v => {
      nodes.push({
        key: `V_${i++}`,
        category: "VendorItem",
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`.trim(),
        role: v.Position || ""
      });
      links.push({ from: areaKey, to: `V_${i - 1}` });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 70 });
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
