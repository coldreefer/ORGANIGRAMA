const $ = go.GraphObject.make;

/* ======================================================
   AVATAR DEFAULT (SVG DATA URL)
   ====================================================== */
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#e5e7eb"/>
    <circle cx="50" cy="38" r="18" fill="#9ca3af"/>
    <path d="M20 90c4-22 56-22 60 0" fill="#9ca3af"/>
  </svg>
`);

/* ======================================================
   DIAGRAM
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,
  allowMove: false,
  allowCopy: false,

  // Zoom + scroll libre
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.35,
  maxScale: 2.5,
  allowHorizontalScroll: true,
  allowVerticalScroll: true,
  scrollMode: go.Diagram.InfiniteScroll,

  // Animaciones suaves
  "animationManager.isEnabled": true,
  "animationManager.duration": 320,

  // Layout
  layout: $(go.TreeLayout, {
    angle: 90,
    alignment: go.TreeLayout.AlignmentCenterChildren,
    nodeSpacing: 26,
    layerSpacing: 70
  }),

  "undoManager.isEnabled": false
});

/* ======================================================
   IMPORTANTÍSIMO: quitar selección (borde azul)
   ====================================================== */
diagram.toolManager.clickSelectingTool.isEnabled = false;
diagram.toolManager.dragSelectingTool.isEnabled = false;
// También evitamos “selection adornments” por si acaso
diagram.addDiagramListener("ChangedSelection", () => {
  if (diagram.selection.count > 0) diagram.clearSelection();
});

/* ======================================================
   IMAGE RESOLVE (proxy + fallback)
   ====================================================== */
function resolveImage(url) {
  if (!url || String(url).trim() === "") return DEFAULT_AVATAR;
  // Proxy para evitar CORS en fotos remotas
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
   BADGE: "A cargo: N"
   ====================================================== */
function countLine() {
  return $(go.TextBlock, {
    margin: new go.Margin(6, 0, 0, 0),
    font: "10px sans-serif",
    stroke: "#64748b",
    textAlign: "center"
  }, new go.Binding("text", "teamCount", n => {
    const v = Number(n || 0);
    return `A cargo: ${v}`;
  }));
}

/* ======================================================
   PERSON CARD
   ====================================================== */
function personCard(border, roleColor, photoBorder) {
  return $(go.Node, "Vertical",
    {
      selectable: false,
      selectionAdorned: false
    },

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

        // ✅ contador (si no existe, igual mostrará 0; puedes ocultarlo si prefieres)
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
   SUPERVISOR GROUP
   ====================================================== */
diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,

      layout: $(go.GridLayout, {
        wrappingColumn: 2,
        spacing: new go.Size(20, 20)
      }),

      isSubGraphExpanded: false
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    // 🔵 PANEL DEL SUPERVISOR (AQUÍ va el click)
    $(go.Panel, "Auto",
      {
        name: "SUPERVISOR_CARD",
        isActionable: true,   // 🔴 CLAVE
        cursor: "pointer",
        click: (e, panel) => {
          const group = panel.part;
          if (!(group instanceof go.Group)) return;

          diagram.startTransaction("toggle");
          group.isSubGraphExpanded = !group.isSubGraphExpanded;
          diagram.commitTransaction("toggle");
        }
      },

      { desiredSize: new go.Size(210, 290) },

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

        // contador
        countLine(),

        // indicador visual
        $(go.TextBlock, {
          margin: new go.Margin(6, 0, 0, 0),
          font: "10px sans-serif",
          stroke: "#64748b"
        }, new go.Binding(
          "text",
          "isSubGraphExpanded",
          e => e ? "▲ Ocultar equipo" : "▼ Ver equipo"
        ).ofObject())
      )
    ),

    // 👇 AQUÍ van los trabajadores
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

  // TEAM LEADER (root)
  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  // Leader total a cargo = todos menos él (incluye supervisores + trabajadores)
  const leaderTotal = Math.max(0, people.length - 1);

  nodes.push({
    key: leader.__id,
    category: "Leader",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || "",
    teamCount: leaderTotal
  });

  // Para calcular conteos por supervisor
  const emailToPerson = new Map(people.map(p => [p["Email (required)"], p]));
  const supervisorEmail = leader["Email (required)"];

  people.forEach(sup => {
    if (sup["SupervisorEmail (required)"] === supervisorEmail) {

      // trabajadores directos del supervisor
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

      workers.forEach(worker => {
        nodes.push({
          key: worker.__id,
          group: sup.__id,
          category: "Worker",
          name: `${worker["First name (required)"]} ${worker["Last name (required)"]}`,
          role: worker.Position || "",
          image: worker.ImageURL || "",
          teamCount: 0
        });
      });
    }
  });

  const model = new go.GraphLinksModel(nodes, links);
  model.nodeKeyProperty = "key";
  diagram.model = model;

  // Por seguridad: limpiar selección post-carga
  diagram.clearSelection();
}
