/******************************************************************************************
 *  ORGANIGRAMA EMR — SCRIPT PRINCIPAL
 *  Versión explícita, extendida y mantenible
 *  Incluye:
 *   - Teams
 *   - Vendors
 *   - Vista foco por Supervisor
 *   - Grilla horizontal de Workers (6 columnas)
 *   - Restauración completa de estado
 ******************************************************************************************/

/* ========================================================================================
   GOJS FACTORY
   ======================================================================================== */
const $ = go.GraphObject.make;

/* ========================================================================================
   CONSTANTES VISUALES Y CONFIGURACIÓN GLOBAL
   ======================================================================================== */
const UI_CONFIG = {
  avatarSize: 42,
  cardMargin: 12,
  workerGridColumns: 6,
  workerGridSpacing: 30,
  focusZoom: 1.35,
  animationDuration: 350
};

/* ========================================================================================
   AVATAR POR DEFECTO (INLINE SVG)
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
   ESTADO GLOBAL DE LA APLICACIÓN
   ======================================================================================== */
const APP_STATE = {
  focusedSupervisor: null,
  savedDiagramPosition: null,
  savedDiagramScale: null,
  teamData: [],
  vendorData: []
};

/* ========================================================================================
   DIAGRAM BASE
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
  "animationManager.duration": UI_CONFIG.animationDuration
});

/* ========================================================================================
   LINK TEMPLATE
   ======================================================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
);

/* ========================================================================================
   UTILIDADES DE IMAGEN
   ======================================================================================== */
function resolveImage(row) {
  if (!row) return DEFAULT_AVATAR;
  if (!row.ImageURL) return DEFAULT_AVATAR;
  const url = row.ImageURL.toString().trim();
  if (url.length === 0) return DEFAULT_AVATAR;
  return url;
}

/* ========================================================================================
   COMPONENTES VISUALES (PHOTO / CARD)
   ======================================================================================== */
function buildPhoto() {
  return $(
    go.Picture,
    {
      width: UI_CONFIG.avatarSize,
      height: UI_CONFIG.avatarSize,
      margin: new go.Margin(0, 10, 0, 0),
      imageStretch: go.GraphObject.UniformToFill
    },
    new go.Binding("source", "image")
  );
}

