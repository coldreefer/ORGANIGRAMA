const $ = go.GraphObject.make;

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
   DIAGRAM
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,

  // IMPORTANTE: evita el borde azul / selección
  allowSelect: false,

  // Zoom + scroll libre
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.35,
  maxScale: 2.5,
  allowHorizontalScroll: true,
  allowVerticalScroll: true,
  scrollMode: go.Diagram.InfiniteScroll,

  // Animaciones
  "animationManager.isEnabled": true,
  "animationManager.duration": 320,

  layout: $(go.TreeLayout, {
    angle: 90,
    alignment: go.TreeLayout.AlignmentCenterChildren,
    nodeSpacing: 26,
    layerSpacing: 70
  }),

  "undoManager.isEnabled": false
});

/* ======================================================
   CONTROLES UI (Zoom/Fit/Fullscreen)
   ====================================================== */
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

document.getElementById("btnZoomIn").addEventListener("click", () => {
  diagram.scale = clamp(diagram.scale * 1.12, diagram.minScale, diagram.maxScale);
});

document.getElementById("btnZoomOut").addEventListener("click", () => {
  diagram.scale = clamp(diagram.scale / 1.12, diagram.minScale, diagram.maxScale);
});

document.getElementById("btnFit").addEventListener("click", () => {
  diagram.zoomToFit();
});

document.getElementById("btnFull").addEventListener("click", async () => {
  const el = document.getElementById("diagramWrapper");
  try{
    if (!document.fullscreenElement) await el.requestFullscreen();
    else await document.exitFullscreen();
  } catch(e){
    // Si el browser bloquea fullscreen por políticas, al menos hacemos fit
    diagram.zoomToFit();
  }
});

/* ======================================================
   IMAGE RESOLVE (proxy + fallback)
   ====================================================== */
function resolveImage(url) {
  if (!url || String(url).trim() === "") return DEFAULT_AVATAR;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url);
}

/* ======================================================
   FOTO CUADRADA + BORDE CUADRADO (coherente)
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
    }, new go.Binding("source", "image", resolveImage))
  );
}

/* ======================================================
   “A cargo: N” (solo si teamCount > 0)
   ====================================================== */
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
   PERSON CARD (Leader/Worker)
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

      $(go.Panel, "Vertical",
        { margin: 12 },

        photo(64, photoBorder),

        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 12.5px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 3
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(2, 6, 0, 6),
          font: "11.5px sans-serif",
          stroke: roleColor,
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2
        }, new go.Binding("text", "role")),

        // ✅ solo aparece si teamCount > 0 (Leader sí, Worker no)
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
   SUPERVISOR GROUP (click en la tarjeta para toggle)
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

    // Tarjeta del supervisor: aquí va el click (estable)
    $(go.Panel, "Auto",
      {
        name: "SUPERVISOR_CARD",
        isActionable: true,
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

      $(go.Panel, "Vertical",
        { margin: 12 },

        photo(64, "#14b8a6"),

        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 13px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 3
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(0, 6, 0, 6),
          font: "11.5px sans-serif",
          stroke: "#0f766e",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2
        }, new go.Binding("text", "role")),

        // ✅ contador solo si teamCount > 0 (supervisor sí)
        countLine(),

        $(go.TextBlock, {
          margin: new go.Margin(6, 0, 0, 0),
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
   LOAD CSV
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => buildModel(res.data)
});

/* ======================================================
   BUILD MODEL + COUNTS
   ====================================================== */
function buildModel(rows) {
  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p.__id = "P_" + i);

  const nodes = [];
  const links = [];

  // Root (Team Leader)
  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  // Total a cargo Team Leader = todos menos él
  const leaderTotal = Math.max(0, people.length - 1);

  nodes.push({
    key: leader.__id,
    category: "Leader",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || "",
    teamCount: leaderTotal
  });

  // Supervisores directos del líder
  const leaderEmail = leader["Email (required)"];

  people.forEach(sup => {
    if (sup["SupervisorEmail (required)"] === leaderEmail) {

      const supEmail = sup["Email (required)"];
      const workers = people.filter(w => w["SupervisorEmail (required)"] === supEmail);
      const supCount = workers.length;

      nodes.push({
        key: sup.__id,
        isGroup: true,
        name: `${sup["First name (required)"]} ${sup["Last name (required)"]}`,
        role: sup.Position || "",
        image: sup.ImageURL || "",
        teamCount: supCount
      });

      links.push({ from: leader.__id, to: sup.__id });

      workers.forEach(w => {
        nodes.push({
          key: w.__id,
          group: sup.__id,
          category: "Worker",
          name: `${w["First name (required)"]} ${w["Last name (required)"]}`,
          role: w.Position || "",
          image: w.ImageURL || "",
          teamCount: 0 // ✅ no muestra “A cargo”
        });
      });
    }
  });

  const model = new go.GraphLinksModel(nodes, links);
  model.nodeKeyProperty = "key";
  diagram.model = model;

  // Al cargar, ajusta a pantalla (ideal para presentación)
  setTimeout(() => diagram.zoomToFit(), 50);
}
/* ======================================================
   ==================== VENDORS =========================
   (MISMO DIAGRAM – NO SE TOCA EMR)
   ====================================================== */

