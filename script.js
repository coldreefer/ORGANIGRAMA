const $ = go.GraphObject.make;

/* ======================================================
   CONFIG GENERAL
   ====================================================== */
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#ffffff"/>
    <circle cx="50" cy="50" r="46" fill="#f1f5f9"/>
    <circle cx="50" cy="42" r="16" fill="#9ca3af"/>
    <path d="M22 88c4-20 52-20 56 0" fill="#9ca3af"/>
  </svg>
`);

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
   LINKS LIMPIOS (SIN FLECHAS)
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
    margin: new go.Margin(0, 10, 0, 0),
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
      { margin: 12 },
      withPhoto ? photo() : $(go.Panel),
      $(
        go.Panel, "Vertical",
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
   VENDOR TEMPLATES (GROUP + ANIMACIÓN)
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

/* ======================================================
   BUILD TEAM
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
    image: leader.Image || DEFAULT_AVATAR,
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
        image: s.Image || DEFAULT_AVATAR,
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
          image: w.Image || DEFAULT_AVATAR
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
   BUILD VENDORS (HORIZONTAL + EXPAND)
   ====================================================== */
function buildVendors(rows) {
  const nodes = [];
  const links = [];

  nodes.push({
    key: "VENDORS",
    isGroup: true,
    category: "VendorDept",
    name: "Vendors",
    count: rows.length
  });

  const depts = {};
  rows.forEach(v => {
    if (!v.Department) return; // ❌ no inventamos áreas
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
    links.push({ from: "VENDORS", to: dk });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, {
    angle: 0,               // 👈 HORIZONTAL REAL
    nodeSpacing: 40,
    layerSpacing: 120
  });
}

/* ======================================================
   LOAD CSV + BOTONES
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
