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
  "undoManager.isEnabled": false
});

/* ======================================================
   HELPERS
   ====================================================== */
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

function goToNodeByKey(k){
  const n = diagram.findNodeForKey(k);
  if(n) diagram.centerRect(n.actualBounds);
}

function showOnlyRoot(rootKey){
  diagram.startTransaction("view");
  diagram.nodes.each(n=>{
    let v=false;
    if(n.key===rootKey) v=true;
    else if(n.data.group===rootKey) v=true;
    else if(n.containingGroup && n.containingGroup.key===rootKey) v=true;
    n.visible=v;
  });
  diagram.commitTransaction("view");
  setTimeout(()=>goToNodeByKey(rootKey),80);
}

/* ======================================================
   CARD BASE
   ====================================================== */
function card(stroke, showCount=true){
  return $(go.Panel,"Auto",
    $(go.Shape,"RoundedRectangle",{fill:"white",stroke,strokeWidth:2}),
    $(go.Panel,"Vertical",{margin:10},
      $(go.TextBlock,{font:"bold 13px sans-serif"},
        new go.Binding("text","name")),
      $(go.TextBlock,{font:"11px sans-serif",stroke:"#475569"},
        new go.Binding("text","role")),
      showCount
        ? $(go.TextBlock,{font:"10px sans-serif",stroke:"#64748b",margin:new go.Margin(6,0,0,0)},
            new go.Binding("text","count",c=>`👤 ${c||0}`))
        : $(go.Panel)
    )
  );
}

/* ======================================================
   TEAM TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader",
  $(go.Node,"Auto",card("#2563eb"))
);

diagram.nodeTemplateMap.add("Worker",
  $(go.Node,"Auto",card("#e5e7eb",false))
);

diagram.groupTemplateMap.add("Supervisor",
  $(go.Group,"Vertical",
    {
      isSubGraphExpanded:false,
      layout:$(go.TreeLayout,{angle:90,nodeSpacing:16,layerSpacing:30})
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),
    $(go.Panel,"Auto",{cursor:"pointer",click:(e,p)=>{
      diagram.startTransaction("t");
      p.part.isSubGraphExpanded=!p.part.isSubGraphExpanded;
      diagram.commitTransaction("t");
    }},card("#14b8a6")),
    $(go.Placeholder,{padding:14})
  )
);

diagram.groupTemplateMap.add("EMR_ROOT",
  $(go.Group,"Auto",
    { layout:$(go.TreeLayout,{angle:90,nodeSpacing:30,layerSpacing:90}) },
    $(go.Placeholder,{padding:20})
  )
);

/* ======================================================
   VENDORS TEMPLATES (CON LÍNEAS, SIN IMÁGENES)
   ====================================================== */
diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group,"Auto",
    { layout:$(go.TreeLayout,{angle:90,nodeSpacing:30,layerSpacing:70}) },
    $(go.Placeholder,{padding:20})
  )
);

diagram.groupTemplateMap.add("VendorDept",
  $(go.Group,"Vertical",
    {
      isSubGraphExpanded:false,
      layout:$(go.TreeLayout,{angle:90,nodeSpacing:14,layerSpacing:24})
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),
    $(go.Panel,"Auto",{cursor:"pointer",click:(e,p)=>{
      diagram.startTransaction("t");
      p.part.isSubGraphExpanded=!p.part.isSubGraphExpanded;
      diagram.commitTransaction("t");
    }},card("#7c3aed")),
    $(go.Placeholder,{padding:12})
  )
);

diagram.nodeTemplateMap.add("VendorCompany",
  $(go.Node,"Auto",card("#e5e7eb",false))
);

/* ======================================================
   BUILD TEAM
   ====================================================== */
function buildTeam(rows){
  const people=rows.filter(r=>r["First name (required)"]);
  people.forEach((p,i)=>p.__id="T_"+i);

  const nodes=[],links=[];
  const leader=people.find(p=>!p["SupervisorEmail (required)"]);
  if(!leader) return;

  nodes.push({key:"EMR_ROOT",isGroup:true,category:"EMR_ROOT"});

  nodes.push({
    key:leader.__id,category:"Leader",group:"EMR_ROOT",
    name:`${leader["First name (required)"]} ${leader["Last name (required)"]}`,
    role:leader.Position||"",count:people.length-1
  });

  people.forEach(s=>{
    if(s["SupervisorEmail (required)"]===leader["Email (required)"]){
      const workers=people.filter(w=>w["SupervisorEmail (required)"]===s["Email (required)"]);
      nodes.push({
        key:s.__id,isGroup:true,category:"Supervisor",group:"EMR_ROOT",
        name:`${s["First name (required)"]} ${s["Last name (required)"]}`,
        role:s.Position||"",count:workers.length
      });
      links.push({from:leader.__id,to:s.__id});
      workers.forEach(w=>{
        nodes.push({
          key:w.__id,category:"Worker",group:s.__id,
          name:`${w["First name (required)"]} ${w["Last name (required)"]}`,
          role:w.Position||""
        });
        links.push({from:s.__id,to:w.__id});
      });
    }
  });

  diagram.model=new go.GraphLinksModel(nodes,links);
}

/* ======================================================
   BUILD VENDORS
   ====================================================== */
function buildVendors(rows){
  const m=diagram.model;

  m.addNodeData({
    key:"VENDORS_ROOT",isGroup:true,category:"VendorRoot",
    name:"Vendors",count:rows.length
  });

  const d={};
  rows.forEach(v=>{
    if(!d[v.Department]) d[v.Department]=[];
    d[v.Department].push(v);
  });

  Object.entries(d).forEach(([dept,list],i)=>{
    const dk="VD_"+i;
    m.addNodeData({
      key:dk,isGroup:true,category:"VendorDept",
      group:"VENDORS_ROOT",name:dept,count:list.length
    });
    m.addLinkData({from:"VENDORS_ROOT",to:dk});
    list.forEach((v,j)=>{
      const vk=`${dk}_${j}`;
      m.addNodeData({
        key:vk,category:"VendorCompany",group:dk,
        name:`${v["First name (required)"]} ${v["Last name (required)"]}`,
        role:v.Position||""
      });
      m.addLinkData({from:dk,to:vk});
    });
  });
}

/* ======================================================
   LOAD
   ====================================================== */
Papa.parse("team.csv",{download:true,header:true,complete:r=>{
  buildTeam(r.data);
  Papa.parse("vendors.csv",{download:true,header:true,complete:v=>{
    buildVendors(v.data);
    showOnlyRoot("EMR_ROOT");
  }});
}});

/* ======================================================
   CONTROLS
   ====================================================== */
const bt = id => document.getElementById(id);

if(bt("btnTeams")) bt("btnTeams").onclick=()=>showOnlyRoot("EMR_ROOT");
if(bt("btnVendorsDept")) bt("btnVendorsDept").onclick=()=>showOnlyRoot("VENDORS_ROOT");
if(bt("btnZoomIn")) bt("btnZoomIn").onclick=()=>diagram.scale=clamp(diagram.scale*1.12,diagram.minScale,diagram.maxScale);
if(bt("btnZoomOut")) bt("btnZoomOut").onclick=()=>diagram.scale=clamp(diagram.scale/1.12,diagram.minScale,diagram.maxScale);
if(bt("btnFit")) bt("btnFit").onclick=()=>diagram.zoomToFit();
if(bt("btnFull")) bt("btnFull").onclick=()=>{
  document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  setTimeout(()=>diagram.zoomToFit(),300);
};
