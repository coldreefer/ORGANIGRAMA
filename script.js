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
   LINK (SIN FLECHAS)
   ====================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
);

/* ======================================================
   FOTO CUADRADA
   ====================================================== */
function photo() {
  return $(go.Picture, {
    width: 40,
    height: 40,
    margin: new go.Margin(0, 8, 0, 0),
    imageStretch: go.GraphObject.UniformToFill
  }, new go.Binding("source", "image"));
}

/* ======================================================
   CARD BASE
   ====================================================== */
function card(stroke, withPhoto, showCount) {
  return $(
    go.Panel, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke,
      strokeWidth: 2
    }),
    $(
      go.Panel, "Horizontal",
      { margin: 10 },
      withPhoto ? photo() : $(go.Panel),
      $(
        go.Panel, "Vertical",
        $(go.TextBlock, { font: "bold 13px sans-serif" },
          new go.Binding("text", "name")),
        $(go.TextBlock, { font: "11px sans-serif", stroke: "#475569" },
          new go.Binding("text", "role")),
        showCount
          ? $(go.TextBlock, {
              font: "10px sans-serif",
              stroke: "#64748b",
              margin: new go.Margin(6, 0, 0, 0)
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
  $(go.Node, "Auto", card("#2563eb", true, true))
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
      card("#14b8a6", true, true)
    ),
    $(go.Placeholder, { padding: 14 })
  )
);

diagram.nodeTemplateMap.add("Worker",
  $(go.Node, "Auto", card("#e5e7eb", true, false))
);

/* ======================================================
   VENDOR TEMPLATES (SIN FOTO)
   ====================================================== */
diagram.groupTemplateMap.add("VendorDept",
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: false,
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 14,
        layerSpacing: 22
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
      card("#7c3aed", false, true)
    ),
    $(go.Placeholder, { padding: 12 })
  )
);

diagram.nodeTemplateMap.add("VendorPerson",
  $(go.Node, "Auto", card("#e5e7eb", false, false))
);

/* ======================================================
   BUILD TEAM (MODELO A)
   ====================================================== */
function buildTeam(rows) {
  const nodes = [];
  const links = [];

  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p.id = "T_" + i);

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: leader.id,
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
        key: s.id,
        isGroup: true,
        category: "Supervisor",
        name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
        role: s.Position || "",
        image: s.Image || "",
        count: workers.length
      });

      links.push({ from: leader.id, to: s.id });

      workers.forEach(w => {
        nodes.push({
          key: w.id,
          category: "Worker",
          group: s.id,
          name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
          role: w.Position || "",
          image: w.Image || ""
        });
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, {
    angle: 90,
    layerSpacing: 90
  });
}

/* ======================================================
   BUILD VENDORS (MODELO B)
   ====================================================== */
function buildVendors(rows) {
  const nodes = [];
  const links = [];

  const root = "VENDORS";
  nodes.push({
    key: root,
    category: "VendorDept",
    name: "Vendors",
    count: rows.length,
    isGroup: true
  });

  const depts = {};
  rows.forEach(v => {
    if (!depts[v.Department]) depts[v.Department] = [];
    depts[v.Department].push(v);
  });

  Object.entries(depts).forEach(([dept, list], i) => {
    const dk = `D_${i}`;
    nodes.push({
      key: dk,
      isGroup: true,
      category: "VendorDept",
      name: dept,
      count: list.length
    });
    links.push({ from: root, to: dk });

    list.forEach((v, j) => {
      nodes.push({
        key: `${dk}_${j}`,
        category: "VendorPerson",
        group: dk,
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`,
        role: v.Position || ""
      });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, {
    angle: 0,
    layerSpacing: 120
  });
}

/* ======================================================
   LOAD + BOTONES
   ====================================================== */
let TEAM_DATA = [];
let VENDOR_DATA = [];

Papa.parse("team.csv", {
  download: true,
  header: true,
  complete: r => TEAM_DATA = r.data
});

Papa.parse("vendors.csv", {
  download: true,
  header: true,
  complete: r => VENDOR_DATA = r.data
});

document.getElementById("btnTeams")?.addEventListener("click", () => {
  buildTeam(TEAM_DATA);
});

document.getElementById("btnVendorsDept")?.addEventListener("click", () => {
  buildVendors(VENDOR_DATA);
});
