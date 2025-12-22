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

/* ======================================================
   IMAGE RESOLVER (SOLO TEAMS)
   ====================================================== */
function resolveImage(row) {
  if (!row || !row.ImageURL) return DEFAULT_AVATAR;
  const url = row.ImageURL.toString().trim();
  return url || DEFAULT_AVATAR;
}

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
  "animationManager.isEnabled": true,
  "animationManager.duration": 300
});

/* ======================================================
   LINKS
   ====================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.5 })
);

/* ======================================================
   FOTO (TEAMS)
   ====================================================== */
function photo() {
  return $(
    go.Picture,
    {
      width: 42,
      height: 42,
      margin: new go.Margin(0, 10, 0, 0),
      imageStretch: go.GraphObject.UniformToFill
    },
    new go.Binding("source", "image")
  );
}

/* ======================================================
   CARD
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
        $(go.TextBlock, { font: "bold 13px sans-serif" },
          new go.Binding("text", "name")),
        $(go.TextBlock, { font: "11px sans-serif", stroke: "#475569" },
          new go.Binding("text", "role")),
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
      layout: $(go.TreeLayout, { angle: 90, nodeSpacing: 20, layerSpacing: 30 })
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
   VENDOR TEMPLATES
   ====================================================== */

// Root Vendors (cima)
diagram.nodeTemplateMap.add("VendorRoot",
  $(go.Node, "Auto",
    {
      isTreeExpanded: false,
      cursor: "pointer",
      click: (e, p) => {
        diagram.startTransaction("toggleRoot");
        p.isTreeExpanded = !p.isTreeExpanded;
        diagram.commitTransaction("toggleRoot");
      }
    },
    card("#64748b", false, true)
  )
);

// Área (Box / Inspección / Lavado / Reefer)
diagram.nodeTemplateMap.add("VendorArea",
  $(go.Node, "Auto",
    {
      isTreeExpanded: false,
      cursor: "pointer",
      click: (e, p) => {
        diagram.startTransaction("toggleArea");
        p.isTreeExpanded = !p.isTreeExpanded;
        diagram.commitTransaction("toggleArea");
      }
    },
    card("#7c3aed", false, true)
  )
);

// Vendor final (sin hijos)
diagram.nodeTemplateMap.add("VendorItem",
  $(go.Node, "Auto", card("#e5e7eb", false, false))
);

/* ======================================================
   BUILD TEAMS
   ====================================================== */
function buildTeam(rows) {
  const nodes = [];
  const links = [];

  const people = rows.filter(r => r["First name (required)"]);
  people.forEach(p => p.id = p["Email (required)"]);

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  const supervisors = people.filter(p => p["SupervisorEmail (required)"] === leader.id);

  nodes.push({
    key: leader.id,
    category: "Leader",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: resolveImage(leader),
    count: supervisors.length
  });

  supervisors.forEach(s => {
    const workers = people.filter(w => w["SupervisorEmail (required)"] === s.id);

    nodes.push({
      key: s.id,
      isGroup: true,
      category: "Supervisor",
      name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
      role: s.Position || "",
      image: resolveImage(s),
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
        image: resolveImage(w)
      });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 90 });
}

/* ======================================================
   BUILD VENDORS (HORIZONTAL + DOWNWARD)
   ====================================================== */
function buildVendors(rows) {
  const nodes = [];
  const links = [];

  // Root
  nodes.push({
    key: "VENDORS",
    category: "VendorRoot",
    name: "Vendors",
    count: rows.length
  });

  // Agrupar por área
  const byDept = {};
  rows.forEach(v => {
    if (!v.Department) return;
    if (!byDept[v.Department]) byDept[v.Department] = [];
    byDept[v.Department].push(v);
  });

  let areaIdx = 0;
  let vendorIdx = 0;

  Object.entries(byDept).forEach(([dept, vendors]) => {
    const areaKey = `AREA_${areaIdx++}`;

    nodes.push({
      key: areaKey,
      category: "VendorArea",
      name: dept,
      count: vendors.length
    });

    links.push({ from: "VENDORS", to: areaKey });

    vendors.forEach(v => {
      const vendorKey = `V_${vendorIdx++}`;

      nodes.push({
        key: vendorKey,
        category: "VendorItem",
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`.trim(),
        role: v.Position || ""
      });

      links.push({ from: areaKey, to: vendorKey });
    });
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = $(go.TreeLayout, {
    angle: 90,          // ARRIBA → ABAJO
    layerSpacing: 70,
    nodeSpacing: 30
  });
}

/* ======================================================
   LOAD CSV
   ====================================================== */
let TEAM_DATA = [];
let VENDOR_DATA = [];

Papa.parse("team.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => TEAM_DATA = r.data
});

Papa.parse("vendors.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: r => VENDOR_DATA = r.data
});

/* ======================================================
   BUTTONS
   ====================================================== */
document.getElementById("btnTeams").onclick = () => buildTeam(TEAM_DATA);
document.getElementById("btnVendorsDept").onclick = () => buildVendors(VENDOR_DATA);
