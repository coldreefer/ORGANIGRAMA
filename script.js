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
  maxScale: 2,
  "undoManager.isEnabled": false
});

/* ======================================================
   LINK TEMPLATE (SIN FLECHAS)
   ====================================================== */
diagram.linkTemplate = $(
  go.Link,
  { routing: go.Link.Orthogonal, corner: 6 },
  $(go.Shape, { stroke: "#94a3b8", strokeWidth: 1.5 })
);

/* ======================================================
   CARD BASE
   ====================================================== */
function card(stroke, showCount = true) {
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
      "Vertical",
      { margin: 10 },
      $(go.TextBlock, {
        font: "bold 13px sans-serif",
        stroke: "#0f172a",
        alignment: go.Spot.Center
      }, new go.Binding("text", "name")),
      $(go.TextBlock, {
        font: "11px sans-serif",
        stroke: "#475569",
        alignment: go.Spot.Center
      }, new go.Binding("text", "role")),
      showCount
        ? $(go.TextBlock, {
            margin: new go.Margin(6, 0, 0, 0),
            font: "10px sans-serif",
            stroke: "#64748b",
            alignment: go.Spot.Center
          }, new go.Binding("text", "count", c => `👤 ${c}`))
        : $(go.Panel)
    )
  );
}

/* ======================================================
   NODE TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader",
  $(go.Node, "Auto", card("#2563eb"))
);

diagram.nodeTemplateMap.add("Supervisor",
  $(go.Node, "Auto", card("#14b8a6"))
);

diagram.nodeTemplateMap.add("Worker",
  $(go.Node, "Auto", card("#e5e7eb", false))
);

diagram.nodeTemplateMap.add("VendorRoot",
  $(go.Node, "Auto", card("#7c3aed"))
);

diagram.nodeTemplateMap.add("VendorDept",
  $(go.Node, "Auto", card("#7c3aed"))
);

/* ======================================================
   TEAM LAYOUT (VERTICAL)
   ====================================================== */
const teamLayout = $(go.TreeLayout, {
  angle: 90,
  nodeSpacing: 30,
  layerSpacing: 90,
  alignment: go.TreeLayout.AlignmentCenterChildren
});

/* ======================================================
   VENDOR LAYOUT (HORIZONTAL)
   ====================================================== */
const vendorLayout = $(go.TreeLayout, {
  angle: 0,
  nodeSpacing: 40,
  layerSpacing: 120,
  alignment: go.TreeLayout.AlignmentCenterChildren
});

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
    count: people.length - 1
  });

  people.forEach(p => {
    if (p["SupervisorEmail (required)"] === leader["Email (required)"]) {
      const subs = people.filter(w => w["SupervisorEmail (required)"] === p["Email (required)"]);

      nodes.push({
        key: p.id,
        category: "Supervisor",
        name: `${p["First name (required)"]} ${p["Last name (required)"]}`,
        role: p.Position || "",
        count: subs.length
      });

      links.push({ from: leader.id, to: p.id });

      subs.forEach(w => {
        nodes.push({
          key: w.id,
          category: "Worker",
          name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
          role: w.Position || ""
        });
        links.push({ from: p.id, to: w.id });
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  diagram.layout = teamLayout;
}

/* ======================================================
   BUILD VENDORS
   ====================================================== */
function buildVendors(rows) {
  const model = new go.GraphLinksModel();
  const nodes = [];
  const links = [];

  nodes.push({
    key: "VENDORS",
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
    const dk = "D_" + i;

    nodes.push({
      key: dk,
      category: "VendorDept",
      name: dept,
      count: list.length
    });

    links.push({ from: "VENDORS", to: dk });
  });

  model.nodeDataArray = nodes;
  model.linkDataArray = links;

  diagram.model = model;
  diagram.layout = vendorLayout;
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
      complete: v => {
        diagram._vendorsData = v.data;
      }
    });
  }
});

/* ======================================================
   CONTROLS
   ====================================================== */
const btn = id => document.getElementById(id);

if (btn("btnTeams")) btn("btnTeams").onclick = () => buildTeam(diagram.model.nodeDataArray || []);
if (btn("btnVendorsDept")) btn("btnVendorsDept").onclick = () => buildVendors(diagram._vendorsData || []);
if (btn("btnZoomIn")) btn("btnZoomIn").onclick = () => diagram.scale *= 1.1;
if (btn("btnZoomOut")) btn("btnZoomOut").onclick = () => diagram.scale /= 1.1;
if (btn("btnFit")) btn("btnFit").onclick = () => diagram.zoomToFit();
if (btn("btnFull")) btn("btnFull").onclick = () => {
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
};
