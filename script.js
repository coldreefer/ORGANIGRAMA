/******************************************************************************************
 *  ORGCHART EMR — PEOPLE + VENDORS  (FINAL ESTABLE CORREGIDO)
 *  - Cards tamaño fijo (todas iguales)
 *  - Solo un supervisor expandido a la vez
 *  - Click SOLO si tiene gente a cargo
 *  - Blur visual del resto
 *  - Vendors en organigrama independiente
 *  - Zoom con rueda del mouse (NO se resetea)
 *  - Zoom inicial alejado (solo una vez)
 *  - Panning libre real (arrastrar fondo)
 *  - Animaciones suaves reales (layout + fade)
 *  - SIN errores de transacción / model
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIG UI
   ======================================================================================== */
const UI = {
  avatarSize: 42,
  padding: 12,
  cardWidth: 160,
  cardHeight: 190,
  initialScale: 0.7
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
let FIRST_RENDER = true;

/* ========================================================================================
   DIAGRAM — ZOOM + PAN REAL + ANIMACIONES
   ======================================================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  initialScale: UI.initialScale,

  allowMove: false,
  allowCopy: false,
  allowSelect: false,

  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.4,
  maxScale: 2,

  allowHorizontalScroll: true,
  allowVerticalScroll: true,

  padding: 300,

  animationManager: {
    isEnabled: true,
    duration: 300,
    easing: go.Animation.EaseOutCubic
  }
});

diagram.toolManager.panningTool.isEnabled = true;
diagram.toolManager.mouseWheelBehavior = go.ToolManager.WheelZoom;

/* ========================================================================================
   LINK TEMPLATE
   ======================================================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 12 },
  $(go.Shape,
    { stroke: "#cbd5e1", strokeWidth: 1.4 },
    new go.Binding("opacity", "dimmed", d => d ? 0.05 : 1).ofObject()
  )
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
      margin: new go.Margin(0, 0, 8, 0)
    },
    new go.Binding("source", "image"),
    new go.Binding("opacity", "dimmed", d => d ? 0.02 : 1)
  );
}

function personCard(stroke) {
  return $(
    go.Panel, "Auto",
    {
      cursor: "pointer",
      click: (e, node) => {
        const d = node.part.data;
        if (d.canExpand) toggleSupervisor(d.key);
      }
    },
    $(go.Shape, "RoundedRectangle",
      {
        fill: "white",
        stroke,
        strokeWidth: 2,
        desiredSize: new go.Size(UI.cardWidth, UI.cardHeight)
      },
      new go.Binding("opacity", "dimmed", d => d ? 0.05 : 1)
    ),
    $(go.Panel, "Vertical",
      {
        margin: UI.padding,
        width: UI.cardWidth - 20,
        alignment: go.Spot.Center
      },
      avatar(),
      $(go.TextBlock,
        {
          font: "bold 12.5px sans-serif",
          textAlign: "center",
          maxLines: 1,
          overflow: go.TextBlock.Ellipsis
        },
        new go.Binding("text", "name"),
        new go.Binding("opacity", "dimmed", d => d ? 0.05 : 1)
      ),
      $(go.TextBlock,
        {
          font: "11px sans-serif",
          stroke: "#475569",
          textAlign: "center",
          maxLines: 2,
          overflow: go.TextBlock.Ellipsis
        },
        new go.Binding("text", "role"),
        new go.Binding("opacity", "dimmed", d => d ? 0.05 : 1)
      )
    )
  );
}

/* ========================================================================================
   NODE TEMPLATES — PEOPLE
   ======================================================================================== */
diagram.nodeTemplateMap.add("Boss", $(go.Node, "Auto", personCard("#2563eb")));
diagram.nodeTemplateMap.add("Supervisor", $(go.Node, "Auto", personCard("#2563eb")));
diagram.nodeTemplateMap.add("Worker", $(go.Node, "Auto", personCard("#94a3b8")));

/* ========================================================================================
   WORKERS GROUP (2 FILAS)
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "WorkersGroup",
  $(go.Group, "Auto",
    {
      layout: $(go.GridLayout, {
        wrappingColumn: 4,
        spacing: new go.Size(24, 24)
      }),
      selectable: false
    },
    $(go.Shape, { fill: "transparent", strokeWidth: 0 }),
    $(go.Placeholder, { padding: 10 })
  )
);

/* ========================================================================================
   NODE TEMPLATES — VENDORS
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
   RENDER PEOPLE (SIN TRANSACCIONES)
   ======================================================================================== */
function renderPeople(supervisorId = null) {

  diagram.layout = $(go.TreeLayout, {
    angle: 90,
    layerSpacing: 90,
    nodeSpacing: 40
  });

  const nodes = [];
  const links = [];

  const boss = TEAM_DATA.find(p => !p.supervisorId);
  if (!boss) return;

  const hasChildren = id => TEAM_DATA.some(p => p.supervisorId === id);

  nodes.push({
    key: boss.id,
    category: "Boss",
    name: `${boss.firstName} ${boss.lastName}`,
    role: boss.role,
    image: boss.image,
    canExpand: hasChildren(boss.id),
    dimmed: !!supervisorId
  });

  TEAM_DATA.filter(p => p.supervisorId === boss.id).forEach(s => {
    nodes.push({
      key: s.id,
      category: "Supervisor",
      name: `${s.firstName} ${s.lastName}`,
      role: s.role,
      image: s.image,
      canExpand: hasChildren(s.id),
      dimmed: supervisorId && supervisorId !== s.id
    });
    links.push({ from: boss.id, to: s.id });
  });

  if (supervisorId) {
    const groupKey = supervisorId + "_workers";
    nodes.push({ key: groupKey, category: "WorkersGroup" });
    links.push({ from: supervisorId, to: groupKey });

    TEAM_DATA.filter(p => p.supervisorId === supervisorId).forEach(w => {
      nodes.push({
        key: w.id,
        category: "Worker",
        name: `${w.firstName} ${w.lastName}`,
        role: w.role,
        image: w.image,
        group: groupKey,
        canExpand: false,
        dimmed: false
      });
    });
  }

  diagram.model = new go.GraphLinksModel(nodes, links);

  if (FIRST_RENDER) {
    requestAnimationFrame(() => diagram.zoomToFit());
    FIRST_RENDER = false;
  }
}

/* ========================================================================================
   SUPERVISOR CLICK
   ======================================================================================== */
function toggleSupervisor(key) {
  CURRENT_SUPERVISOR = (CURRENT_SUPERVISOR === key) ? null : key;
  renderPeople(CURRENT_SUPERVISOR);
}

/* ========================================================================================
   RENDER VENDORS
   ======================================================================================== */
function renderVendors() {

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
