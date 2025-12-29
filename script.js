/******************************************************************************************
 *  ORGCHART EMR — PEOPLE + VENDORS
 *  Workday-style:
 *  - Solo un supervisor expandido a la vez
 *  - Click supervisor = muestra SOLO trabajadores
 *  - Click otra vez = colapsa
 *  - Vendors en organigrama independiente
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIG UI
   ======================================================================================== */
const UI = {
  avatarSize: 42,
  padding: 12
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
</svg>`);

/* ========================================================================================
   ESTADO GLOBAL
   ======================================================================================== */
let TEAM_DATA = [];
let VENDORS_DATA = [];
let CURRENT_SUPERVISOR = null;
let CURRENT_MODE = "PEOPLE";

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
  maxScale: 2,
  padding: 60
});

/* ========================================================================================
   LINK TEMPLATE
   ======================================================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 12 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.4 })
);

/* ========================================================================================
   HELPERS
   ======================================================================================== */
function resolveImage(row) {
  if (!row || !row.ImageURL) return DEFAULT_AVATAR;
  return row.ImageURL.toString().trim() || DEFAULT_AVATAR;
}

function avatar() {
  return $(
    go.Picture,
    {
      width: UI.avatarSize,
      height: UI.avatarSize,
      imageStretch: go.GraphObject.UniformToFill,
      margin: new go.Margin(0, 0, 8, 0)
    },
    new go.Binding("source", "image")
  );
}

function personCard(stroke, clickable = false) {
  return $(
    go.Panel, "Auto",
    clickable
      ? {
          cursor: "pointer",
          click: (e, node) => handleSupervisorClick(node.part.data.key)
        }
      : {},
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke,
      strokeWidth: 2
    }),
    $(
      go.Panel, "Vertical",
      { margin: UI.padding },
      avatar(),
      $(go.TextBlock,
        { font: "bold 12.5px sans-serif", textAlign: "center" },
        new go.Binding("text", "name")
      ),
      $(go.TextBlock,
        { font: "11px sans-serif", stroke: "#475569", textAlign: "center" },
        new go.Binding("text", "role")
      )
    )
  );
}

/* ========================================================================================
   NODE TEMPLATES — PEOPLE
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "Boss",
  $(go.Node, "Auto", personCard("#2563eb"))
);

diagram.nodeTemplateMap.add(
  "Supervisor",
  $(go.Node, "Auto", personCard("#2563eb", true))
);

diagram.nodeTemplateMap.add(
  "Worker",
  $(go.Node, "Auto", personCard("#94a3b8"))
);

/* ========================================================================================
   NODE TEMPLATES — VENDORS (SIN CAMBIOS)
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "VendorRoot",
  $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "#f8fafc",
      stroke: "#2563eb",
      strokeWidth: 2
    }),
    $(go.TextBlock,
      { margin: 12, font: "bold 13px sans-serif" },
      new go.Binding("text", "label")
    )
  )
);

diagram.nodeTemplateMap.add(
  "VendorArea",
  $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "#f8fafc",
      stroke: "#0ea5e9",
      strokeWidth: 2
    }),
    $(go.TextBlock,
      { margin: 10, font: "bold 12px sans-serif" },
      new go.Binding("text", "label")
    )
  )
);

diagram.nodeTemplateMap.add(
  "VendorItem",
  $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: "#10b981",
      strokeWidth: 2
    }),
    $(go.Panel, "Vertical", { margin: 10 },
      $(go.TextBlock,
        { font: "bold 12px sans-serif" },
        new go.Binding("text", "label")
      ),
      $(go.TextBlock,
        { font: "11px sans-serif", stroke: "#475569" },
        new go.Binding("text", "sub")
      )
    )
  )
);

/* ========================================================================================
   RENDER PEOPLE (CORREGIDO)
   ======================================================================================== */
function renderPeople(supervisorId = null) {
  CURRENT_MODE = "PEOPLE";

  diagram.layout = $(go.TreeLayout, {
    angle: 90,
    layerSpacing: 90,
    nodeSpacing: 40
  });

  const nodes = [];
  const links = [];

  const boss = TEAM_DATA.find(p => !p.supervisorId);
  if (!boss) return;

  // Boss
  nodes.push({
    key: boss.id,
    category: "Boss",
    name: `${boss.firstName} ${boss.lastName}`,
    role: boss.role,
    image: boss.image
  });

  // Supervisores
  const supervisors = TEAM_DATA.filter(p => p.supervisorId === boss.id);
  supervisors.forEach(s => {
    nodes.push({
      key: s.id,
      category: "Supervisor",
      name: `${s.firstName} ${s.lastName}`,
      role: s.role,
      image: s.image
    });
    links.push({ from: boss.id, to: s.id });
  });

  // Trabajadores (SOLO personas)
  if (supervisorId) {
    TEAM_DATA
      .filter(p => p.supervisorId === supervisorId)
      .forEach(w => {
        nodes.push({
          key: w.id,
          category: "Worker",
          name: `${w.firstName} ${w.lastName}`,
          role: w.role,
          image: w.image
        });
        links.push({ from: supervisorId, to: w.id });
      });
  }

  diagram.model = new go.GraphLinksModel(nodes, links);

  requestAnimationFrame(() => {
    const node = diagram.findNodeForKey(supervisorId || boss.id);
    if (node) diagram.centerRect(node.actualBounds);
  });
}

/* ========================================================================================
   SUPERVISOR CLICK
   ======================================================================================== */
function handleSupervisorClick(key) {
  if (CURRENT_SUPERVISOR === key) {
    CURRENT_SUPERVISOR = null;
    renderPeople();
  } else {
    CURRENT_SUPERVISOR = key;
    renderPeople(key);
  }
}

/* ========================================================================================
   RENDER VENDORS (IGUAL AL TUYO)
   ======================================================================================== */
function renderVendors() {
  CURRENT_MODE = "VENDORS";

  diagram.layout = $(go.TreeLayout, {
    angle: 90,
    layerSpacing: 80,
    nodeSpacing: 40
  });

  const nodes = [];
  const links = [];

  nodes.push({
    key: "VENDORS",
    category: "VendorRoot",
    label: "Vendors"
  });

  const grouped = {};
  VENDORS_DATA.forEach(v => {
    if (!grouped[v.Department]) grouped[v.Department] = [];
    grouped[v.Department].push(v);
  });

  Object.keys(grouped).forEach(dept => {
    nodes.push({
      key: dept,
      category: "VendorArea",
      label: dept
    });
    links.push({ from: "VENDORS", to: dept });

    grouped[dept].forEach(v => {
      const key = v["Email (required)"];
      nodes.push({
        key,
        category: "VendorItem",
        label: `${v["First name (required)"]} ${v["Last name (required)"]}`,
        sub: v.Position || ""
      });
      links.push({ from: dept, to: key });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.zoomToFit();
}

/* ========================================================================================
   LOAD CSVs
   ======================================================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => {
    TEAM_DATA = r.data
      .filter(p => p["Email (required)"])
      .map(p => ({
        id: p["Email (required)"],
        supervisorId: p["SupervisorEmail (required)"] || null,
        firstName: p["First name (required)"] || "",
        lastName: p["Last name (required)"] || "",
        role: p.Position || "",
        image: resolveImage(p)
      }));
    renderPeople();
  }
});

Papa.parse("vendors.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => {
    VENDORS_DATA = r.data.filter(v => v.Department);
  }
});

/* ========================================================================================
   CONTROLES
   ======================================================================================== */
document.getElementById("btnTeams").onclick = () => {
  CURRENT_SUPERVISOR = null;
  renderPeople();
};

document.getElementById("btnVendorsDept").onclick = renderVendors;

document.getElementById("btnZoomIn").onclick = () =>
  diagram.scale = Math.min(diagram.scale + 0.1, diagram.maxScale);

document.getElementById("btnZoomOut").onclick = () =>
  diagram.scale = Math.max(diagram.scale - 0.1, diagram.minScale);

document.getElementById("btnFit").onclick = () =>
  diagram.zoomToFit();
