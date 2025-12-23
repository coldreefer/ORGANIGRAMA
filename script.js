/******************************************************************************************
 *  ORGANIGRAMA EMR — WORKDAY REAL (PERSON-CENTERED)
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ========================================================================================
   CONFIG UI
   ======================================================================================== */
const UI = {
  avatarSize: 46,
  cardMargin: 14
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

/* ========================================================================================
   DIAGRAM
   ======================================================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.5,
  maxScale: 2.5,
  padding: 40,
  layout: $(go.TreeLayout, {
    angle: 90,
    layerSpacing: 80,
    nodeSpacing: 30
  })
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

function personCard(stroke, clickable) {
  return $(
    go.Panel, "Auto",
    {
      cursor: clickable ? "pointer" : "default",
      click: clickable
        ? (e, panel) => {
            const data = panel.part.data;
            renderPerson(data.id);
          }
        : null
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
        stroke: "#0f172a",
        textAlign: "center",
        margin: new go.Margin(4, 0, 2, 0)
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
  $(go.Node, "Auto", personCard("#2563eb", false))
);

diagram.nodeTemplateMap.add(
  "Report",
  $(go.Node, "Auto", personCard("#14b8a6", true))
);

/* ========================================================================================
   CORE — RENDER PERSON (WORKDAY REAL)
   ======================================================================================== */
function renderPerson(personId) {
  const person = TEAM_DATA.find(p => p.id === personId);
  if (!person) return;

  CURRENT_PERSON_ID = personId;

  const nodes = [];
  const links = [];

  // Persona foco (arriba)
  nodes.push({
    key: person.id,
    id: person.id,
    category: "Focus",
    name: `${person.firstName} ${person.lastName}`,
    role: person.role,
    image: person.image
  });

  // Reportes directos (abajo)
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

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.zoomToFit();
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

    // Persona raíz (sin supervisor)
    const root = TEAM_DATA.find(p => !p.supervisorId);
    if (root) renderPerson(root.id);
  }
});

/* ========================================================================================
   BOTÓN VOLVER A ROOT
   ======================================================================================== */
document.getElementById("btnTeams").onclick = () => {
  const root = TEAM_DATA.find(p => !p.supervisorId);
  if (root) renderPerson(root.id);
};
