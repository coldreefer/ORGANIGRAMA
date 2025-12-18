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
   TEMPLATE BASE
   ====================================================== */
const baseNodeTemplate =
  $(go.Node, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer",
      cssClass: "go-node"
    },
    $(go.Panel, "Auto",
      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#e5e7eb",
        strokeWidth: 1
      }),
      $(go.Panel, "Vertical",
        { margin: 12 },

        $(go.Picture, {
          width: 56,
          height: 56
        }, new go.Binding("source", "image")),

        $(go.TextBlock, {
          font: "bold 13px Inter, sans-serif",
          stroke: "#0f172a",
          textAlign: "center",
          margin: new go.Margin(6, 0, 0, 0)
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          font: "12px Inter, sans-serif",
          stroke: "#475569",
          textAlign: "center"
        }, new go.Binding("text", "role"))
      )
    )
  );

diagram.nodeTemplate = baseNodeTemplate;

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
      cssClass: "go-node go-supervisor",

      layout: $(go.GridLayout, {
        wrappingColumn: 2,
        spacing: new go.Size(22, 22)
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
        stroke: "#14b8a6",
        strokeWidth: 2
      }),
      $(go.Panel, "Vertical",
        { margin: 12 },

        $(go.Picture, {
          width: 56,
          height: 56
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
   MODELO ROBUSTO
   ====================================================== */
function buildModel(rows) {

  const people = rows.filter(r => r["First name (required)"]);

  const nodes = [];
  const links = [];

  people.forEach((p, i) => p.__id = "P_" + i);

  nodes.push({ key: "ROOT", name: "EMR TEAM", role: "", image: "" });

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: leader.__id,
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || "",
    cssClass: "go-node go-leader"
  });

  links.push({ from: "ROOT", to: leader.__id });

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

      people.forEach(w => {
        if (w["SupervisorEmail (required)"] === p["Email (required)"]) {
          nodes.push({
            key: w.__id,
            group: p.__id,
            name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
            role: w.Position || "",
            image: w.ImageURL || "",
            cssClass: "go-node go-worker"
          });
        }
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
}