function buildCard(strokeColor, withPhoto, showCount) {
  return $(
    go.Panel,
    "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: strokeColor,
      strokeWidth: 2
    }),
    $(
      go.Panel,
      "Horizontal",
      { margin: UI_CONFIG.cardMargin },
      withPhoto ? buildPhoto() : $(go.Panel),
      $(
        go.Panel,
        "Vertical",
        $(go.TextBlock, {
          font: "bold 13px sans-serif"
        }, new go.Binding("text", "name")),
        $(go.TextBlock, {
          font: "11px sans-serif",
          stroke: "#475569"
        }, new go.Binding("text", "role")),
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
   LAYOUTS DEFINIDOS EXPLÍCITAMENTE
   ======================================================================================== */
const LAYOUT_SUPERVISOR_TREE = $(go.TreeLayout, {
  angle: 90,
  nodeSpacing: 20,
  layerSpacing: 30
});

const LAYOUT_WORKER_GRID = $(go.GridLayout, {
  wrappingColumn: UI_CONFIG.workerGridColumns,
  spacing: new go.Size(
    UI_CONFIG.workerGridSpacing,
    UI_CONFIG.workerGridSpacing
  ),
  alignment: go.GridLayout.Position
});

/* ========================================================================================
   CONTROL DE FOCO — ENTRAR
   ======================================================================================== */
function enterSupervisorFocus(group) {

  diagram.startTransaction("enterSupervisorFocus");

  // Guardar cámara
  APP_STATE.savedDiagramPosition = diagram.position.copy();
  APP_STATE.savedDiagramScale = diagram.scale;
  APP_STATE.focusedSupervisor = group;

  // Ocultar todo lo que no pertenece al grupo
  diagram.nodes.each(node => {
    if (node === group) {
      node.visible = true;
    } else if (node.containingGroup === group) {
      node.visible = true;
    } else {
      node.visible = false;
    }
  });

  diagram.links.each(link => link.visible = false);

  // Cambiar layout del grupo
  group.layout = LAYOUT_WORKER_GRID;
  group.isSubGraphExpanded = true;

  diagram.commitTransaction("enterSupervisorFocus");

  // Ajustar cámara
  diagram.centerRect(group.actualBounds);
  diagram.scale = UI_CONFIG.focusZoom;
}

/* ========================================================================================
   CONTROL DE FOCO — SALIR
   ======================================================================================== */
function exitSupervisorFocus() {

  if (!APP_STATE.focusedSupervisor) return;

  diagram.startTransaction("exitSupervisorFocus");

  // Restaurar visibilidad
  diagram.nodes.each(node => node.visible = true);
  diagram.links.each(link => link.visible = true);

  // Restaurar layout del supervisor
  APP_STATE.focusedSupervisor.layout = LAYOUT_SUPERVISOR_TREE;
  APP_STATE.focusedSupervisor.isSubGraphExpanded = false;

  // Restaurar cámara
  diagram.position = APP_STATE.savedDiagramPosition;
  diagram.scale = APP_STATE.savedDiagramScale;

  APP_STATE.focusedSupervisor = null;
  APP_STATE.savedDiagramPosition = null;
  APP_STATE.savedDiagramScale = null;

  diagram.commitTransaction("exitSupervisorFocus");
}

/* ========================================================================================
   NODE & GROUP TEMPLATES
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "Leader",
  $(go.Node, "Auto", buildCard("#2563eb", true, true))
);

diagram.groupTemplateMap.add(
  "Supervisor",
  $(go.Group, "Vertical",
    {
      layout: LAYOUT_SUPERVISOR_TREE
    },
    $(
      go.Panel,
      "Auto",
      {
        cursor: "pointer",
        click: (e, panel) => {
          const group = panel.part;

          if (!group.data.hasChildren) return;

          if (APP_STATE.focusedSupervisor === group) {
            exitSupervisorFocus();
          } else {
            enterSupervisorFocus(group);
          }
        }
      },
      buildCard("#14b8a6", true, true)
    ),
    $(go.Placeholder, { padding: 20 })
  )
);

diagram.nodeTemplateMap.add(
  "Worker",
  $(go.Node, "Auto", buildCard("#e5e7eb", true, false))
);

/* ========================================================================================
   VENDOR TEMPLATES
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "VendorRoot",
  $(go.Node, "Auto", buildCard("#64748b", false, true))
);

diagram.nodeTemplateMap.add(
  "VendorArea",
  $(go.Node, "Auto", buildCard("#7c3aed", false, true))
);

diagram.nodeTemplateMap.add(
  "VendorItem",
  $(go.Node, "Auto", buildCard("#e5e7eb", false, false))
);

/* ========================================================================================
   BUILD TEAM DATA
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

/* ========================================================================================
   BUILD VENDORS DATA
   ======================================================================================== */
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
      const vendorKey = `V_${vendorIdx++}`;
      nodes.push({
        key: vendorKey,
        category: "VendorItem",
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`.trim(),
        role: v.Position || ""
      });
      links.push({ from: areaKey, to: vendorKey });
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
    APP_STATE.teamData = r.data;
    buildTeam(APP_STATE.teamData);
  }
});

Papa.parse("vendors.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => {
    APP_STATE.vendorData = r.data;
  }
});

/* ========================================================================================
   BOTONES
   ======================================================================================== */
document.getElementById("btnTeams").onclick = () => buildTeam(APP_STATE.teamData);
document.getElementById("btnVendorsDept").onclick = () => buildVendors(APP_STATE.vendorData);