/* ---------- Templates Vendors ---------- */

// Root Vendors
diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: true,
      selectable: false,
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 20,
        layerSpacing: 60
      })
    },
    $(go.Shape, "RoundedRectangle", {
      fill: "#f5f3ff",
      stroke: "#7c3aed",
      strokeWidth: 2
    }),
    $(go.TextBlock, {
      margin: 14,
      font: "bold 14px sans-serif",
      stroke: "#4c1d95"
    }, new go.Binding("text", "name")),
    $(go.Placeholder, { padding: 18 })
  )
);


// Department (visible siempre)
diagram.groupTemplateMap.add("VendorDepartment",
  $(go.Group, "Vertical",
    {
      isSubGraphExpanded: true,
      selectable: false,
      cursor: "pointer",
      click: (e, group) => {
        const diagram = group.diagram;
        diagram.startTransaction("toggleDept");
        group.isSubGraphExpanded = !group.isSubGraphExpanded;
        diagram.commitTransaction("toggleDept");
      }
    },

    $(go.Panel, "Auto",
      $(go.Shape, "RoundedRectangle", {
        fill: "#ffffff",
        stroke: "#94a3b8",
        strokeWidth: 2
      }),
      $(go.Panel, "Vertical", { margin: 12 },
        $(go.TextBlock, {
          font: "bold 13px sans-serif",
          stroke: "#0f172a",
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
        }, new go.Binding("text", "isSubGraphExpanded",
          e => e ? "▲ Ocultar" : "▼ Ver"
        ).ofObject())
      )
    ),

    // 🔑 ESTO ES OBLIGATORIO
    $(go.Placeholder, { padding: 12 })
  )
);


// Company
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

/* ---------- Carga CSV Vendors ---------- */

Papa.parse("vendors.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => buildVendors(res.data)
});

/* ---------- Build Vendors ---------- */

function buildVendors(rows) {

  const vendors = rows.filter(r => r.Department);

  const model = diagram.model;
  if (!model) return;

  diagram.startTransaction("addVendors");

  // Root Vendors (posición a la derecha del EMR)
  const vendorsRootKey = "VENDORS_ROOT";

  model.addNodeData({
    key: vendorsRootKey,
    category: "VendorRoot",
    isGroup: true,
    name: "Vendors",
  });

  const departments = {};

  vendors.forEach(v => {
    if (!departments[v.Department]) departments[v.Department] = [];
    departments[v.Department].push(v);
  });

  Object.entries(departments).forEach(([dept, list], i) => {

    const deptKey = `VEND_DEPT_${i}`;

    model.addNodeData({
      key: deptKey,
      group: vendorsRootKey,
      isGroup: true,
      category: "VendorDepartment",
      name: dept,
      count: list.length
    });

    list.forEach((c, j) => {
      model.addNodeData({
        key: `${deptKey}_C_${j}`,
        group: deptKey,
        category: "VendorCompany",
        name: `${c["First name (required)"]} ${c["Last name (required)"]}`.trim(),
        info: c.Position || ""
      });
    });
  });

  diagram.commitTransaction("addVendors");

  // NO tocamos zoom si ya lo manejas tú
}
