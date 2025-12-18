const $ = go.GraphObject.make;

/* ======================================================
   DIAGRAM
   ====================================================== */
const diagram = $(go.Diagram, "diagramDiv", {
  initialContentAlignment: go.Spot.Center,

  allowMove: false,
  allowCopy: false,

  // Zoom
  mouseWheelBehavior: go.Diagram.Zoom,
  minScale: 0.3,
  maxScale: 2.5,

  // Pan + scroll libre
  allowHorizontalScroll: true,
  allowVerticalScroll: true,
  scrollMode: go.Diagram.InfiniteScroll,

  "undoManager.isEnabled": false,

  layout: $(go.TreeLayout, {
    angle: 90,
    arrangement: go.TreeLayout.ArrangementFixedRoots,
    alignment: go.TreeLayout.AlignmentCenterChildren,
    nodeSpacing: 20,
    layerSpacing: 60
  })
});

/* ======================================================
   IMAGE PROXY (CCV / CORS)
   ====================================================== */
function proxyImage(url) {
  if (!url) return "";
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url);
}

/* ======================================================
   PHOTO + CIRCULAR FRAME (MARCO, NO RECORTE)
   ====================================================== */
function photoWithCircle(size) {
  return $(go.Panel, "Spot",
    { width: size, height: size },

    // Imagen centrada en contenedor fijo
    $(go.Panel, "Auto",
      { width: size, height: size },
      $(go.Picture, {
        width: size,
        height: size,
        alignment: go.Spot.Center,
        imageStretch: go.GraphObject.UniformToFill
      }, new go.Binding("source", "image", proxyImage))
    ),

    // Marco circular encima
    $(go.Shape, "Circle", {
      width: size,
      height: size,
      fill: "transparent",
      stroke: "#cbd5e1",
      strokeWidth: 2
    })
  );
}

/* ======================================================
   PERSON CARD
   ====================================================== */
function personCard(borderColor, roleColor) {
  return $(go.Node, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer"
    },

    $(go.Panel, "Auto",
      { desiredSize: new go.Size(200, 250) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: borderColor,
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical",
        { margin: 12 },

        photoWithCircle(64),

        // Nombre
        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 12px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 3
        }, new go.Binding("text", "name")),

        // Cargo
        $(go.TextBlock, {
          margin: new go.Margin(2, 6, 0, 6),
          font: "11px sans-serif",
          stroke: roleColor,
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2
        }, new go.Binding("text", "role"))
      )
    )
  );
}

/* ======================================================
   NODE TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add(
  "Leader",
  personCard("#2563eb", "#2563eb")
);

diagram.nodeTemplateMap.add(
  "Worker",
  personCard("#e5e7eb", "#475569")
);

// Default
diagram.nodeTemplate = personCard("#e5e7eb", "#475569");

/* ======================================================
   SUPERVISOR GROUP (CLICK TO EXPAND)
   ====================================================== */
diagram.groupTemplate =
  $(go.Group, "Vertical",
    {
      selectable: false,
      selectionAdorned: false,
      cursor: "pointer",

      // Personal: 2 columnas, crecimiento vertical
      layout: $(go.GridLayout, {
        wrappingColumn: 2,
        spacing: new go.Size(20, 20)
      }),

      isSubGraphExpanded: false,

      click: (e, group) => {
        diagram.startTransaction("toggle");
        group.isSubGraphExpanded = !group.isSubGraphExpanded;
        diagram.commitTransaction("toggle");
      }
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    // Card del supervisor
    $(go.Panel, "Auto",
      { desiredSize: new go.Size(200, 250) },

      $(go.Shape, "RoundedRectangle", {
        fill: "white",
        stroke: "#14b8a6",
        strokeWidth: 2
      }),

      $(go.Panel, "Vertical",
        { margin: 12 },

        photoWithCircle(64),

        $(go.TextBlock, {
          margin: new go.Margin(10, 6, 2, 6),
          font: "bold 13px sans-serif",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 3
        }, new go.Binding("text", "name")),

        $(go.TextBlock, {
          margin: new go.Margin(2, 6, 0, 6),
          font: "11px sans-serif",
          stroke: "#0f766e",
          textAlign: "center",
          wrap: go.TextBlock.WrapFit,
          maxLines: 2
        }, new go.Binding("text", "role"))
      )
    ),

    // Workers placeholder
    $(go.Placeholder, { padding: 18 })
  );

/* ======================================================
   LINKS
   ====================================================== */
diagram.linkTemplate =
  $(go.Link,
    { routing: go.Link.Orthogonal, corner: 6 },
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
   BUILD MODEL (LEADER ES ROOT)
   ====================================================== */
function buildModel(rows) {

  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p, i) => p.__id = "P_" + i);

  const nodes = [];
  const links = [];

  // TEAM LEADER (ROOT REAL)
  const leader = people.find(p => !p["SupervisorEmail (required)"]);
  if (!leader) return;

  nodes.push({
    key: leader.__id,
    category: "Leader",
    name: `${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position || "",
    image: leader.ImageURL || ""
  });

  // SUPERVISORES + PERSONAL
  people.forEach(sup => {
    if (sup["SupervisorEmail (required)"] === leader["Email (required)"]) {

      // Supervisor
      nodes.push({
        key: sup.__id,
        isGroup: true,
        name: `${sup["First name (required)"]} ${sup["Last name (required)"]}`,
        role: sup.Position || "",
        image: sup.ImageURL || ""
      });

      links.push({ from: leader.__id, to: sup.__id });

      // Workers
      people.forEach(worker => {
        if (worker["SupervisorEmail (required)"] === sup["Email (required)"]) {
          nodes.push({
            key: worker.__id,
            group: sup.__id,
            category: "Worker",
            name: `${worker["First name (required)"]} ${worker["Last name (required)"]}`,
            role: worker.Position || "",
            image: worker.ImageURL || ""
          });
        }
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes, links);
}
