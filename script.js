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
   CARD BASE (CUADRADA)
   ====================================================== */
function cardBase({ stroke="#cbd5e1", expandable=false }){
  return $(go.Panel,"Auto",
    $(go.Shape,"RoundedRectangle",{fill:"white",stroke,strokeWidth:2}),
    $(go.Panel,"Vertical",{margin:10},

      $(go.Panel,"Horizontal",
        $(go.Picture,{
          width:36,height:36,
          margin:new go.Margin(0,8,0,0),
          imageStretch:go.GraphObject.UniformToFill
        }, new go.Binding("source","image")),

        $(go.Panel,"Vertical",
          $(go.TextBlock,{font:"bold 13px sans-serif"},
            new go.Binding("text","name")),
          $(go.TextBlock,{font:"11px sans-serif",stroke:"#475569"},
            new go.Binding("text","role"))
        )
      ),

      $(go.Panel,"Horizontal",
        { margin:new go.Margin(6,0,0,0) },
        $(go.TextBlock,{font:"10px sans-serif",stroke:"#64748b"},
          new go.Binding("text","count",c=>`👤 ${c||0}`)),
        expandable
          ? $(go.TextBlock,{
              margin:new go.Margin(0,0,0,10),
              font:"10px sans-serif",
              stroke:"#64748b",
              cursor:"pointer"
            }, new go.Binding("text","isSubGraphExpanded",e=>e?"⌃":"⌄").ofObject())
          : $(go.Panel)
      )
    )
  );
}

/* ======================================================
   TEAM TEMPLATES
   ====================================================== */
diagram.nodeTemplateMap.add("Leader",
  $(go.Node,"Auto", cardBase({stroke:"#2563eb"}))
);

diagram.nodeTemplateMap.add("Worker",
  $(go.Node,"Auto", cardBase({stroke:"#e5e7eb"}))
);

diagram.groupTemplateMap.add("Supervisor",
  $(go.Group,"Vertical",
    {
      isSubGraphExpanded:false,
      layout:$(go.GridLayout,{wrappingColumn:3,spacing:new go.Size(16,16)})
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),
    $(go.Panel,"Auto",{click:(e,p)=>{
      diagram.startTransaction("t");
      p.part.isSubGraphExpanded=!p.part.isSubGraphExpanded;
      diagram.commitTransaction("t");
    }}, cardBase({stroke:"#14b8a6",expandable:true})),
    $(go.Placeholder,{padding:14})
  )
);

diagram.groupTemplateMap.add("EMR_ROOT",
  $(go.Group,"Auto",
    { layout:$(go.TreeLayout,{angle:90,nodeSpacing:28,layerSpacing:80}) },
    $(go.Placeholder,{padding:20})
  )
);

/* ======================================================
   VENDORS TEMPLATES
   ====================================================== */
diagram.groupTemplateMap.add("VendorRoot",
  $(go.Group,"Vertical",
    { layout:$(go.GridLayout,{wrappingColumn:4,spacing:new go.Size(30,30)}) },
    $(go.Panel,"Auto",cardBase({stroke:"#7c3aed"})),
    $(go.Placeholder,{padding:20})
  )
);

diagram.groupTemplateMap.add("VendorDept",
  $(go.Group,"Vertical",
    {
      isSubGraphExpanded:false,
      layout:$(go.GridLayout,{wrappingColumn:2,spacing:new go.Size(12,12)})
    },
    new go.Binding("isSubGraphExpanded").makeTwoWay(),
    $(go.Panel,"Auto",{click:(e,p)=>{
      diagram.startTransaction("t");
      p.part.isSubGraphExpanded=!p.part.isSubGraphExpanded;
      diagram.commitTransaction("t");
    }}, cardBase({stroke:"#7c3aed",expandable:true})),
    $(go.Placeholder,{padding:12})
  )
);

diagram.nodeTemplateMap.add("VendorCompany",
  $(go.Node,"Auto", cardBase({stroke:"#e5e7eb"}))
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
    role:leader.Position||"", image:leader.ImageURL||"", count:people.length-1
  });

  people.forEach(s=>{
    if(s["SupervisorEmail (required)"]===leader["Email (required)"]){
      const workers=people.filter(w=>w["SupervisorEmail (required)"]===s["Email (required)"]);
      nodes.push({
        key:s.__id,isGroup:true,category:"Supervisor",group:"EMR_ROOT",
        name:`${s["First name (required)"]} ${s["Last name (required)"]}`,
        role:s.Position||"", image:s.ImageURL||"", count:workers.length
      });
      links.push({from:leader.__id,to:s.__id});
      workers.forEach(w=>{
        nodes.push({
          key:w.__id,category:"Worker",group:s.__id,
          name:`${w["First name (required)"]} ${w["Last name (required)"]}`,
          role:w.Position||"", image:w.ImageURL||""
        });
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
  m.addNodeData({key:"VENDORS_ROOT",isGroup:true,category:"VendorRoot",name:"Vendors",count:rows.length});

  const d={};
  rows.forEach(v=>{ if(!d[v.Department]) d[v.Department]=[]; d[v.Department].push(v); });

  Object.entries(d).forEach(([dept,list],i)=>{
    const dk=`VD_${i}`;
    m.addNodeData({key:dk,isGroup:true,group:"VENDORS_ROOT",category:"VendorDept",name:dept,count:list.length});
    list.forEach((v,j)=>{
      m.addNodeData({
        key:`${dk}_${j}`,group:dk,category:"VendorCompany",
        name:`${v["First name (required)"]} ${v["Last name (required)"]}`,
        role:v.Position||"", image:v.ImageURL||""
      });
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
document.getElementById("btnTeams")?.onclick=()=>showOnlyRoot("EMR_ROOT");
document.getElementById("btnVendorsDept")?.onclick=()=>showOnlyRoot("VENDORS_ROOT");
document.getElementById("btnZoomIn")?.onclick=()=>diagram.scale=clamp(diagram.scale*1.12,diagram.minScale,diagram.maxScale);
document.getElementById("btnZoomOut")?.onclick=()=>diagram.scale=clamp(diagram.scale/1.12,diagram.minScale,diagram.maxScale);
document.getElementById("btnFit")?.onclick=()=>diagram.zoomToFit();
document.getElementById("btnFull")?.onclick=()=>{
  document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  setTimeout(()=>diagram.zoomToFit(),300);
};
