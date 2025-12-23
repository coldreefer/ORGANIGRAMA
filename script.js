/******************************************************************************************
 * ORGANIGRAMA EMR — WORKDAY REAL (ESTABLE)
 ******************************************************************************************/

const $ = go.GraphObject.make;

/* ======================================================================================
   CONFIG
   ====================================================================================== */
const UI = {
  avatarSize: 42,
  workerColumns: 6
};

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

/* ======================================================================================
   ESTADO
   ====================================================================================== */
let TEAM_DATA = [];
let VENDOR_DATA = [];
let ACTIVE_SUPERVISOR = null;

/* ======================================================================================
   DIAGRAM
   ====================================================================================== */
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

/* ======================================================================================
   LINKS
   ====================================================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
);

/* ======================================================================================
   HELPERS
   ====================================================================================== */
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

/* ======================================================================================
   DOM READY (CLAVE)
   ====================================================================================== */
document.addEventListener("DOMContentLoaded", () => {

  const overlay = document.getElementById("teamOverlay");
  const overlayTitle = document.getElementById("teamTitle");
  const overlayGrid = document.getElementById("teamGrid");
  const overlayClose = document.getElementById("btnCloseTeam");

  if (!overlay || !overlayTitle || !overlayGrid || !overlayClose) {
    console.warn("Overlay HTML no encontrado — Teams deshabilitado");
    return;
  }

  function closeOverlay() {
    overlay.classList.remove("visible");
    overlayGrid.innerHTML = "";
    ACTIVE_SUPERVISOR = null;
  }

  overlayClose.addEventListener("click", closeOverlay);

  function openOverlay(supervisor) {

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

  /* ====================================================================================
     TEMPLATES
     ==================================================================================== */
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

});

/* ======================================================================================
   BUILD TEAMS
   ====================================================================================== */
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

/* ======================================================================================
   LOAD CSV
   ====================================================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => {
    TEAM_DATA = r.data;
    buildTeam(TEAM_DATA);
  }
});
