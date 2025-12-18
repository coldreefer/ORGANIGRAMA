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
  initialScale: 1,

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
   TEMPLATE BASE PERSONA
   ====================================================== */
const baseNodeTemplate =
  $(go.Node, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer"
    },
    $(go.Panel, "Auto",
      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#e5e7eb",
        strokeWidth: 1
      }),
      $(go.Panel, "Vertical",
        { margin: 10 },

        $(go.Picture, {
          width: 52,
          height: 52,
          margin: new go.Margin(0, 0, 6, 0),
          background: "#cbd5e1"
        }, new go.Binding("source", "image")),

        $(go.TextBlock, {
          font: "bold 12px sans-serif",
          stroke: "#0f172a",
          textAlign: "center"
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          font: "11px sans-serif",
          stroke: "#475569",
          textAlign: "center"
        }, new go.Binding("text", "role"))
      )
    )
  );

diagram.nodeTemplate = baseNodeTemplate;

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
        spacing: new go.Size(20, 20)
      }),

      isSubGraphExpanded: false,

      click: (e, group) => {
        group.isSubGraphExpanded = !group.isSubGraphExpanded;
      }
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    $(go.Panel, "Auto",
      $(go.Shape, "RoundedRectangle", {
        fill: "#ffffff",
        stroke: "#94a3b8",
        strokeWidth: 1.2
      }),
      $(go.Panel, "Vertical",
        { margin: 10 },

        $(go.Picture, {
          width: 52,
          height: 52,
          margin: new go.Margin(0, 0, 6, 0),
          background: "#cbd5e1"
        }, new go.Binding("source", "image")),

        $(go.TextBlock, {
          font: "bold 13px sans-serif",
          stroke: "#0f172a",
          textAlign: "center"
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          font: "12px sans-serif",
          stroke: "#475569",
          textAlign: "center"
        }, new go.Binding("text", "role"))
      )
    ),

    $(go.Placeholder, { padding: 12 })
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
   CARGA CSV
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => buildModel(res.data)
});

/* ======================================================
   CONSTRUCCIÓN DEL MODELO (ROBUSTA)
   ====================================================== */
function buildModel(rows) {

  const people = rows.filter(r => r["First name (required)"]);

  const nodes = [];
  const links = [];

  const idByEmail = {};
  people.forEach((p, i) => {
    p.__id = "P_" + i;
    if (p["Email (required)"]) {
      idByEmail[p["Email (required)"]] = p.__id;
    }
  });

  // ROOT
  nodes.push({
    key: "ROOT",
    name: "EMR TEAM",
    role: "",
    image: ""
  });

  // Team Leader = sin supervisor
  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) {
    alert("No se pudo detectar Team Leader");
    return;
  }

  nodes.push({
    key: leader.__id,
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || ""
  });

  links.push({ from: "ROOT", to: leader.__id });

  // Supervisores
  people.forEach(p => {
    if (p["SupervisorEmail (required)"] === leader["Email (required)"]) {

      nodes.push({
        key: p.__id,
        isGroup: true,
        name: `${p["First name (required)"]} ${p["Last name (required)"]}`,
        role: p.Position || "",
        image: p.ImageURL || ""
      });

      links.push({ from: leader.__id, to: p.__id });

      // Trabajadores
      people.forEach(w => {
        if (w["SupervisorEmail (required)"] === p["Email (required)"]) {
          nodes.push({
            key: w.__id,
            group: p.__id,
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
