/******************************************************************************************
 *  ORGANIGRAMA EMR — WORKDAY REAL + ANIMACIÓN + HISTORIAL
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIG UI
   ======================================================================================== */
const UI = {
  avatarSize: 48,
  cardMargin: 16
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
let CURRENT_PERSON_ID = null;
let NAV_STACK = [];

/* ========================================================================================
   DIAGRAM
   ======================================================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.6,
  maxScale: 2.5,
  padding: 80,
  animationManager: {
    isEnabled: true,
    duration: 350
  },
  layout: $(go.TreeLayout, {
    angle: 90,
    layerSpacing: 120,
    nodeSpacing: 60
  })
});

/* ========================================================================================
   LINKS
   ======================================================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 10 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
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
      margin: new go.Margin(0, 0, 10, 0)
    },
    new go.Binding("source", "image")
  );
}

function personCard(stroke, isClickable, isFocus) {
  return $(
    go.Panel, "Auto",
    {
      cursor: isClickable ? "pointer" : "default",
      click: (e, panel) => {
        const data = panel.part.data;
        if (isFocus && NAV_STACK.length > 0) {
          const prev = NAV_STACK.pop();
          renderPerson(prev, false);
        } else if (isClickable && data.id !== CURRENT_PERSON_ID) {
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
      $(go.TextBlock, {
        font: "bold 13px sans-serif",
        textAlign: "center"
      }, new go.Binding("text", "name")),
      $(go.TextBlock, {
        font: "12px sans-serif",
        stroke: "#475569",
        textAlign: "center"
      }, new go.Binding("text", "role"))
    )
  );
}

/* ========================================================================================
   NODE TEMPLATES
   ======================================================================================== */
diagram.nodeTemplateMap.add(
  "Focus",
  $(go.Node, "Auto", personCard("#2563eb", true, true))
);

diagram.nodeTemplateMap.add(
  "Report",
  $(go.Node, "Auto", personCard("#14b8a6", true, false))
);

/* ========================================================================================
   CORE — RENDER PERSON (CON ANIMACIÓN)
   ======================================================================================== */
function renderPerson(personId, animate = true) {
  const person = TEAM_DATA.find(p => p.id === personId);
  if (!person) return;

  CURRENT_PERSON_ID = personId;

  const nodes = [];
  const links = [];

  nodes.push({
    key: person.id,
    id: person.id,
    category: "Focus",
    name: `${person.firstName} ${person.lastName}`,
    role: person.role,
    image: person.image
  });

  const reports = TEAM_DATA.filter(p => p.supervisorId === person.id);

  reports.forEach(r => {
    nodes.push({
      key: r.id,
      id: r.id,
      category: "Report",
      name: `${r.firstName} ${r.lastName}`,
      role: r.role,
      image: r.image
    });
    links.push({ from: person.id, to: r.id });
  });

  diagram.startTransaction("render-person");
  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.commitTransaction("render-person");

  if (animate) {
    setTimeout(() => {
      const node = diagram.findNodeForKey(person.id);
      if (node) diagram.centerRect(node.actualBounds);
    }, 50);
  }
}

/* ========================================================================================
   LOAD CSV
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

/* ========================================================================================
   BOTÓN VOLVER A ROOT
   ======================================================================================== */
document.getElementById("btnTeams").onclick = () => {
  const root = TEAM_DATA.find(p => !p.supervisorId);
  NAV_STACK = [];
  if (root) renderPerson(root.id, true);
};
