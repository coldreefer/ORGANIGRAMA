/* ======================================================
   0. SHORTCUT
   ====================================================== */
const $ = go.GraphObject.make;

/* ======================================================
   1. DIAGRAM
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
  "animationManager.duration": 280,
  "undoManager.isEnabled": false
});

/* ======================================================
   2. HELPERS
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
   3. CARD BASE (MISMO ESTILO PARA TODO)
   ====================================================== */
function cardBase({
  stroke = "#cbd5e1",
  headerBg = "#ffffff",
  footer = true,
  expandable = false,
  avatar = false
}) {
  return $(go.Panel, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: headerBg,
      stroke,
      strokeWidth: 2
    }),
    $(go.Panel, "Vertical", { margin: 10 },

      // HEADER
      $(go.Panel, "Horizontal",
        avatar
          ? $(go.Shape, "Circle", {
              width: 34, height: 34, fill: "#e5e7eb", margin: new go.Margin(0, 8, 0, 0)
            })
          : $(go.Panel), // vacío

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

      // FOOTER
      footer
        ? $(go.Panel, "Horizontal",
            { margin: new go.Margin(8, 0, 0, 0) },
            $(go.TextBlock, {
              font: "10px sans-serif",
              stroke: "#64748b"
            }, new go.Binding("text", "count", c => `👤 ${c || 0}`)),

            expandable
              ? $(go.TextBlock, {
                  margin: new go.Margin(0, 0, 0, 10),
                  cursor: "pointer",
                  font: "10px sans-serif",
                  stroke: "#64748b"
                },
                new go.Binding("text", "isSubGraphExpanded",
                  e => e ? "⌃" : "⌄").ofObject()
              )
              : $(go.Panel)
          )
        : $(go.Panel)
    )
  );
}

/* ======================================================
   4. TEAM TEMPLATES
   ====================================================== */
// LEADER
diagram.nodeTemplateMap.add("Leader",
  $(go.Node, "Auto",
    cardBase({
      stroke: "#2563eb",
      avatar: true,
      footer: false
    })
  )
);

// WORKER
diagram.nodeTemplateMap.add("Worker",
  $(go.Node, "Auto",
    cardBase({
      stroke: "#e5e7eb",
      avatar: true,
      footer: false
    })
  )
);

// SUPERVISOR (GROUP)
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
          diagram.startTransaction("toggle");
          p.part.isSubGraphExpanded = !p.part.isSubGraphExpanded;
          diagram.commitTransaction("toggle");
        }
      },
      cardBase({
        stroke: "#14b8a6",
        avatar: true,
        expandable: true
      })
    ),

    $(go.Placeholder, { padding: 14 })
  )
);

// ROOT TEAM
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
   5. VENDORS TEMPLATES (MISMO ESTILO)
   ====================================================== */
// ROOT
diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group, "Vertical",
    {
      layout: $(go.GridLayout, {
        wrappingColumn: 4,
        spacing: new go.Size(30, 30)
      })
    },
    $(go.Panel, "Auto",
      cardBase({
        stroke: "#7c3aed",
        footer: true
      })
    ),
    $(go.Placeholder, { padding: 20 })
  )
);

// DEPARTMENT
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
      cardBase({
        stroke: "#7c3aed",
        expandable: true
      })
    ),

    $(go.Placeholder, { padding: 12 })
  )
);

// VENDOR COMPANY
diagram.nodeTemplateMap.add("VendorCompany",
  $(go.Node, "Auto",
    cardBase({
      stroke: "#e5e7eb",
      footer: false
    })
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
      const workers = people.filter(w => w["SupervisorEmail (required)"] === s["Email (required)"]);

      nodes.push({
        key: s.__id,
        isGroup: true,
        category: "Supervisor",
        group: "EMR_ROOT",
        name: `${s["First name (required)"]} ${s["Last name (required)"]}`,
        role: s.Position || "",
        count: workers.length
      });

      links.push({ from: leader.__id, to: s.__id });

      workers.forEach(w => {
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

  diagram.startTransaction("vendors");

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
    const dk = `V_DEPT_${i}`;

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
        key: `${dk}_C_${j}`,
        category: "VendorCompany",
        group: dk,
        name: `${v["First name (required)"]} ${v["Last name (required)"]}`,
        role: v.Position || ""
      });
    });
  });

  diagram.commitTransaction("vendors");
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
  if (!document.fullscreenElement) el.requestFullscreen();
  else document.exitFullscreen();
  setTimeout(() => diagram.zoomToFit(), 300);
});
