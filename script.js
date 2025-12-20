const $ = go.GraphObject.make;

/* ======================================================
   AVATAR GENÉRICO (SVG EMBEBIDO)
   ====================================================== */
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#e5e7eb"/>
    <circle cx="50" cy="38" r="18" fill="#9ca3af"/>
    <path d="M20 90c4-22 56-22 60 0" fill="#9ca3af"/>
  </svg>
`);

/* ======================================================
   DIAGRAM
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,

  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.35,
  maxScale: 2.5,

  allowHorizontalScroll: true,
  allowVerticalScroll: true,
  scrollMode: go.Diagram.InfiniteScroll,

  "undoManager.isEnabled": false,
  "animationManager.isEnabled": true,
  "animationManager.duration": 350,

  layout: $(go.TreeLayout, {
    angle: 90,
    alignment: go.TreeLayout.AlignmentCenterChildren,
    nodeSpacing: 26,
    layerSpacing: 70
  })
});

/* ======================================================
   IMAGE PROXY + FALLBACK
   ====================================================== */
function resolveImage(url) {
  if (!url || url.trim() === "") return DEFAULT_AVATAR;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url);
}

/* ======================================================
   FOTO CUADRADA CON BORDE (CONSISTENTE)
   ====================================================== */
function photo(size) {
  return $(go.Panel, "Auto",
    { width: size, height: size },

    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: "#2563eb",
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

/* ======================================================
   PERSON CARD
   ====================================================== */
function personCard(border, roleColor) {
  return $(go.Node, "Vertical",
    { selectable: false },

    $(go.Panel, "Auto",
      { desiredSize: new go.Size(210, 255) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: border,
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical",
        { margin: 12 },

        photo(64),

        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 12.5px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          font: "11.5px sans-serif",
          stroke: roleColor,
          textAlign: "center"
        }, new go.Binding("text", "role"))
      )
    )
  );
}

/* ======================================================
   TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader", personCard("#2563eb", "#2563eb"));
diagram.nodeTemplateMap.add("Worker", personCard("#e5e7eb", "#475569"));
diagram.nodeTemplate = personCard("#e5e7eb", "#475569");

/* ======================================================
   SUPERVISOR GROUP
   ====================================================== */
diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: false,
      layout: $(go.GridLayout, { wrappingColumn: 2, spacing: new go.Size(20, 20) }),
      click: (e, g) => {
        diagram.startTransaction("toggle");
        g.isSubGraphExpanded = !g.isSubGraphExpanded;
        diagram.commitTransaction("toggle");
      }
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    $(go.Panel, "Auto",
      { desiredSize: new go.Size(210, 275) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#14b8a6",
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical",
        { margin: 12 },

        photo(64),

        $(go.TextBlock, {
          font: "bold 13px sans-serif",
          textAlign: "center"
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          font: "11.5px sans-serif",
          stroke: "#0f766e",
          textAlign: "center"
        }, new go.Binding("text", "role")),

        $(go.TextBlock, {
          margin: new go.Margin(6, 0, 0, 0),
          font: "10px sans-serif",
          stroke: "#64748b"
        }, new go.Binding(
          "text",
          "isSubGraphExpanded",
          e => e ? "▲ Ocultar equipo" : "▼ Ver equipo"
        ).ofObject())
      )
    ),

    $(go.Placeholder, { padding: 18 })
  );

/* ======================================================
   LINKS
   ====================================================== */
diagram.linkTemplate =
  $(go.Link,
    { routing: go.Link.Orthogonal, corner: 8 },
    $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.4 })
  );

/* ======================================================
   LOAD CSV
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => buildModel(res.data)
});

/* ======================================================
   BUILD MODEL
   ====================================================== */
function buildModel(rows) {
  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p.__id = "P_" + i);

  const nodes = [];
  const links = [];

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: leader.__id,
    category: "Leader",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || ""
  });

  people.forEach(sup => {
    if (sup["SupervisorEmail (required)"] === leader["Email (required)"]) {

      nodes.push({
        key: sup.__id,
        isGroup: true,
        name: `${sup["First name (required)"]} ${sup["Last name (required)"]}`,
        role: sup.Position || "",
        image: sup.ImageURL || ""
      });

      links.push({ from: leader.__id, to: sup.__id });

      people.forEach(worker => {
        if (worker["SupervisorEmail (required)"] === sup["Email (required)"]) {
          nodes.push({
            key: worker.__id,
            group: sup.__id,
            category: "Worker",
            name: `${worker["First name (required)"]} ${worker["Last name (required)"]}`,
            role: worker.Position || "",
            image: worker.ImageURL || ""
          });
        }
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
}
