const $V = go.GraphObject.make;

const vendorsDiagram = $V(go.Diagram, "vendorsDiv", {
  initialContentAlignment: go.Spot.Top,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,

  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.6,
  maxScale: 2,

  layout: $V(go.TreeLayout, {
    angle: 90,
    nodeSpacing: 30,
    layerSpacing: 60
  }),

  "animationManager.isEnabled": true,
  "animationManager.duration": 260
});

/* ROOT */
vendorsDiagram.nodeTemplateMap.add("Root",
  $V(go.Node, "Auto",
    $V(go.Shape, "RoundedRectangle", {
      fill: "#ffffff",
      stroke: "#cbd5e1",
      strokeWidth: 2
    }),
    $V(go.TextBlock, {
      margin: 14,
      font: "bold 14px sans-serif",
      stroke: "#0f172a"
    }, new go.Binding("text", "name"))
  )
);

/* DEPARTMENT */
vendorsDiagram.nodeTemplateMap.add("Department",
  $V(go.Node, "Auto",
    {
      isActionable: true,
      cursor: "pointer",
      click: (e, node) => {
        vendorsDiagram.startTransaction("toggle");
        node.isTreeExpanded = !node.isTreeExpanded;
        vendorsDiagram.commitTransaction("toggle");
      }
    },
    $V(go.Shape, "RoundedRectangle", {
      fill: "#f8fafc",
      stroke: "#94a3b8",
      strokeWidth: 2
    }),
    $V(go.Panel, "Vertical", { margin: 12 },

      $V(go.TextBlock, {
        font: "bold 13px sans-serif",
        stroke: "#0f172a",
        textAlign: "center"
      }, new go.Binding("text", "name")),

      $V(go.TextBlock, {
        margin: new go.Margin(6,0,0,0),
        font: "10px sans-serif",
        stroke: "#475569"
      }, new go.Binding("text", "count", n => `${n} proveedores`)),

      $V(go.TextBlock, {
        margin: new go.Margin(6,0,0,0),
        font: "10px sans-serif",
        stroke: "#64748b"
      }, new go.Binding("text", "isTreeExpanded",
        e => e ? "▲ Ocultar" : "▼ Ver"
      ).ofObject())
    )
  )
);

/* COMPANY */
vendorsDiagram.nodeTemplateMap.add("Company",
  $V(go.Node, "Auto",
    $V(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: "#e5e7eb",
      strokeWidth: 1.5
    }),
    $V(go.Panel, "Vertical", { margin: 10 },
      $V(go.TextBlock, {
        font: "bold 12px sans-serif",
        textAlign: "center"
      }, new go.Binding("text", "name")),
      $V(go.TextBlock, {
        margin: new go.Margin(4,0,0,0),
        font: "10px sans-serif",
        stroke: "#64748b",
        textAlign: "center"
      }, new go.Binding("text", "info"))
    )
  )
);

/* LINKS */
vendorsDiagram.linkTemplate =
  $V(go.Link,
    { routing: go.Link.Orthogonal, corner: 8 },
    $V(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.4 })
  );

/* LOAD CSV */
Papa.parse("vendors.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => buildVendors(res.data)
});

/* BUILD */
function buildVendors(rows) {
  const nodes = [];

  nodes.push({
    key: "VENDORS",
    category: "Root",
    name: "Vendors",
    isTreeExpanded: true
  });

  const departments = {};

  rows.forEach(v => {
    if (!departments[v.Department]) departments[v.Department] = [];
    departments[v.Department].push(v);
  });

  Object.entries(departments).forEach(([dept, list]) => {
    nodes.push({
      key: dept,
      parent: "VENDORS",
      category: "Department",
      name: dept,
      count: list.length,
      isTreeExpanded: true
    });

    list.forEach((c, i) => {
      nodes.push({
        key: `${dept}_${i}`,
        parent: dept,
        category: "Company",
        name: `${c["First name (required)"]} ${c["Last name (required)"]}`.trim(),
        info: c.Position || ""
      });
    });
  });

  vendorsDiagram.model = new go.TreeModel(nodes);
  setTimeout(() => vendorsDiagram.zoomToFit(), 60);
}
