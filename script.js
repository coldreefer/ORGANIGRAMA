/* ======================================================
   SHORTCUT
   ====================================================== */
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
  minScale: 0.35,
  maxScale: 2.5,
  scrollMode: go.Diagram.InfiniteScroll,
  "animationManager.isEnabled": true,
  "animationManager.duration": 280,
  "undoManager.isEnabled": false
});

/* ======================================================
   HELPERS
   ====================================================== */
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function goToNodeByKey(key) {
  const n = diagram.findNodeForKey(key);
  if (n) diagram.centerRect(n.actualBounds);
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
  diagram.commitTransaction("view");
  setTimeout(() => goToNodeByKey(rootKey), 80);
}

/* ======================================================
   CARD BASE (IMAGEN CUADRADA)
   ====================================================== */
function cardBase(stroke, expandable) {
  return $(go.Panel, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "white",
      stroke: stroke,
      strokeWidth: 2
    }),
    $(go.Panel, "Vertical", { margin: 10 },

      // Header
      $(go.Panel, "Horizontal",
        $(go.Picture, {
          width: 36,
          height: 36,
          margin: new go.Margin(0, 8, 0, 0),
          imageStretch: go.GraphObject.UniformToFill
        }, new go.Binding("source", "image")),

        $(go.Panel, "Vertical",
          $(go.TextBlock, {
            font: "bold 13px sans-serif",
            stroke: "#0f172a"
          }, new go.Binding("text", "name")),
          $(go.TextBlock, {
            font: "11px sans-serif",
            stroke: "#475569"
          }, new go.Binding("text", "role"))
        )
      ),

      // Footer
      $(go.Panel, "Horizontal",
        { margin: new go.Margin(6, 0, 0, 0) },
        $(go.TextBlock, {
          font: "10px sans-serif",
          stroke: "#64748b"
        }, new go.Binding("text", "count", c => `👤 ${c || 0}`)),

        expandable
          ? $(go.TextBlock, {
              margin: new go.Margin(0, 0, 0, 10),
              font: "10px sans-serif",
              stroke: "#64748b",
              cursor: "pointer"
            }, new go.Binding("text", "isSubGraphExpanded",
              e => e ? "⌃" : "⌄").ofObject())
          : $(go.Panel)
      )
    )
  );
}

/* ======================================================
   TEAM TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader",
  $(go.Node, "Auto", cardBase("#2563eb", false))
);

diagram.nodeTemplateMap.add("Worker",
  $(go.Node, "Auto", cardBase("#e5e7eb", false))
);

diagram.groupTemplateMap.add("Supervisor",
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: false,
      layout: $(go.GridLayout, {
        wrappingColumn: 3,
        spacing: new go.Size(16, 16)
      })
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    $(go.Panel, "Auto",
      {
        cursor: "pointer",
        click: (e, p) => {
          diagram.startTransaction("toggleSup");
          p.part.isSubGraphExpanded = !p.part.isSubGraphExpanded;
          diagram.commitTransaction("toggleSup");
        }
      },
      cardBase("#14b8a6", true)
    ),
    $(go.Placeholder, { padding: 14 })
  )
);

diagram.groupTemplateMap.add("EMR_ROOT",
  $(go.Group, "Auto",
    {
      layout: $(go.TreeLayout, {
        angle: 90,
        alignment: go.TreeLayout.AlignmentCenterChildren,
        nodeSpacing: 28,
        layerSpacing: 80
      })
    },
    $(go.Placeholder, { padding: 20 })
  )
);

/* ======================================================
   VENDORS TEMPLATES
   ====================================================== */
diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group, "Vertical",
    {
      layout: $(go.GridLayout, {
        wrappingColumn: 4,
        spacing: new go.Size(30, 30)
      })
    },
    $(go.Panel, "Auto", cardBase("#7c3aed", false)),
    $(go.Placeholder, { padding: 20 })
  )
);

diagram.groupTemplateMap.add("VendorDept",
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: false,
      layout: $(go.GridLayout, {
        wrappingColumn: 2,
        spacing: new go.Size(12, 12)
      })
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    $(go.Panel, "Auto",
      {
        cursor: "pointer",
        click: (e, p) => {
          diagram.startTransaction("toggleDept");
          p.part.isSubGraphExpanded = !p.part.isSubGraphExpanded;
          diagram.commitTransaction("toggleDept");
        }
      },
      cardBase("#7c3aed", true)
    ),
    $(go.Placeholder, { padding: 12 })
  )
);

diagram.nodeTemplateMap.add("VendorCompany",
  $(go.Node, "Auto", cardBase("#e5e7eb", false))
);

/* ======================================================
   BUILD TEAM
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
    role: leader.Position || "",
    image: leader.ImageURL || "",
    count: people.length - 1
  });

  people.forEach(s => {
    if (s["SupervisorEmail (required)"] === leader["Email (required)"]) {
      const workers = people.filter(w => w["SupervisorEmail (required)"] === s["Email (required)"]);

      nodes.push({
        key: s.__id,
        isGroup: true,
        category: "Supervisor",
        group: "EMR_ROOT",
        name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
        role: s.Position || "",
        image: s.ImageURL || "",
        count: workers.length
      });

      links.push({ from: leader.__id, to: s.__id });

      workers.forEach(w => {
        nodes.push({
          key: w.__id,
          category: "Worker",
          group: s.__id,
          name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
          role: w.Position || "",
          image: w.ImageURL || ""
        });
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
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
      category: "VendorDept",
      group: "VENDORS_ROOT",
      name: dept,
      count: list.length
    });

    list.forEach((v, j) => {
      model.addNodeData({
        key: `${dk}_${j}`,
        category: "VendorCompany",
        group: dk,
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`,
        role: v.Position || "",
        image: v.ImageURL || ""
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
   CONTROLS (SIN OPTIONAL CHAINING)
   ====================================================== */
const btnTeams = document.getElementById("btnTeams");
if (btnTeams) btnTeams.onclick = () => showOnlyRoot("EMR_ROOT");

const btnVendors = document.getElementById("btnVendorsDept");
if (btnVendors) btnVendors.onclick = () => showOnlyRoot("VENDORS_ROOT");

const btnZoomIn = document.getElementById("btnZoomIn");
if (btnZoomIn) btnZoomIn.onclick = () => {
  diagram.scale = clamp(diagram.scale * 1.12, diagram.minScale, diagram.maxScale);
};

const btnZoomOut = document.getElementById("btnZoomOut");
if (btnZoomOut) btnZoomOut.onclick = () => {
  diagram.scale = clamp(diagram.scale / 1.12, diagram.minScale, diagram.maxScale);
};

const btnFit = document.getElementById("btnFit");
if (btnFit) btnFit.onclick = () => diagram.zoomToFit();

const btnFull = document.getElementById("btnFull");
if (btnFull) {
  btnFull.onclick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setTimeout(() => diagram.zoomToFit(), 300);
  };
}
