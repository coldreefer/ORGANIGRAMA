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
   CATEGORÍAS
   ====================================================== */
diagram.nodeTemplateMap.add("Leader",
  baseNodeTemplate.copy().add(
    new go.Binding("cssClass", "", () => "go-node go-leader")
  )
);

diagram.nodeTemplateMap.add("Worker",
  baseNodeTemplate.copy().add(
    new go.Binding("cssClass", "", () => "go-node go-worker")
  )
);

/* ======================================================
   GROUP TEMPLATE = SUPERVISOR
   ====================================================== */
diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
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
    new go.Binding("cssClass", "", () => "go-node go-supervisor"),

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
   CONSTRUCCIÓN MODELO (ROBUSTA)
   ====================================================== */
function buildModel(rows) {

  const people = rows.filter(r => r["First name (required)"]);

  const keyMap = {};
  const getKey = (row, idx) => {
    const k = row["Email (required)"];
    if (k && !keyMap[k]) {
      keyMap[k] = true;
      return k;
    }
    return "AUTO_" + idx;
  };

  const children = {};
  people.forEach((p, i) => {
    const sup = (p["SupervisorEmail (required)"] || "").trim();
    if (!children[sup]) children[sup] = [];
    children[sup].push({ row: p, idx: i });
  });

  const leaderEntry = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leaderEntry) {
    alert("No se pudo detectar Team Leader");
    return;
  }

  const nodes = [];
  const links = [];

  nodes.push({
    key: "ROOT",
    name: "EMR TEAM",
    role: "",
    image: "",
    category: "Leader"
  });

  const leaderKey = getKey(leaderEntry, 0);

  nodes.push({
    key: leaderKey,
    name: `${leaderEntry["First name (required)"]} ${leaderEntry["Last name (required)"]}`,
    role: leaderEntry.Position || "",
    image: leaderEntry.ImageURL || "",
    category: "Leader"
  });

  links.push({ from: "ROOT", to: leaderKey });

  (children[leaderEntry["Email (required)"]] || []).forEach(({ row: s, idx }) => {
    const supKey = getKey(s, idx);

    nodes.push({
      key: supKey,
      isGroup: true,
      name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
      role: s.Position || "",
      image: s.ImageURL || ""
    });

    links.push({ from: leaderKey, to: supKey });

    (children[s["Email (required)"]] || []).forEach(({ row: p, idx }) => {
      nodes.push({
        key: getKey(p, idx),
        group: supKey,
        name: `${p["First name (required)"]} ${p["Last name (required)"]}`,
        role: p.Position || "",
        image: p.ImageURL || "",
        category: "Worker"
      });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
}
