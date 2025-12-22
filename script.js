const $ = go.GraphObject.make;

/* ======================================================
   AVATAR DEFAULT
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
  allowHorizontalScroll: true,
  allowVerticalScroll: true,
  scrollMode: go.Diagram.InfiniteScroll,

  "animationManager.isEnabled": true,
  "animationManager.duration": 300,
  "undoManager.isEnabled": false
});

/* ======================================================
   CONTROLES UI
   ====================================================== */
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

document.addEventListener("DOMContentLoaded", () => {

  btnZoomIn.onclick  = () => diagram.scale = clamp(diagram.scale * 1.12, diagram.minScale, diagram.maxScale);
  btnZoomOut.onclick = () => diagram.scale = clamp(diagram.scale / 1.12, diagram.minScale, diagram.maxScale);
  btnFit.onclick     = () => diagram.zoomToFit();

  btnFull.onclick = async () => {
    const el = document.getElementById("diagramWrapper");
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      diagram.zoomToFit();
    }
  };

  // 🔁 Navegación por secciones
  btnEMR.onclick     = () => goToSection("EMR_ROOT");
  btnVendors.onclick = () => goToSection("VENDORS_ROOT");
});

/* ======================================================
   NAVEGACIÓN ENTRE SECCIONES
   ====================================================== */
function goToSection(key){
  const node = diagram.findNodeForKey(key);
  if (!node) return;
  diagram.centerRect(node.actualBounds);
}

/* ======================================================
   IMAGE
   ====================================================== */
function resolveImage(url) {
  if (!url || !url.trim()) return DEFAULT_AVATAR;
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
  new go.Binding("visible", "teamCount", n => n > 0),
  new go.Binding("text", "teamCount", n => `A cargo: ${n}`));
}

/* ======================================================
   LEADER / WORKER
   ====================================================== */
function personCard(border, roleColor, photoBorder) {
  return $(go.Node, "Vertical",
    { selectable: false },

    $(go.Panel, "Auto",
      { desiredSize: new go.Size(210, 260) },

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
          wrap: go.TextBlock.WrapFit
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(2,6,0,6),
          font: "11.5px sans-serif",
          stroke: roleColor,
          textAlign: "center",
          wrap: go.TextBlock.WrapFit
        }, new go.Binding("text", "role")),

        countLine()
      )
    )
  );
}

diagram.nodeTemplateMap.add("Leader", personCard("#2563eb", "#2563eb", "#2563eb"));
diagram.nodeTemplateMap.add("Worker", personCard("#e5e7eb", "#475569", "#94a3b8"));

/* ======================================================
   SUPERVISOR (TREE NODE)
   ====================================================== */
diagram.nodeTemplateMap.add("Supervisor",
  $(go.Node, "Vertical",
    { selectable: false },

    $(go.Panel, "Auto",
      { desiredSize: new go.Size(210, 120) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#14b8a6",
        strokeWidth: 2
      }),

      $(go.Panel, "Horizontal", { margin: 10 },

        photo(52, "#14b8a6"),

        $(go.Panel, "Vertical",
          { margin: new go.Margin(0,8,0,8), width: 120 },

          $(go.TextBlock, {
            font: "bold 12.5px sans-serif",
            wrap: go.TextBlock.WrapFit
          }, new go.Binding("text", "name")),

          $(go.TextBlock, {
            font: "11px sans-serif",
            stroke: "#0f766e",
            wrap: go.TextBlock.WrapFit
          }, new go.Binding("text", "role")),

          countLine()
        ),

        $("TreeExpanderButton")
      )
    )
  )
);

/* ======================================================
   LINKS
   ====================================================== */
diagram.linkTemplate =
  $(go.Link, { routing: go.Link.Orthogonal, corner: 8 },
    $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.4 })
  );

/* ======================================================
   EMR ROOT (TREE LAYOUT)
   ====================================================== */
diagram.groupTemplateMap.add("EMR_ROOT",
  $(go.Group, "Auto",
    {
      selectable: false,
      layout: $(go.TreeLayout, {
        angle: 90,
        arrangement: go.TreeLayout.ArrangementHorizontal,
        alignment: go.TreeLayout.AlignmentCenterChildren,
        nodeSpacing: 30,
        layerSpacing: 80
      })
    },
    $(go.Placeholder, { padding: 20 })
  )
);

/* ======================================================
   LOAD TEAM
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: r => buildEMR(r.data)
});

function buildEMR(rows) {
  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p,i) => p.__id = "P_" + i);

  const nodes = [];
  const links = [];

  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: "EMR_ROOT",
    isGroup: true,
    category: "EMR_ROOT"
  });

  nodes.push({
    key: leader.__id,
    category: "Leader",
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
        category: "Supervisor",
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
          name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
          role: w.Position || "",
          image: w.ImageURL || "",
          teamCount: 0
        });
        links.push({ from: sup.__id, to: w.__id });
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
  setTimeout(() => diagram.zoomToFit(), 50);
}

/* ======================================================
   VENDORS (SECCIÓN APARTE)
   ====================================================== */
diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group, "Vertical",
    {
      selectable: false,
      layout: $(go.GridLayout, {
        wrappingColumn: Infinity,
        spacing: new go.Size(60, 30)
      })
    },
    $(go.TextBlock, {
      margin: 16,
      font: "bold 16px sans-serif"
    }, new go.Binding("text", "name")),

    $(go.Placeholder, { padding: 20 })
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
  complete: r => buildVendors(r.data)
});

function buildVendors(rows) {
  const model = diagram.model;
  if (!model) return;

  diagram.startTransaction("vendors");

  model.addNodeData({
    key: "VENDORS_ROOT",
    isGroup: true,
    category: "VendorRoot",
    name: "Vendors",
    loc: "2200 0",
    isLayoutPositioned: false
  });

  rows.forEach((v, i) => {
    model.addNodeData({
      key: "V_" + i,
      group: "VENDORS_ROOT",
      category: "VendorCompany",
      name: `${v["First name (required)"]} ${v["Last name (required)"]}`,
      info: v.Position || ""
    });
  });

  diagram.commitTransaction("vendors");
}
