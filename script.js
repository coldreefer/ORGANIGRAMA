/* ======================================================
   1. CONSTANTES Y CONFIGURACIÓN
   ====================================================== */
const $ = go.GraphObject.make;

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
   2. INICIALIZACIÓN DEL DIAGRAM
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,

  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.35,
  maxScale: 2.5,
  allowHorizontalScroll: true,
  allowVerticalScroll: true,
  scrollMode: go.Diagram.InfiniteScroll,

  "animationManager.isEnabled": true,
  "animationManager.duration": 320,
  "undoManager.isEnabled": false
});

/* ======================================================
   3. HELPERS GENERALES
   ====================================================== */
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function goToNodeByKey(key) {
  const node = diagram.findNodeForKey(key);
  if (node) diagram.centerRect(node.actualBounds);
}

function resolveImage(url) {
  if (!url || String(url).trim() === "") return DEFAULT_AVATAR;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url);
}

function photo(size, strokeColor) {
  return $(go.Panel, "Auto",
    { width: size, height: size },
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: strokeColor,
      strokeWidth: 2,
      parameter1: 6
    }),
    $(go.Picture, {
      width: size - 6,
      height: size - 6,
      margin: 3,
      imageStretch: go.GraphObject.UniformToFill
    }, new go.Binding("source", "image", resolveImage))
  );
}

function countLine() {
  return $(go.TextBlock, {
    margin: new go.Margin(6, 0, 0, 0),
    font: "10px sans-serif",
    stroke: "#64748b",
    textAlign: "center"
  },
    new go.Binding("visible", "teamCount", n => Number(n || 0) > 0),
    new go.Binding("text", "teamCount", n => `A cargo: ${n}`)
  );
}

/* ======================================================
   4. TEMPLATES DE PERSONAS
   ====================================================== */
function personCard(border, roleColor, photoBorder) {
  return $(go.Node, "Vertical",
    { selectable: false },
    $(go.Panel, "Auto",
      { desiredSize: new go.Size(210, 265) },
      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: border,
        strokeWidth: 2
      }),
      $(go.Panel, "Vertical", { margin: 12 },
        photo(64, photoBorder),
        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 12.5px sans-serif",
          textAlign: "center"
        }, new go.Binding("text", "name")),
        $(go.TextBlock, {
          margin: new go.Margin(2, 6, 0, 6),
          font: "11.5px sans-serif",
          stroke: roleColor,
          textAlign: "center"
        }, new go.Binding("text", "role")),
        countLine()
      )
    )
  );
}

diagram.nodeTemplateMap.add("Leader", personCard("#2563eb", "#2563eb", "#2563eb"));
diagram.nodeTemplateMap.add("Worker", personCard("#e5e7eb", "#475569", "#94a3b8"));

/* ======================================================
   5. GROUP TEMPLATES (TEAMS)
   ====================================================== */
diagram.groupTemplateMap.add("EMR_ROOT",
  $(go.Group, "Auto",
    {
      layout: $(go.TreeLayout, {
        angle: 90,
        alignment: go.TreeLayout.AlignmentCenterChildren,
        nodeSpacing: 26,
        layerSpacing: 70
      })
    },
    $(go.Placeholder, { padding: 20 })
  )
);

diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: false,
      layout: $(go.GridLayout, {
        wrappingColumn: 2,
        spacing: new go.Size(20, 20)
      })
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),
    $(go.Panel, "Auto",
      {
        cursor: "pointer",
        click: (e, p) => {
          e.diagram.startTransaction("toggle");
          p.part.isSubGraphExpanded = !p.part.isSubGraphExpanded;
          e.diagram.commitTransaction("toggle");
        }
      },
      { desiredSize: new go.Size(210, 300) },
      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#14b8a6",
        strokeWidth: 2
      }),
      $(go.Panel, "Vertical", { margin: 12 },
        photo(64, "#14b8a6"),
        $(go.TextBlock, {
          font: "bold 13px sans-serif",
          textAlign: "center"
        }, new go.Binding("text", "name")),
        $(go.TextBlock, {
          font: "11.5px sans-serif",
          stroke: "#0f766e",
          textAlign: "center"
        }, new go.Binding("text", "role")),
        countLine(),
        $(go.TextBlock, {
          font: "10px sans-serif",
          stroke: "#64748b"
        },
          new go.Binding("text", "isSubGraphExpanded",
            e => e ? "▲ Ocultar equipo" : "▼ Ver equipo"
          ).ofObject()
        )
      )
    ),
    $(go.Placeholder, { padding: 18 })
  );

/* ======================================================
   6. LINKS
   ====================================================== */
diagram.linkTemplate =
  $(go.Link,
    { routing: go.Link.Orthogonal, corner: 8 },
    $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.4 })
  );

/* ======================================================
   7. BUILD TEAM MODEL
   ====================================================== */
function buildTeam(rows) {
  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p.__id = "P_" + i);

  const nodes = [];
  const links = [];

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: "EMR_ROOT",
    isGroup: true,
    category: "EMR_ROOT",
    loc: "0 0",
    isLayoutPositioned: false
  });

  nodes.push({
    key: leader.__id,
    category: "Leader",
    group: "EMR_ROOT",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || "",
    teamCount: people.length - 1
  });

  const leaderEmail = leader["Email (required)"];

  people.forEach(s => {
    if (s["SupervisorEmail (required)"] === leaderEmail) {
      const workers = people.filter(w => w["SupervisorEmail (required)"] === s["Email (required)"]);

      nodes.push({
        key: s.__id,
        isGroup: true,
        group: "EMR_ROOT",
        name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
        role: s.Position || "",
        image: s.ImageURL || "",
        teamCount: workers.length
      });

      links.push({ from: leader.__id, to: s.__id });

      workers.forEach(w => {
        nodes.push({
          key: w.__id,
          category: "Worker",
          group: s.__id,
          name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
          role: w.Position || "",
          image: w.ImageURL || ""
        });
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);

  setTimeout(() => goToNodeByKey("EMR_ROOT"), 60);
}

/* ======================================================
   8. LOAD CSV TEAM
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: r => buildTeam(r.data)
});

/* ======================================================
   9. CONTROLES UI
   ====================================================== */
document.getElementById("btnZoomIn")?.addEventListener("click", () => {
  diagram.scale = clamp(diagram.scale * 1.12, diagram.minScale, diagram.maxScale);
});

document.getElementById("btnZoomOut")?.addEventListener("click", () => {
  diagram.scale = clamp(diagram.scale / 1.12, diagram.minScale, diagram.maxScale);
});

document.getElementById("btnFit")?.addEventListener("click", () => {
  diagram.zoomToFit();
});
