fetch("team.csv")
  .then(r => r.text())
  .then(text => d3.csvParse(text))
  .then(data => buildOrg(data));

function buildOrg(data) {

  /* =============================
     1. Detectar columnas
     ============================= */
  const headers = Object.keys(data[0]);
  const col = {
    name: pick(headers, ["name", "nombre"]),
    role: pick(headers, ["title", "cargo", "role"]),
    supervisor: pick(headers, ["supervisor", "manager"]),
    image: pick(headers, ["image", "photo"])
  };

  /* =============================
     2. Normalizar personas
     ============================= */
  const people = data.map(d => ({
    name: (d[col.name] || "").trim(),
    role: (d[col.role] || "").trim(),
    supervisor: (d[col.supervisor] || "").trim(),
    image: d[col.image] || ""
  })).filter(p => p.name);

  /* =============================
     3. Detectar JEFE (Team Leader)
     ============================= */
  let leader = people.find(p => !p.supervisor);

  if (!leader) {
    leader = people.find(p =>
      /team\s*leader|leader|jefe/i.test(p.role)
    );
  }

  if (!leader) {
    alert("No se pudo detectar el jefe");
    return;
  }

  /* =============================
     4. Supervisores directos
     ============================= */
  const supervisors = people.filter(p =>
    p.supervisor === leader.name
  );

  /* =============================
     5. Personal por supervisor
     ============================= */
  const staffBySupervisor = {};
  supervisors.forEach(s => {
    staffBySupervisor[s.name] = people.filter(p =>
      p.supervisor === s.name
    );
  });

  /* =============================
     6. Render DOM
     ============================= */
  const root = d3.select("#org-root").html("");

  // NIVEL 0 — EMR TEAM
  const lvl0 = root.append("div").classed("column", true);
  const emrNode = createNode(lvl0, {
    name: "EMR TEAM",
    role: ""
  });

  // NIVEL 1 — JEFE
  const lvl1 = root.append("div").classed("level", true);
  const leaderNode = createNode(lvl1, leader);

  // NIVEL 2 — SUPERVISORES
  const lvl2 = root.append("div").classed("level", true);

  const supCols = lvl2.selectAll(".column")
    .data(supervisors)
    .enter()
    .append("div")
    .classed("column", true);

  supCols.each(function (sup) {
    const col = d3.select(this);
    const supNode = createNode(col, sup);

    // NIVEL 3 — PERSONAL
    const lvl3 = col.append("div").classed("level", true);

    (staffBySupervisor[sup.name] || []).forEach(p =>
      createNode(lvl3, p)
    );

    // TOGGLE PERSONAL
    supNode.on("click", () => {
      lvl3.classed("show", !lvl3.classed("show"));
    });
  });

  /* =============================
     7. TOGGLES REALES
     ============================= */
  emrNode.on("click", () => {
    lvl1.classed("show", !lvl1.classed("show"));
    lvl2.classed("show", false);
  });

  leaderNode.on("click", () => {
    lvl2.classed("show", !lvl2.classed("show"));
  });
}

/* =============================
   Helpers
   ============================= */

function createNode(parent, d) {
  const node = parent.append("div").classed("node", true);

  if (d.image) {
    node.append("img").attr("src", d.image);
  }

  node.append("div").classed("name", true).text(d.name);
  node.append("div").classed("role", true).text(d.role);

  return node;
}

function pick(headers, keys) {
  return headers.find(h =>
    keys.some(k => h.toLowerCase().includes(k))
  );
}
