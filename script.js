const $ = go.GraphObject.make;

/* ======================================================
   DIAGRAM
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.4,
  maxScale: 2.5,
  scrollMode: go.Diagram.InfiniteScroll,
  "animationManager.isEnabled": true,
  "animationManager.duration": 250,
  "undoManager.isEnabled": false
});

/* ======================================================
   LINK TEMPLATE (SIN FLECHAS)
   ====================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
);

/* ======================================================
   FOTO CUADRADA
   ====================================================== */
function photo(size = 42) {
  return $(go.Picture, {
    width: size,
    height: size,
    margin: new go.Margin(0, 8, 0, 0),
    imageStretch: go.GraphObject.UniformToFill
  }, new go.Binding("source", "image"));
}

/* ======================================================
   CARD BASE
   ====================================================== */
function personCard(stroke, showCount = true, withPhoto = true) {
  return $(
    go.Panel,
    "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke,
      strokeWidth: 2
    }),
    $(
      go.Panel,
      "Horizontal",
      { margin: 10 },
      withPhoto ? photo() : $(go.Panel),
      $(
        go.Panel,
        "Vertical",
        $(go.TextBlock, {
          font: "bold 13px sans-serif",
          stroke: "#0f172a"
        }, new go.Binding("text", "name")),
        $(go.TextBlock, {
          font: "11px sans-serif",
          stroke: "#475569"
        }, new go.Binding("text", "role")),
        showCount
          ? $(go.TextBlock, {
              margin: new go.Margin(6, 0, 0, 0),
              font: "10px sans-serif",
              stroke: "#64748b"
            }, new go.Binding("text", "count", c => `👤 ${c}`))
          : $(go.Panel)
      )
    )
  );
}

/* ======================================================
   TEAM TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader",
  $(go.Node, "Auto", personCard("#2563eb", true, true))
);

diagram.groupTemplateMap.add("Supervisor",
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: false,
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 20,
        layerSpacing: 30
      })
    },
    $(go.Panel, "Auto",
      {
        cursor: "pointer",
        click: (e, p) => {
          diagram.startTransaction("toggle");
          p.part.isSubGraphExpanded = !p.part.isSubGraphExpanded;
          diagram.commitTransaction("toggle");
        }
      },
      personCard("#14b8a6", true, true)
    ),
    $(go.Placeholder, { padding: 14 })
  )
);

diagram.nodeTemplateMap.add("Worker",
  $(go.Node, "Auto", personCard("#e5e7eb", false, true))
);

/* ======================================================
   VENDORS TEMPLATES (SIN IMÁGENES)
   ====================================================== */
diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group, "Auto",
    {
      layout: $(go.TreeLayout, {
        angle: 0,
        nodeSpacing: 40,
        layerSpacing: 90
      })
    },
    $(go.Placeholder, { padding: 20 })
  )
);

diagram.groupTemplateMap.add("VendorDept",
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: false,
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 16,
        layerSpacing: 24
      })
    },
    $(go.Panel, "Auto",
      {
        cursor: "pointer",
        click: (e, p) => {
          diagram.startTransaction("toggleVendor");
          p.part.isSubGraphExpanded = !p.part.isSubGraphExpanded;
          diagram.commitTransaction("toggleVendor");
        }
      },
      personCard("#7c3aed", true, false)
    ),
    $(go.Placeholder, { padding: 12 })
  )
);

diagram.nodeTemplateMap.add("VendorPerson",
  $(go.Node, "Auto", personCard("#e5e7eb", false, false))
);

/* ======================================================
   BUILD TEAM
   ====================================================== */
function buildTeam(rows) {
  const nodes = [];
  const links = [];

  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p._id = "T_" + i);

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: leader._id,
    category: "Leader",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.Image || "",
    count: people.length - 1
  });

  people.forEach(s => {
    if (s["SupervisorEmail (required)"] === leader["Email (required)"]) {
      const workers = people.filter(w => w["SupervisorEmail (required)"] === s["Email (required)"]);

      nodes.push({
        key: s._id,
        isGroup: true,
        category: "Supervisor",
        name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
        role: s.Position || "",
        image: s.Image || "",
        count: workers.length
      });

      links.push({ from: leader._id, to: s._id });

      workers.forEach(w => {
        nodes.push({
          key: w._id,
          category: "Worker",
          group: s._id,
          name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
          role: w.Position || "",
          image: w.Image || ""
        });
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 90 });
}

/* ======================================================
   BUILD VENDORS
   ====================================================== */
function buildVendors(rows) {
  const model = diagram.model;

  model.addNodeData({
    key: "VENDORS_ROOT",
    isGroup: true,
    category: "VendorRoot",
    name: "Vendors",
    count: rows.length
  });

  const depts = {};
  rows.forEach(v => {
    if (!depts[v.Department]) depts[v.Department] = [];
    depts[v.Department].push(v);
  });

  Object.entries(depts).forEach(([dept, list], i) => {
    const dk = "VD_" + i;

    model.addNodeData({
      key: dk,
      isGroup: true,
      group: "VENDORS_ROOT",
      category: "VendorDept",
      name: dept,
      count: list.length
    });

    model.addLinkData({ from: "VENDORS_ROOT", to: dk });

    list.forEach((v, j) => {
      model.addNodeData({
        key: `${dk}_${j}`,
        group: dk,
        category: "VendorPerson",
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`,
        role: v.Position || ""
      });
    });
  });
}

/* ======================================================
   LOAD CSV
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  complete: r => {
    buildTeam(r.data);
    Papa.parse("vendors.csv", {
      download: true,
      header: true,
      complete: v => buildVendors(v.data)
    });
  }
});
