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
   DIAGRAM (BASE TUYA – NO TOCADA)
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

  layout: $(go.TreeLayout, {
    angle: 90,
    alignment: go.TreeLayout.AlignmentCenterChildren,
    nodeSpacing: 26,
    layerSpacing: 70
  }),

  "undoManager.isEnabled": false
});

/* ======================================================
   CONTROLES UI (BASE TUYA)
   ====================================================== */
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

btnZoomIn.onclick = () => diagram.scale = clamp(diagram.scale * 1.12, diagram.minScale, diagram.maxScale);
btnZoomOut.onclick = () => diagram.scale = clamp(diagram.scale / 1.12, diagram.minScale, diagram.maxScale);
btnFit.onclick = () => diagram.zoomToFit();
btnFull.onclick = async () => {
  const el = diagramWrapper;
  if (!document.fullscreenElement) await el.requestFullscreen();
  else await document.exitFullscreen();
};

/* ======================================================
   IMAGE RESOLVE (BASE TUYA)
   ====================================================== */
function resolveImage(url) {
  if (!url || String(url).trim() === "") return DEFAULT_AVATAR;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url);
}

/* ======================================================
   FOTO (BASE TUYA)
   ====================================================== */
function photo(size, strokeColor) {
  return $(go.Panel, "Auto",
    { width: size, height: size },
    $(go.Shape, "RoundedRectangle", {
      fill: "white", stroke: strokeColor, strokeWidth: 2, parameter1: 6
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
   A CARGO (BASE TUYA)
   ====================================================== */
function countLine() {
  return $(go.TextBlock,
    { font: "10px sans-serif", stroke: "#64748b", margin: new go.Margin(6,0,0,0) },
    new go.Binding("visible", "teamCount", n => Number(n||0) > 0),
    new go.Binding("text", "teamCount", n => `A cargo: ${n}`)
  );
}

/* ======================================================
   PERSON CARD (BASE TUYA)
   ====================================================== */
function personCard(border, roleColor, photoBorder) {
  return $(go.Node, "Vertical",
    { selectable: false },
    $(go.Panel, "Auto", { desiredSize: new go.Size(210, 265) },
      $(go.Shape, "RoundedRectangle", { fill: "white", stroke: border, strokeWidth: 2 }),
      $(go.Panel, "Vertical", { margin: 12 },
        photo(64, photoBorder),
        $(go.TextBlock, { font: "bold 12.5px sans-serif", textAlign: "center" },
          new go.Binding("text", "name")),
        $(go.TextBlock, { font: "11.5px sans-serif", stroke: roleColor, textAlign: "center" },
          new go.Binding("text", "role")),
        countLine()
      )
    )
  );
}

diagram.nodeTemplateMap.add("Leader", personCard("#2563eb", "#2563eb", "#2563eb"));
diagram.nodeTemplateMap.add("Worker", personCard("#e5e7eb", "#475569", "#94a3b8"));
diagram.nodeTemplate = personCard("#e5e7eb", "#475569", "#94a3b8");

/* ======================================================
   SUPERVISOR GROUP (BASE TUYA)
   ====================================================== */
diagram.groupTemplate =
$(go.Group, "Vertical",
  {
    selectable: false,
    isSubGraphExpanded: false,
    layout: $(go.GridLayout, { wrappingColumn: 2, spacing: new go.Size(20,20) })
  },
  new go.Binding("isSubGraphExpanded").makeTwoWay(),

  $(go.Panel, "Auto",
    {
      isActionable: true,
      cursor: "pointer",
      click: (e,p) => {
        diagram.startTransaction("toggle");
        p.part.isSubGraphExpanded = !p.part.isSubGraphExpanded;
        diagram.commitTransaction("toggle");
      }
    },
    $(go.Shape, "RoundedRectangle", { fill: "white", stroke: "#14b8a6", strokeWidth: 2 }),
    $(go.Panel, "Vertical", { margin: 12 },
      photo(64, "#14b8a6"),
      $(go.TextBlock, { font: "bold 13px sans-serif", textAlign: "center" },
        new go.Binding("text", "name")),
      $(go.TextBlock, { font: "11.5px sans-serif", stroke: "#0f766e", textAlign: "center" },
        new go.Binding("text", "role")),
      countLine(),
      $(go.TextBlock, { font: "10px sans-serif", stroke: "#64748b" },
        new go.Binding("text", "isSubGraphExpanded", e => e ? "▲" : "▼").ofObject())
    )
  ),
  $(go.Placeholder, { padding: 18 })
);

/* ======================================================
   LINKS (BASE TUYA)
   ====================================================== */
diagram.linkTemplate =
$(go.Link, { routing: go.Link.Orthogonal, corner: 8 },
  $(go.Shape, { stroke: "#cbd5e1", strokeWidth: 1.4 })
);

/* ======================================================
   LOAD TEAM CSV (BASE TUYA)
   ====================================================== */
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => buildModel(res.data)
});

/* ======================================================
   BUILD TEAM MODEL (BASE TUYA)
   ====================================================== */
function buildModel(rows) {
  const people = rows.filter(r => r["First name (required)"]);
  people.forEach((p,i)=>p.__id="P_"+i);

  const nodes=[], links=[];
  const leader = people.find(p=>!p["SupervisorEmail (required)"]);
  if(!leader) return;

  nodes.push({
    key: leader.__id,
    category:"Leader",
    name:`${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role: leader.Position||"",
    image: leader.ImageURL||"",
    teamCount: people.length-1
  });

  const leaderEmail = leader["Email (required)"];

  people.forEach(sup=>{
    if(sup["SupervisorEmail (required)"]===leaderEmail){
      const workers = people.filter(w=>w["SupervisorEmail (required)"]===sup["Email (required)"]);
      nodes.push({
        key:sup.__id,isGroup:true,
        name:`${sup["First name (required)"]} ${sup["Last name (required)"]}`,
        role:sup.Position||"",
        image:sup.ImageURL||"",
        teamCount: workers.length
      });
      links.push({from:leader.__id,to:sup.__id});
      workers.forEach(w=>{
        nodes.push({
          key:w.__id,group:sup.__id,category:"Worker",
          name:`${w["First name (required)"]} ${w["Last name (required)"]}`,
          role:w.Position||"",image:w.ImageURL||"",teamCount:0
        });
      });
    }
  });

  diagram.model = new go.GraphLinksModel(nodes,links);
  setTimeout(()=>diagram.zoomToFit(),50);
}

/* ======================================================
   ================= VENDORS ============================
   ====================================================== */

/* === Vendor Card === */
diagram.nodeTemplateMap.add("Vendor",
  $(go.Node,"Vertical",{selectable:false},
    $(go.Panel,"Auto",{desiredSize:new go.Size(190,230)},
      $(go.Shape,"RoundedRectangle",{fill:"white",stroke:"#cbd5e1",strokeWidth:1.5}),
      $(go.Panel,"Vertical",{margin:10},
        photo(56,"#94a3b8"),
        $(go.TextBlock,{font:"bold 11.5px sans-serif",textAlign:"center"},
          new go.Binding("text","name")),
        $(go.TextBlock,{font:"10.5px sans-serif",stroke:"#64748b",textAlign:"center"},
          new go.Binding("text","role"))
      )
    )
  )
);

/* === Vendor Department === */
diagram.groupTemplateMap.add("VendorDepartment",
  $(go.Group,"Vertical",
    {
      selectable:false,
      isSubGraphExpanded:true,
      layout:$(go.GridLayout,{wrappingColumn:2,spacing:new go.Size(18,18)})
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),

    $(go.Panel,"Auto",
      {
        isActionable:true,
        cursor:"pointer",
        click:(e,p)=>{
          diagram.startTransaction("toggleVendor");
          p.part.isSubGraphExpanded=!p.part.isSubGraphExpanded;
          diagram.commitTransaction("toggleVendor");
        }
      },
      $(go.Shape,"RoundedRectangle",{fill:"#f1f5f9",stroke:"#94a3b8",strokeWidth:2}),
      $(go.Panel,"Horizontal",{margin:10},
        $(go.TextBlock,{font:"bold 13px sans-serif"},
          new go.Binding("text","department")),
        $(go.TextBlock,{margin:new go.Margin(0,0,0,8)},
          new go.Binding("text","isSubGraphExpanded",e=>e?"▲":"▼").ofObject())
      )
    ),
    $(go.Placeholder,{padding:14})
  )
);

/* === Load Vendors CSV === */
Papa.parse("vendors.csv",{
  download:true,
  header:true,
  delimiter:";",
  skipEmptyLines:true,
  complete: res => buildVendors(res.data)
});

/* === Build Vendors === */
function buildVendors(rows){
  const vendors = rows.filter(r=>r["First name (required)"]);
  if(!vendors.length) return;

  const model = diagram.model;
  let x=1500, y=0;
  const depts={};

  vendors.forEach((v,i)=>{
    const d=v.Department||"Otros";
    if(!depts[d]) depts[d]=[];
    depts[d].push({...v,__id:"V_"+i});
  });

  Object.entries(depts).forEach(([dept,list],i)=>{
    const gKey="VD_"+i;
    model.addNodeData({
      key:gKey,isGroup:true,category:"VendorDepartment",
      department:dept,location:new go.Point(x,y)
    });
    list.forEach(v=>{
      model.addNodeData({
        key:v.__id,category:"Vendor",group:gKey,
        name:`${v["First name (required)"]} ${v["Last name (required)"]||""}`,
        role:v.SubDepartment||"",
        image:v.ImageURL||""
      });
    });
    y+=360;
  });
}
