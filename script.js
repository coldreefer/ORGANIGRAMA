const $ = go.GraphObject.make;

/* ======================================================
   DIAGRAMA
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,

  allowMove: false,
  allowCopy: false,

  allowZoom: true,
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.4,
  maxScale: 1.5,

  allowHorizontalScroll: true,
  allowVerticalScroll: true,

  "undoManager.isEnabled": false,

  layout: $(go.TreeLayout, {
    angle: 90,
    arrangement: go.TreeLayout.ArrangementHorizontal,
    nodeSpacing: 40,
    layerSpacing: 50
  })
});

/* ======================================================
   FUNCIÓN FOTO CIRCULAR (FORMA CORRECTA)
   ====================================================== */
function circularPhoto(size, strokeColor) {
  return $(go.Shape, "Circle",
    {
      width: size,
      height: size,
      stroke: strokeColor,
      strokeWidth: 2,
      fill: "#e5e7eb"
    },
    new go.Binding("fill", "image", img =>
      img
        ? $(go.Brush, "Image", { source: img })
        : "#e5e7eb"
    )
  );
}

/* ======================================================
   FUNCIÓN TARJETA PERSONA (MISMO PORTE)
   ====================================================== */
function personTemplate(strokeColor, roleColor) {
  return $(go.Node, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer"
    },
    $(go.Panel, "Auto",
      { desiredSize: new go.Size(170, 200) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: strokeColor,
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical",
        { margin: 12 },

        circularPhoto(64, strokeColor),

        $(go.TextBlock, {
          margin: new go.Margin(8, 6, 0, 6),
          font: "bold 13px Inter, sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2,
          overflow: go.TextBlock.Ellipsis
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(4, 6, 0, 6),
          font: "12px Inter, sans-serif",
          stroke: roleColor,
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2,
          overflow: go.TextBlock.Ellipsis
        }, new go.Binding("text", "role"))
      )
    )
  );
}

/* ======================================================
   NODE TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader",
  personTemplate("#2563eb", "#2563eb")
);

diagram.nodeTemplateMap.add("Worker",
  personTemplate("#e5e7eb", "#475569")
);

// fallback
diagram.nodeTemplate = personTemplate("#e5e7eb", "#475569");

/* ======================================================
   GROUP = SUPERVISOR
   ====================================================== */
diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer",
      ungroupable: false,

      layout: $(go.GridLayout, {
        wrappingColumn: 2,
        spacing: new go.Size(22, 22)
      }),

      isSubGraphExpanded: false,
      click: (e, g) => g.isSubGraphExpanded = !g.isSubGraphExpanded
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    $(go.Panel, "Auto",
      { desiredSize: new go.Size(180, 210) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#14b8a6",
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical",
        { margin: 12 },

        circularPhoto(64, "#14b8a6"),

        $(go.TextBlock, {
          margin: new go.Margin(8, 6, 0, 6),
          font: "bold 13px Inter, sans-serif",
          textAlign: "center",
          maxLines: 2,
          overflow: go.TextBlock.Ellipsis
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(4, 6, 0, 6),
          font: "12px Inter, sans-serif",
          stroke: "#0f766e",
          textAlign: "center",
          maxLines: 2,
          overflow: go.TextBlock.Ellipsis
        }, new go.Binding("text", "role"))
      )
    ),

    $(go.Placeholder, { padding: 16 })
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
  complete: res => buildModel(res.data)
});

/* ======================================================
   MODELO
   ====================================================== */
function buildModel(rows) {

  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p.__id = "P_" + i);

  const nodes = [];
  const links = [];

  nodes.push({
    key: "ROOT",
    name: "EMR TEAM",
    role: "",
    image: "",
    category: "Leader"
  });

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
