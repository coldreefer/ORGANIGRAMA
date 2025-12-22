const $ = go.GraphObject.make;
const vendorLinks = [];

/* ======================================================
   AVATAR DEFAULT “tipo Instagram” (silueta en círculo)
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
   DIAGRAM (SIN layout global)
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
  "animationManager.duration": 320,
  "undoManager.isEnabled": false
});

/* ======================================================
   CONTROLES UI
   ====================================================== */
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

document.getElementById("btnZoomIn")?.addEventListener("click", () => {
  diagram.scale = clamp(diagram.scale * 1.12, diagram.minScale, diagram.maxScale);
});

document.getElementById("btnZoomOut")?.addEventListener("click", () => {
  diagram.scale = clamp(diagram.scale / 1.12, diagram.minScale, diagram.maxScale);
});

document.getElementById("btnFit")?.addEventListener("click", () => {
  diagram.zoomToFit();
});

document.getElementById("btnFull")?.addEventListener("click", async () => {
  const el = document.getElementById("diagramWrapper");
  try {
    if (!document.fullscreenElement) await el.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    diagram.zoomToFit();
  }
});

document.getElementById("btnVendors")?.addEventListener("click", () => {
  goToNodeByKey("VENDORS_ROOT");
});

document.getElementById("btnVendorsDept")?.addEventListener("click", () => {
  goToNodeByKey("VEND_DEPT_0");
});

/* ======================================================
   HELPERS
   ====================================================== */
function goToNodeByKey(key) {
  const node = diagram.findNodeForKey(key);
  if (!node) return;
  diagram.centerRect(node.actualBounds);
}

function resolveImage(url) {
  if (!url || String(url).trim() === "") return DEFAULT_AVATAR;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url);
}

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
    }, new go.Binding("source", "image", resolveImage))
  );
}

function countLine() {
  return $(go.TextBlock, {
    margin: new go.Margin(6, 0, 0, 0),
    font: "10px sans-serif",
    stroke: "#64748b",
    textAlign: "center"
  },
  new go.Binding("visible", "teamCount", n => Number(n || 0) > 0),
  new go.Binding("text", "teamCount", n => `A cargo: ${Number(n || 0)}`));
}

/* ======================================================
   PERSON CARD (Leader / Worker)
   ====================================================== */
function personCard(border, roleColor, photoBorder) {
  return $(go.Node, "Vertical",
    { selectable: false, selectionAdorned: false },

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
          margin: new go.Margin(10,6,2,6),
          font: "bold 12.5px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 3
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(2,6,0,6),
          font: "11.5px sans-serif",
          stroke: roleColor,
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2
        }, new go.Binding("text", "role")),

        countLine()
      )
    )
  );
}

/* ======================================================
   NODE TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader", personCard("#2563eb", "#2563eb", "#2563eb"));
diagram.nodeTemplateMap.add("Worker", personCard("#e5e7eb", "#475569", "#94a3b8"));
diagram.nodeTemplate = personCard("#e5e7eb", "#475569", "#94a3b8");

/* ======================================================
   EMR ROOT (TREE AISLADO)
   ====================================================== */
diagram.groupTemplateMap.add("EMR_ROOT",
  $(go.Group, "Auto",
    {
      selectable: false,
      layout: $(go.TreeLayout, {
        angle: 90,
        alignment: go.TreeLayout.AlignmentCenterChildren,
        nodeSpacing: 26,
        layerSpacing: 70
      })
    },
    $(go.Placeholder, { padding: 20 })
  )
);

/* ======================================================
   SUPERVISOR GROUP
   ====================================================== */
diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      isSubGraphExpanded: false,
      layout: $(go.GridLayout, {
        wrappingColumn: 2,
        spacing: new go.Size(20, 20)
      })
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    $(go.Panel, "Auto",
      {
        cursor: "pointer",
        click: (e, panel) => {
          const group = panel.part;
          if (!(group instanceof go.Group)) return;
          diagram.startTransaction("toggle");
          group.isSubGraphExpanded = !group.isSubGraphExpanded;
          diagram.commitTransaction("toggle");
        }
      },
      { desiredSize: new go.Size(210, 300) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#14b8a6",
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical", { margin: 12 },
        photo(64, "#14b8a6"),

        $(go.TextBlock, {
          margin: new go.Margin(10,6,2,6),
          font: "bold 13px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(0,6,0,6),
          font: "11.5px sans-serif",
          stroke: "#0f766e",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit
        }, new go.Binding("text", "role")),

        countLine(),

        $(go.TextBlock, {
          margin: new go.Margin(6,0,0,0),
          font: "10px sans-serif",
          stroke: "#64748b"
        }, new go.Binding("text", "isSubGraphExpanded",
          e => e ? "▲ Ocultar equipo" : "▼ Ver equipo"
        ).ofObject())
      )
    ),

    $(go.Placeholder, { padding: 18 })
  );

/* ======================================================
   LINKS
   ====================================================== */
diagram.linkTemplate =
  $(go.Link, { routing: go.Link.Orthogonal, corner: 8 },
    $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.4 })
  );

