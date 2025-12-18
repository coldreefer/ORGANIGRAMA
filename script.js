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
   TEMPLATE BASE
   ====================================================== */
function personTemplate(stroke, roleColor) {
  return $(go.Node, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer"
    },
    $(go.Panel, "Auto",
      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke,
        strokeWidth: 2
      }),
      $(go.Panel, "Vertical",
        { margin: 12 },

        $(go.Picture, {
          width: 56,
          height: 56,
          imageStretch: go.GraphObject.UniformToFill,
          background: "#e5e7eb"
        }, new go.Binding("source", "image")),

        $(go.TextBlock, {
          font: "bold 13px Inter, sans-serif",
          stroke: "#0f172a",
          textAlign: "center",
          margin: new go.Margin(6, 0, 0, 0)
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          font: "12px Inter, sans-serif",
          stroke: roleColor,
          textAlign: "center"
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

// Default (fallback)
diagram.nodeTemplate = personTemplate("#e5e7eb", "#475569");

/* ======================================================
   GROUP TEMPLATE = SUPERVISOR
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
      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#14b8a6",
        strokeWidth: 2
      }),
      $(go.Panel, "Vertical",
        { margin: 12 },

        $(go.Picture, {
          width: 56,
          height: 56,
          imageStretch: go.GraphObject.UniformToFill,
          background: "#e5e7eb"
        }, new go.Binding("source", "image")),

        $(go.TextBlock, {
          font: "bold 13px Inter, sans-serif",
          textAlign: "center"
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          font: "12px Inter, sans-serif",
          stroke: "#0f766e",
          textAlign: "center"
        }, new go.Binding("text", "role"))
      )
    ),

    $(go.Placeholder, { padding: 14 })
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

  nodes.push({ key: "ROOT", name: "EMR TEAM", role: "", image: "", category: "Leader" });

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
