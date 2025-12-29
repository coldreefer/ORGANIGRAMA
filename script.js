/******************************************************************************************
 *  ORGANIGRAMA EMR — PEOPLE + VENDORS (TREE GOJS COMPLETO Y CORRECTO)
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIG UI
   ======================================================================================== */
const UI = {
  avatarSize: 40,
  cardMargin: 12
};

/* ========================================================================================
   AVATAR DEFAULT (PEOPLE)
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
let VENDORS_DATA = [];

let CURRENT_PERSON_ID = null;
let NAV_STACK = [];
let CURRENT_MODE = "PEOPLE"; // PEOPLE | VENDORS

/* ========================================================================================
   DIAGRAM (ÚNICO – ORGCHART REAL)
   ======================================================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.4,
  maxScale: 2,
  padding: 60,
  animationManager: {
    isEnabled: true,
    duration: 350
  },
  layout: $(go.TreeLayout, {
    angle: 90,              // jerarquía clásica (jefe arriba)
    layerSpacing: 90,
    nodeSpacing: 40
  })
});

diagram.scale = 0.85;

/* ========================================================================================
   LINKS
   ======================================================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 10 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.3 })
);

/* ========================================================================================
   HELPERS PEOPLE
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

function personCard(stroke, clickable, isFocus) {
  return $(
    go.Panel, "Auto",
    {
      cursor: clickable ? "pointer" : "default",
      click: (e, panel) => {
        const data = panel.part.data;

        if (isFocus && NAV_STACK.length > 0) {
          const prev = NAV_STACK.pop();
          renderPerson(prev, true);
          return;
        }

        if (clickable && data.id !== CURRENT_PERSON_ID) {
          NAV_STACK.push(CURRENT_PERSON_ID);
          renderPerson(data.id, true);
        }
      }
    },
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke,
      strokeWidth: 2
    }),
    $(
      go.Panel, "Vertical",
      { margin: UI.cardMargin, alignment: go.Spot.Center },
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
  "Focus",
  $(go.Node, "Auto", personCard("#2563eb", true, true))
);

diagram.nodeTemplateMap.add(
  "Report",
  $(go.Node, "Auto", personCard("#14b8a6", false, false))
);

/* ========================================================================================
   NODE TEMPLATE — CONTENEDOR DE TRABAJADORES (2 FILAS HORIZONTALES)
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "WorkersRow",
  $(go.Node, "Auto",
    {
      layout: $(go.GridLayout, {
        wrappingWidth: Infinity,
        wrappingColumn: 2,          // 🔥 2 filas
        alignment: go.GridLayout.Position,
        spacing: new go.Size(20, 20)
      })
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
      fill: "white",
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
  "VendorDept",
  $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "#f8fafc",
      stroke: "#0ea5e9",
      strokeWidth: 2
    }),
    $(go.TextBlock,
      { margin: 12, font: "bold 12px sans-serif" },
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
        { font: "bold 12px sans-serif", textAlign: "center" },
        new go.Binding("text", "label")
      ),
      $(go.TextBlock,
        { font: "11px sans-serif", stroke: "#475569", textAlign: "center" },
        new go.Binding("text", "sub")
      )
    )
  )
);

/* ========================================================================================
   RENDER PEOPLE — JERARQUÍA ORIGINAL + TRABAJADORES EN 2 FILAS
   ======================================================================================== */
function renderPerson(personId, animate = true) {
  CURRENT_MODE = "PEOPLE";

  const person = TEAM_DATA.find(p => p.id === personId);
  if (!person) return;

  CURRENT_PERSON_ID = personId;

  const nodes = [];
  const links = [];

  // Supervisor
  nodes.push({
    key: person.id,
    id: person.id,
    category: "Focus",
    name: `${person.firstName} ${person.lastName}`,
    role: person.role,
    image: person.image
  });

  // Contenedor de trabajadores
  const rowKey = person.id + "_workers";
  nodes.push({
    key: rowKey,
    category: "WorkersRow"
  });

  links.push({ from: person.id, to: rowKey });

  // Trabajadores
  TEAM_DATA
    .filter(p => p.supervisorId === person.id)
    .forEach(w => {
      nodes.push({
        key: w.id,
        id: w.id,
        category: "Report",
        name: `${w.firstName} ${w.lastName}`,
        role: w.role,
        image: w.image
      });
      links.push({ from: rowKey, to: w.id });
    });

  diagram.model = new go.GraphLinksModel(nodes, links);

  if (animate) {
    requestAnimationFrame(() => {
      const node = diagram.findNodeForKey(person.id);
      if (node) diagram.centerRect(node.actualBounds);
    });
  }
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

    const root = TEAM_DATA.find(p => !p.supervisorId);
    if (root) renderPerson(root.id, false);
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
   RENDER VENDORS TREE
   ======================================================================================== */
function renderVendorsTree() {
  CURRENT_MODE = "VENDORS";

  const nodes = [];
  const links = [];

  nodes.push({
    key: "__VENDORS__",
    category: "VendorRoot",
    label: "Vendors"
  });

  const grouped = {};
  VENDORS_DATA.forEach(v => {
    const d = v.Department.trim();
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(v);
  });

  Object.keys(grouped).forEach(dept => {
    nodes.push({
      key: dept,
      category: "VendorDept",
      label: dept
    });

    links.push({ from: "__VENDORS__", to: dept });

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
   CONTROLES
   ======================================================================================== */
document.getElementById("btnZoomIn").onclick = () =>
  diagram.scale = Math.min(diagram.scale + 0.1, diagram.maxScale);

document.getElementById("btnZoomOut").onclick = () =>
  diagram.scale = Math.max(diagram.scale - 0.1, diagram.minScale);

document.getElementById("btnFit").onclick = () =>
  diagram.zoomToFit();

document.getElementById("btnTeams").onclick = () => {
  const root = TEAM_DATA.find(p => !p.supervisorId);
  NAV_STACK = [];
  if (root) renderPerson(root.id, true);
};

document.getElementById("btnVendorsDept").onclick = renderVendorsTree;

document.getElementById("btnFull").onclick = () => {
  const el = document.getElementById("diagramWrapper");
  document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
};