/* ======================================================
   LOAD TEAM
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => buildModel(res.data)
});

function buildModel(rows) {
  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p,i) => p.__id = "P_" + i);

  const nodes = [];
  const links = [];

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: "EMR_ROOT",
    isGroup: true,
    category: "EMR_ROOT",
    loc: "0 0",
    isLayoutPositioned: false
  });

  nodes.push({
    key: leader.__id,
    category: "Leader",
    group: "EMR_ROOT",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || "",
    teamCount: people.length - 1
  });

  const leaderEmail = leader["Email (required)"];

  people.forEach(sup => {
    if (sup["SupervisorEmail (required)"] === leaderEmail) {

      const workers = people.filter(w => w["SupervisorEmail (required)"] === sup["Email (required)"]);

      nodes.push({
        key: sup.__id,
        isGroup: true,
        group: "EMR_ROOT",
        name: `${sup["First name (required)"]} ${sup["Last name (required)"]}`,
        role: sup.Position || "",
        image: sup.ImageURL || "",
        teamCount: workers.length
      });

      links.push({ from: leader.__id, to: sup.__id });

      workers.forEach(w => {
        nodes.push({
          key: w.__id,
          category: "Worker",
          group: sup.__id,
          name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
          role: w.Position || "",
          image: w.ImageURL || "",
          teamCount: 0
        });
      });
    }
  });

  diagram.model = new go.GraphLinksModel(
     nodes,
     links.concat(vendorLinks)
   );
  setTimeout(() => diagram.zoomToFit(), 50);
}

/* ======================================================
   ==================== VENDORS =========================
   ====================================================== */

diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group, "Vertical",
    {
      selectable: false,
      isSubGraphExpanded: true,
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 30,
        layerSpacing: 40
      })
    },
    $(go.Panel, "Auto",
      $(go.Shape, "RoundedRectangle", {
        fill: "#f5f3ff",
        stroke: "#7c3aed",
        strokeWidth: 2
      }),
      $(go.TextBlock, {
        margin: 14,
        font: "bold 14px sans-serif",
        stroke: "#4c1d95"
      }, new go.Binding("text", "name"))
    ),
    $(go.Placeholder, { padding: 20 })
  )
);

diagram.nodeTemplateMap.add("VendorDepartment",
  $(go.Node, "Auto",
    {
      isActionable: true,
      cursor: "pointer",
      click: (e, node) => {
        diagram.startTransaction("toggleDept");
        node.isTreeExpanded = !node.isTreeExpanded;
        diagram.commitTransaction("toggleDept");
      }
    },
    $(go.Shape, "RoundedRectangle", {
      fill: "#ffffff",
      stroke: "#94a3b8",
      strokeWidth: 2
    }),
    $(go.Panel, "Vertical", { margin: 12 },
      $(go.TextBlock, {
        font: "bold 13px sans-serif",
        textAlign: "center"
      }, new go.Binding("text", "name")),
      $(go.TextBlock, {
        margin: new go.Margin(6,0,0,0),
        font: "10px sans-serif",
        stroke: "#475569"
      }, new go.Binding("text", "count", n => `${n} proveedores`)),
      $(go.TextBlock, {
        margin: new go.Margin(6,0,0,0),
        font: "10px sans-serif",
        stroke: "#64748b"
      }, new go.Binding("text", "isTreeExpanded",
        e => e ? "▲ Ocultar" : "▼ Ver"
      ).ofObject())
    )
  )
);

diagram.nodeTemplateMap.add("VendorCompany",
  $(go.Node, "Auto",
    $(go.Shape, "RoundedRectangle", {
      fill: "#ffffff",
      stroke: "#e5e7eb",
      strokeWidth: 1.5
    }),
    $(go.Panel, "Vertical", { margin: 10 },
      $(go.TextBlock, {
        font: "bold 12px sans-serif",
        textAlign: "center"
      }, new go.Binding("text", "name")),
      $(go.TextBlock, {
        margin: new go.Margin(4,0,0,0),
        font: "10px sans-serif",
        stroke: "#64748b",
        textAlign: "center"
      }, new go.Binding("text", "info"))
    )
  )
);

Papa.parse("vendors.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => buildVendors(res.data)
});

function buildVendors(rows) {
  const model = diagram.model;
  if (!model) return;

  diagram.startTransaction("vendors");

  model.addNodeData({
    key: "VENDORS_ROOT",
    category: "VendorRoot",
    name: "Vendors",
    loc: "2000 0",
    isLayoutPositioned: false
  });

  const departments = {};
  rows.forEach(v => {
    if (!departments[v.Department]) departments[v.Department] = [];
    departments[v.Department].push(v);
  });

  Object.entries(departments).forEach(([dept, list], i) => {
    const deptKey = `VEND_DEPT_${i}`;

    model.addNodeData({
      key: deptKey,
      category: "VendorDepartment",
      name: dept,
      count: list.length
    });

    vendorLinks.push({
       from: "VENDORS_ROOT",
       to: deptKey
    });

    list.forEach((c,j) => {
      model.addNodeData({
        key: `${deptKey}_C_${j}`,
        category: "VendorCompany",
        name: `${c["First name (required)"]} ${c["Last name (required)"]}`.trim(),
        info: c.Position || ""
      });
    vendorLinks.push({
       from: deptKey,
       to: `${deptKey}_C_${j}`
    });
  });

  diagram.commitTransaction("vendors");
}
