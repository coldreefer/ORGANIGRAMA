/* ======================================================
   1. CONSTANTES Y CONFIG
   ====================================================== */
const $ = go.GraphObject.make;

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
   2. DIAGRAM
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,
  allowSelect: false,

  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.35,
  maxScale: 2.5,
  allowHorizontalScroll: true,
  allowVerticalScroll: true,
  scrollMode: go.Diagram.InfiniteScroll,

  "animationManager.isEnabled": true,
  "animationManager.duration": 300,
  "undoManager.isEnabled": false
});

/* ======================================================
   3. HELPERS
   ====================================================== */
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function goToNodeByKey(key) {
  const node = diagram.findNodeForKey(key);
  if (node) diagram.centerRect(node.actualBounds);
}

function showOnlyRoot(rootKey) {
  diagram.startTransaction("view");

  diagram.nodes.each(n => {
    let visible = false;

    if (n.key === rootKey) visible = true;
    else if (n.data.group === rootKey) visible = true;
    else if (n.containingGroup && n.containingGroup.key === rootKey) visible = true;

    n.visible = visible;
  });

  diagram.links.each(l => {
    const from = l.fromNode;
    const to = l.toNode;
    l.visible = from?.visible && to?.visible;
  });

  diagram.commitTransaction("view");

  setTimeout(() => goToNodeByKey(rootKey), 80);
}


/* ======================================================
   4. TEMPLATES PERSONAS (TEAM)
   ====================================================== */
function photo(size, strokeColor) {
  return $(go.Panel, "Auto",
    { width: size, height: size },
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: strokeColor,
      strokeWidth: 2,
      parameter1: 6
    }),
    $(go.Picture, {
      width: size - 6,
      height: size - 6,
      margin: 3,
      imageStretch: go.GraphObject.UniformToFill
    }, new go.Binding("source", "image"))
  );
}

function personCard(border, roleColor, photoBorder) {
  return $(go.Node, "Vertical",
    $(go.Panel, "Auto",
      { desiredSize: new go.Size(210, 265) },
      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: border,
        strokeWidth: 2
      }),
      $(go.Panel, "Vertical", { margin: 12 },
        photo(64, photoBorder),
        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 12.5px sans-serif",
          textAlign: "center"
        }, new go.Binding("text", "name")),
        $(go.TextBlock, {
          font: "11.5px sans-serif",
          stroke: roleColor,
          textAlign: "center"
        }, new go.Binding("text", "role"))
      )
    )
  );
}

diagram.nodeTemplateMap.add("Leader", personCard("#2563eb", "#2563eb", "#2563eb"));
diagram.nodeTemplateMap.add("Worker", personCard("#e5e7eb", "#475569", "#94a3b8"));

/* ======================================================
   5. TEMPLATES VENDORS
   ====================================================== */
diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group, "Auto",
    {
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 30,
        layerSpacing: 40
      })
    },
    $(go.Placeholder, { padding: 20 })
  )
);

diagram.nodeTemplateMap.add("VendorDept",
  $(go.Node, "Auto",
    {
      isTreeExpanded: false,
      cursor: "pointer",
      click: (e, n) => {
        diagram.startTransaction("toggleDept");
        n.isTreeExpanded = !n.isTreeExpanded;
        diagram.commitTransaction("toggleDept");
      }
    },
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: "#7c3aed",
      strokeWidth: 2
    }),
    $(go.Panel, "Vertical", { margin: 10 },
      $(go.TextBlock, {
        font: "bold 13px sans-serif",
        textAlign: "center"
      }, new go.Binding("text", "name")),
      $(go.TextBlock, {
        font: "10px sans-serif",
        stroke: "#64748b"
      }, new go.Binding("text", "count", c => `${c} vendors`))
    )
  )
);

diagram.nodeTemplateMap.add("VendorCompany",
  $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: "#e5e7eb",
      strokeWidth: 1.5
    }),
    $(go.Panel, "Vertical", { margin: 8 },
      $(go.TextBlock, { font: "bold 12px sans-serif" },
        new go.Binding("text", "name")),
      $(go.TextBlock, {
        font: "10px sans-serif",
        stroke: "#64748b"
      }, new go.Binding("text", "info"))
    )
  )
);

/* ======================================================
   6. BUILD TEAM
   ====================================================== */
function buildTeam(rows) {
  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p.__id = "T_" + i);

  const nodes = [];
  const links = [];

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({ key: "EMR_ROOT", isGroup: true, category: "EMR_ROOT" });

  nodes.push({
    key: leader.__id,
    category: "Leader",
    group: "EMR_ROOT",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || ""
  });

  const leaderEmail = leader["Email (required)"];

  people.forEach(s => {
    if (s["SupervisorEmail (required)"] === leaderEmail) {
      nodes.push({
        key: s.__id,
        isGroup: true,
        group: "EMR_ROOT",
        name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
        role: s.Position || ""
      });
      links.push({ from: leader.__id, to: s.__id });

      people
        .filter(w => w["SupervisorEmail (required)"] === s["Email (required)"])
        .forEach(w => {
          nodes.push({
            key: w.__id,
            category: "Worker",
            group: s.__id,
            name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
            role: w.Position || ""
          });
        });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
}

/* ======================================================
   7. BUILD VENDORS
   ====================================================== */
function buildVendors(rows) {
  const model = diagram.model;
  if (!model) return;

  model.addNodeData({
    key: "VENDORS_ROOT",
    isGroup: true,
    category: "VendorRoot"
  });

  const depts = {};

  rows.forEach(v => {
    if (!depts[v.Department]) depts[v.Department] = [];
    depts[v.Department].push(v);
  });

  Object.entries(depts).forEach(([dept, list], i) => {
    const deptKey = `V_DEPT_${i}`;
    model.addNodeData({
      key: deptKey,
      category: "VendorDept",
      name: dept,
      count: list.length
    });
    model.addLinkData({ from: "VENDORS_ROOT", to: deptKey });

    list.forEach((v, j) => {
      model.addNodeData({
        key: `${deptKey}_C_${j}`,
        category: "VendorCompany",
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`,
        info: v.Position || ""
      });
      model.addLinkData({ from: deptKey, to: `${deptKey}_C_${j}` });
    });
  });
}

/* ======================================================
   8. LOAD CSV
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: r => {
    buildTeam(r.data);
    Papa.parse("vendors.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: v => {
        buildVendors(v.data);
        showOnlyRoot("EMR_ROOT");
      }
    });
  }
});

/* ======================================================
   9. CONTROLES
   ====================================================== */
document.getElementById("btnTeams")?.addEventListener("click", () => {
  showOnlyRoot("EMR_ROOT");
});

document.getElementById("btnVendorsDept")?.addEventListener("click", () => {
  showOnlyRoot("VENDORS_ROOT");
});

document.getElementById("btnZoomIn")?.addEventListener("click", () => {
  diagram.scale = clamp(diagram.scale * 1.12, diagram.minScale, diagram.maxScale);
});

document.getElementById("btnZoomOut")?.addEventListener("click", () => {
  diagram.scale = clamp(diagram.scale / 1.12, diagram.minScale, diagram.maxScale);
});

document.getElementById("btnFit")?.addEventListener("click", () => {
  diagram.zoomToFit();
});
document.getElementById("btnFull")?.addEventListener("click", () => {
  const el = document.documentElement;

  if (!document.fullscreenElement) {
    el.requestFullscreen().catch(err => {
      console.error("Error fullscreen:", err);
    });
  } else {
    document.exitFullscreen();
  }

  setTimeout(() => diagram.zoomToFit(), 300);
});
