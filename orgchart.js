fetch("team.csv")
  .then(r => r.text())
  .then(text => d3.csvParse(text))
  .then(data => buildOrg(data));

function buildOrg(data) {

  // === detectar columnas ===
  const headers = Object.keys(data[0]);
  const col = {
    name: pick(headers, ["name", "nombre"]),
    role: pick(headers, ["title", "cargo", "role"]),
    supervisor: pick(headers, ["supervisor", "manager"]),
    image: pick(headers, ["image", "photo"])
  };

  // === nodos base ===
  const people = data.map(d => ({
    name: d[col.name].trim(),
    role: d[col.role] || "",
    supervisor: (d[col.supervisor] || "").trim(),
    image: d[col.image] || ""
  }));

  // === TEAM LEADER ===
  const leader = people.find(p =>
    /team leader|leader/i.test(p.role)
  );

  if (!leader) {
    alert("No se encontró Team Leader");
    return;
  }

  // === supervisores ===
  const supervisors = people.filter(p =>
    p.supervisor === leader.name
  );

  // === personal por supervisor ===
  const staffBySupervisor = {};
  supervisors.forEach(s => {
    staffBySupervisor[s.name] = people.filter(p =>
      p.supervisor === s.name
    );
  });

  // === render ===
  const root = d3.select("#org-root");

  // NIVEL 0 — EMR TEAM
  const lvl0 = root.append("div").classed("column", true);
  const emr = createNode(lvl0, {
    name: "EMR TEAM",
    role: ""
  });

  // NIVEL 1 — TEAM LEADER
  const lvl1 = root.append("div").classed("level", true);
  const leaderNode = createNode(lvl1, leader);

  // NIVEL 2 — SUPERVISORES
  const lvl2 = root.append("div").classed("level", true);
  const supNodes = lvl2.selectAll(".column")
    .data(supervisors)
    .enter()
    .append("div")
    .classed("column", true);

  supNodes.each(function (d) {
    const col = d3.select(this);
    const supNode = createNode(col, d);

    // NIVEL 3 — PERSONAL (por supervisor)
    const lvl3 = col.append("div").classed("level", true);

    createNodes(lvl3, staffBySupervisor[d.name]);

    supNode.on("click", () => {
      lvl3.classed("show", !lvl3.classed("show"));
    });
  });

  // === interacciones ===
  emr.on("click", () => lvl1.classed("show", true));
  leaderNode.on("click", () => lvl2.classed("show", true));
}

/* ===== helpers ===== */

function createNode(parent, d) {
  const node = parent.append("div").classed("node", true);

  if (d.image) {
    node.append("img").attr("src", d.image);
  }

  node.append("div").classed("name", true).text(d.name);
  node.append("div").classed("role", true).text(d.role);

  return node;
}

function createNodes(parent, list) {
  if (!list) return;
  list.forEach(d => createNode(parent, d));
}

function pick(headers, keys) {
  return headers.find(h =>
    keys.some(k => h.toLowerCase().includes(k))
  );
}
