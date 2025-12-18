const $ = go.GraphObject.make;

/* ======================================================
   DIAGRAMA
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,

  allowMove: false,
  allowCopy: false,
  allowZoom: true,
  allowHorizontalScroll: true,
  allowVerticalScroll: true,

  autoScale: go.Diagram.None,
  initialScale: 1,
  minScale: 0.4,
  maxScale: 1.5,
  mouseWheelBehavior: go.Diagram.Zoom,

  "undoManager.isEnabled": false,

  // 🔑 LAYOUT FINAL CORRECTO
  layout: $(go.TreeLayout, {
    angle: 90, // árbol hacia abajo
    arrangement: go.TreeLayout.ArrangementHorizontal, // SUPERVISORES HORIZONTALES
    treeStyle: go.TreeLayout.StyleLastParents, // TRABAJADORES VERTICALES
    nodeSpacing: 30,
    layerSpacing: 40
  })
});

/* ======================================================
   TEMPLATE DE NODO
   ====================================================== */
diagram.nodeTemplate =
  $(go.Node, "Vertical",
    {
      cursor: "pointer",
      click: (e, node) => {
        if (node.findTreeChildrenNodes().count > 0) {
          node.isTreeExpanded = !node.isTreeExpanded;
        }
      }
    },
    new go.Binding("isTreeExpanded").makeTwoWay(),

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
    )
  );

/* ======================================================
   LINKS
   ====================================================== */
diagram.linkTemplate =
  $(go.Link,
    { routing: go.Link.Orthogonal, corner: 6 },
    $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
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

  const people = rows.filter(r => r["Email (required)"]);

  const children = {};
  people.forEach(p => {
    const sup = (p["SupervisorEmail (required)"] || "").trim();
    if (!children[sup]) children[sup] = [];
    children[sup].push(p);
  });

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) {
    alert("No se pudo detectar Team Leader");
    return;
  }

  const nodes = [];

  // ROOT
  nodes.push({
    key: "ROOT",
    name: "EMR TEAM",
    isTreeExpanded: true
  });

  // TEAM LEADER → EXPANDIDO
  nodes.push({
    key: leader["Email (required)"],
    parent: "ROOT",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || "",
    isTreeExpanded: true
  });

  // SUPERVISORES → VISIBLES, PERSONAL OCULTO
  (children[leader["Email (required)"]] || []).forEach(s => {

    nodes.push({
      key: s["Email (required)"],
      parent: leader["Email (required)"],
      name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
      role: s.Position || "",
      image: s.ImageURL || "",
      isTreeExpanded: false
    });

    // PERSONAL (vertical bajo cada supervisor)
    (children[s["Email (required)"]] || []).forEach(p => {
      nodes.push({
        key: p["Email (required)"],
        parent: s["Email (required)"],
        name: `${p["First name (required)"]} ${p["Last name (required)"]}`,
        role: p.Position || "",
        image: p.ImageURL || ""
      });
    });
  });

  diagram.model = new go.TreeModel(nodes);
}
