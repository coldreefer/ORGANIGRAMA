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

  // Árbol SOLO para Leader → Supervisores
  layout: $(go.TreeLayout, {
    angle: 90,
    arrangement: go.TreeLayout.ArrangementHorizontal,
    nodeSpacing: 40,
    layerSpacing: 50
  })
});

/* ======================================================
   TEMPLATE PERSONA (NODO NORMAL)
   ====================================================== */
diagram.nodeTemplate =
  $(go.Node, "Vertical",
    {
      selectable: false
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

/* ======================================================
   TEMPLATE SUPERVISOR = GROUP
   ====================================================== */
diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
      cursor: "pointer",
      ungroupable: false,

      // 🔑 Grid para trabajadores
      layout: $(go.GridLayout, {
        wrappingColumn: 2,                 // 👈 2 personas por fila
        spacing: new go.Size(20, 20),
        alignment: go.GridLayout.Position
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

    // Aquí se dibujan los trabajadores al expandir
    $(go.Placeholder, { padding: 12 })
  );

/* ======================================================
   LINKS (Leader → Supervisores)
   ====================================================== */
diagram.linkTemplate =
  $(go.Link,
    { routing: go.Link.Orthogonal, corner: 6 },
    $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
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
   MODELO DESDE CSV
   ====================================================== */
function buildModel(rows) {

  const people = rows.filter(r => r["Email (required)"]);

  // Mapa supervisor → personal
  const children = {};
  people.forEach(p => {
    const sup = (p["SupervisorEmail (required)"] || "").trim();
    if (!children[sup]) children[sup] = [];
    children[sup].push(p);
  });

  // Team Leader = sin supervisor
  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) {
    alert("No se pudo detectar Team Leader");
    return;
  }

  const nodes = [];
  const links = [];

  // ROOT
  nodes.push({
    key: "ROOT",
    name: "EMR TEAM",
    role: "",
    image: "",
  });

  // TEAM LEADER
  nodes.push({
    key: leader["Email (required)"],
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || ""
  });
  links.push({ from: "ROOT", to: leader["Email (required)"] });

  // SUPERVISORES = GROUPS (HORIZONTALES)
  (children[leader["Email (required)"]] || []).forEach(s => {

    nodes.push({
      key: s["Email (required)"],
      isGroup: true,
      name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
      role: s.Position || "",
      image: s.ImageURL || ""
    });

    links.push({
      from: leader["Email (required)"],
      to: s["Email (required)"]
    });

    // TRABAJADORES (DENTRO DEL GROUP)
    (children[s["Email (required)"]] || []).forEach(p => {
      nodes.push({
        key: p["Email (required)"],
        group: s["Email (required)"],
        name: `${p["First name (required)"]} ${p["Last name (required)"]}`,
        role: p.Position || "",
        image: p.ImageURL || ""
      });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
}
