const $ = go.GraphObject.make;

/* ======================================================
   DIAGRAMA
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,

  allowMove: false,
  allowCopy: false,

  // 🔍 ZOOM
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.4,
  maxScale: 2,

  // ✋ PAN (activo por defecto en GoJS)
  allowHorizontalScroll: true,
  allowVerticalScroll: true,

  "undoManager.isEnabled": false,

  layout: $(go.TreeLayout, {
    angle: 90,
    arrangement: go.TreeLayout.ArrangementHorizontal,
    nodeSpacing: 40,
    layerSpacing: 60
  })
});

/* ======================================================
   PROXY IMÁGENES (CCV / CORS)
   ====================================================== */
function proxyImage(url) {
  if (!url) return "";
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url);
}

/* ======================================================
   FOTO CIRCULAR REAL
   ====================================================== */
function circularPhoto(size) {
  return $(go.Panel, "Spot",
    {
      width: size,
      height: size,
      clipping: true
    },

    $(go.Shape, "Circle", {
      width: size,
      height: size,
      fill: "#e5e7eb",
      stroke: "#cbd5e1",
      strokeWidth: 2
    }),

    $(go.Picture, {
      width: size,
      height: size,
      imageStretch: go.GraphObject.UniformToFill
    }, new go.Binding("source", "image", proxyImage))
  );
}

/* ======================================================
   PERSONA
   ====================================================== */
function personTemplate(border, roleColor) {
  return $(go.Node, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer"
    },

    $(go.Panel, "Auto",
      { desiredSize: new go.Size(190, 245) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: border,
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical",
        { margin: 12 },

        circularPhoto(64),

        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 12px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 3
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(2, 6, 0, 6),
          font: "11px sans-serif",
          stroke: roleColor,
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2
        }, new go.Binding("text", "role"))
      )
    )
  );
}

/* ======================================================
   TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add(
  "Leader",
  personTemplate("#2563eb", "#2563eb")
);

diagram.nodeTemplateMap.add(
  "Worker",
  personTemplate("#e5e7eb", "#475569")
);

diagram.nodeTemplate = personTemplate("#e5e7eb", "#475569");

/* ======================================================
   SUPERVISOR (GROUP)
   ====================================================== */
diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer",

      layout: $(go.GridLayout, {
        wrappingColumn: 2,
        spacing: new go.Size(22, 22)
      }),

      isSubGraphExpanded: false,

      click: (e, g) => {
        diagram.startTransaction("toggle");
        g.isSubGraphExpanded = !g.isSubGraphExpanded;
        diagram.commitTransaction("toggle");
      }
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    $(go.Panel, "Auto",
      { desiredSize: new go.Size(200, 255) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#14b8a6",
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical",
        { margin: 12 },

        circularPhoto(64),

        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 13px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 3
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(2, 6, 0, 6),
          font: "11px sans-serif",
          stroke: "#0f766e",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2
        }, new go.Binding("text", "role"))
      )
    ),

    $(go.Placeholder, { padding: 18 })
  );

/* ======================================================
   LINKS
   ====================================================== */
diagram.linkTemplate =
  $(go.Link,
    { routing: go.Link.Orthogonal, corner: 6 },
    $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.4 })
  );

/* ======================================================
   CSV
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: r => buildModel(r.data)
});

/* ======================================================
   MODELO
   ====================================================== */
function buildModel(rows) {

  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p.__id = "P_" + i);

  const nodes = [];
  const links = [];

  nodes.push({ key: "ROOT", name: "EMR TEAM", category: "Leader" });

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: leader.__id,
    category: "Leader",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || ""
  });

  links.push({ from: "ROOT", to: leader.__id });

  people.forEach(s => {
    if (s["SupervisorEmail (required)"] === leader["Email (required)"]) {

      nodes.push({
        key: s.__id,
        isGroup: true,
        name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
        role: s.Position || "",
        image: s.ImageURL || ""
      });

      links.push({ from: leader.__id, to: s.__id });

      people.forEach(w => {
        if (w["SupervisorEmail (required)"] === s["Email (required)"]) {
          nodes.push({
            key: w.__id,
            group: s.__id,
            category: "Worker",
            name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
            role: w.Position || "",
            image: w.ImageURL || ""
          });
        }
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
}
