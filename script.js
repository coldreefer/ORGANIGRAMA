const $ = go.GraphObject.make;

/* ======================================================
   CONFIG GENERAL
   ====================================================== */
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

/* ======================================================
   IMAGE RESOLVER (SOLO TEAMS)
   ====================================================== */
function resolveImage(row) {
  if (!row || !row.ImageURL) return DEFAULT_AVATAR;
  const url = row.ImageURL.toString().trim();
  return url || DEFAULT_AVATAR;
}

/* ======================================================
   DIAGRAM
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.4,
  maxScale: 2.5,
  "animationManager.isEnabled": true,
  "animationManager.duration": 300
});

/* ======================================================
   LINKS
   ====================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
);

/* ======================================================
   FOTO (TEAMS)
   ====================================================== */
function photo() {
  return $(
    go.Picture,
    {
      width: 42,
      height: 42,
      margin: new go.Margin(0, 10, 0, 0),
      imageStretch: go.GraphObject.UniformToFill
    },
    new go.Binding("source", "image")
  );
}

/* ======================================================
   CARD
   ====================================================== */
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

/* ======================================================
   ESTADO DE FOCO
   ====================================================== */
let FOCUSED_SUPERVISOR = null;
let SAVED_VIEW = null;

/* ======================================================
   FOCO SUPERVISOR
   ====================================================== */
function focusSupervisor(group) {
  diagram.startTransaction("focus");

  SAVED_VIEW = {
    position: diagram.position.copy(),
    scale: diagram.scale
  };

  FOCUSED_SUPERVISOR = group;

  diagram.nodes.each(n => {
    n.visible =
      n === group ||
      n.containingGroup === group ||
      n.data.key === group.data.key;
  });

  diagram.links.each(l => {
    l.visible =
      l.fromNode === group ||
      l.toNode === group ||
      l.toNode?.containingGroup === group;
  });

  diagram.commitTransaction("focus");

  diagram.centerRect(group.actualBounds);
  diagram.scale = Math.min(1.8, diagram.maxScale);
}

/* ======================================================
   RESTAURAR VISTA
   ====================================================== */
function restoreView() {
  if (!SAVED_VIEW) return;

  diagram.startTransaction("restore");

  diagram.nodes.each(n => n.visible = true);
  diagram.links.each(l => l.visible = true);

  diagram.position = SAVED_VIEW.position;
  diagram.scale = SAVED_VIEW.scale;

  FOCUSED_SUPERVISOR = null;
  SAVED_VIEW = null;

  diagram.commitTransaction("restore");
}

/* ======================================================
   TEAM TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader",
  $(go.Node, "Auto", card("#2563eb", true, true))
);

diagram.groupTemplateMap.add("Supervisor",
  $(go.Group, "Vertical",
    new go.Binding("isSubGraphExpanded", "hasChildren", h => false),
    new go.Binding("selectable", "hasChildren"),
    new go.Binding("pickable", "hasChildren"),
    {
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 20,
        layerSpacing: 30
      })
    },
    $(
      go.Panel, "Auto",
      {
        cursor: "pointer",
        click: (e, p) => {
          if (!p.part.data.hasChildren) return;

          // Si ya está enfocado → volver arriba
          if (FOCUSED_SUPERVISOR === p.part) {
            restoreView();
            return;
          }

          // Expandir si estaba colapsado
          if (!p.part.isSubGraphExpanded) {
            diagram.startTransaction("expand");
            p.part.isSubGraphExpanded = true;
            diagram.commitTransaction("expand");
          }

          // Entrar en foco
          focusSupervisor(p.part);
        }
      },
      card("#14b8a6", true, true)
    ),
    $(go.Placeholder,
      { padding: 14 },
      new go.Binding("visible", "hasChildren")
    )
  )
);

/* ======================================================
   WORKER TEMPLATE
   ====================================================== */
diagram.nodeTemplateMap.add("Worker",
  $(go.Node, "Auto",
    card("#e5e7eb", true, false)
  )
);

/* ======================================================
   VENDOR TEMPLATES
   ====================================================== */

// ROOT
diagram.nodeTemplateMap.add("VendorRoot",
  $(go.Node, "Auto",
    {
      cursor: "pointer",
      click: (e, node) => {
        if (node.isTreeExpanded) {
          diagram.commandHandler.collapseTree(node);
        } else {
          diagram.commandHandler.expandTree(node);
        }
      }
    },
    card("#64748b", false, true)
  )
);

// AREA
diagram.nodeTemplateMap.add("VendorArea",
  $(go.Node, "Auto",
    {
      cursor: "pointer",
      click: (e, node) => {
        if (node.isTreeExpanded) {
          diagram.commandHandler.collapseTree(node);
        } else {
          diagram.commandHandler.expandTree(node);
        }
      }
    },
    card("#7c3aed", false, true)
  )
);

// ITEM FINAL
diagram.nodeTemplateMap.add("VendorItem",
  $(go.Node, "Auto", card("#e5e7eb", false, false))
);

/* ======================================================
   BUILD TEAMS
   ====================================================== */
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
      hasChildren: workers.length > 0
    });

    links.push({ from: leader.id, to: s.id });

    workers.forEach(w => {
      nodes.push({
        key: w.id,
        category: "Worker",
        group: s.id,
        name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
        role: w.Position || "",
        image: resolveImage(w)
      });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 90 });
}

/* ======================================================
   BUILD VENDORS
   ====================================================== */
function buildVendors(rows) {
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

/* ======================================================
   LOAD CSV
   ====================================================== */
let TEAM_DATA = [];
let VENDOR_DATA = [];

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
  complete: r => VENDOR_DATA = r.data
});

/* ======================================================
   BUTTONS
   ====================================================== */
document.getElementById("btnTeams").onclick = () => buildTeam(TEAM_DATA);
document.getElementById("btnVendorsDept").onclick = () => buildVendors(VENDOR_DATA);

/* ======================================================
   CONTROLES UI
   ====================================================== */

// Zoom +
const btnZoomIn = document.getElementById("btnZoomIn");
if (btnZoomIn) {
  btnZoomIn.addEventListener("click", () => {
    if (diagram) diagram.commandHandler.increaseZoom();
  });
}

// Zoom -
const btnZoomOut = document.getElementById("btnZoomOut");
if (btnZoomOut) {
  btnZoomOut.addEventListener("click", () => {
    if (diagram) diagram.commandHandler.decreaseZoom();
  });
}

// Ajustar a pantalla
const btnFit = document.getElementById("btnFit");
if (btnFit) {
  btnFit.addEventListener("click", () => {
    if (!diagram) return;
    diagram.commandHandler.zoomToFit();
    diagram.alignDocument(go.Spot.Center, go.Spot.Center);
  });
}

// Pantalla completa
const btnFull = document.getElementById("btnFull");
const wrapper = document.getElementById("diagramWrapper");

if (btnFull && wrapper) {
  btnFull.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen()
        .then(() => {
          if (diagram) diagram.commandHandler.zoomToFit();
        })
        .catch(err => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen();
    }
  });
}
