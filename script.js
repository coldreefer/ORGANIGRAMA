const WIDTH = 2200;
const DX = 120;
const DY = 260;

const treeLayout = d3.tree().nodeSize([DX, DY]);
const diagonal = d3.linkVertical()
  .x(d => d.x)
  .y(d => d.y);

fetch("./team.csv")
  .then(res => {
    if (!res.ok) throw new Error("No se pudo cargar team.csv");
    return res.text();
  })
  .then(text => {
    // eliminar BOM si existe
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    return d3.csvParse(text);
  })
  .then(buildChart)
  .catch(err => {
    console.error(err);
    document.getElementById("chart").innerHTML =
      "<p style='color:red'>Error cargando organigrama</p>";
  });

function buildChart(data) {
  if (!data || data.length === 0) {
    throw new Error("CSV vacío");
  }

  // Normalizar datos
  data.forEach(d => {
    d.Email = d.Email?.trim();
    d.SupervisorEmail = d.SupervisorEmail?.trim();
  });

  // Mapas
  const map = new Map();
  const supervisors = new Set();

  data.forEach(d => {
    map.set(d.Email, { ...d, children: [] });
    if (d.SupervisorEmail) supervisors.add(d.SupervisorEmail);
  });

  // Detectar raíz REAL
  const rootCandidates = [...map.keys()].filter(
    email => !supervisors.has(email)
  );

  if (rootCandidates.length === 0) {
    throw new Error("No se encontró raíz (estructura cíclica o datos inválidos)");
  }

  const rootEmail = rootCandidates[0];
  const rootData = map.get(rootEmail);

  // Construir jerarquía
  map.forEach(p => {
    if (p.SupervisorEmail && map.has(p.SupervisorEmail)) {
      map.get(p.SupervisorEmail).children.push(p);
    }
  });

  const root = d3.hierarchy(rootData);
  root.x0 = 0;
  root.y0 = 0;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-WIDTH / 2, -50, WIDTH, 1200]);

  const g = svg.append("g");

  update(root);

  function update(source) {
    treeLayout(root);

    const nodes = root.descendants();
    const links = root.links();

    const t = svg.transition().duration(400);

    // LINKS
    g.selectAll(".link")
      .data(links, d => d.target.data.Email)
      .join(
        enter => enter.append("path")
          .attr("class", "link")
          .attr("d", () => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
          })
          .transition(t)
          .attr("d", diagonal),
        update => update.transition(t).attr("d", diagonal),
        exit => exit.transition(t).remove()
      );

    // NODES
    const node = g.selectAll(".node")
      .data(nodes, d => d.data.Email);

    const nodeEnter = node.enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", `translate(${source.x0},${source.y0})`)
      .on("click", (e, d) => toggle(d));

    nodeEnter.append("rect")
      .attr("x", -80)
      .attr("y", -40)
      .attr("width", 160)
      .attr("height", 80);

    nodeEnter.append("image")
      .attr("x", -18)
      .attr("y", -32)
      .attr("width", 36)
      .attr("height", 36)
      .attr("href", d => d.data.ImageURL || "https://via.placeholder.com/80");

    nodeEnter.append("text")
      .attr("class", "name")
      .attr("y", 15)
      .text(d => `${d.data["First name"]} ${d.data["Last name"]}`);

    nodeEnter.append("text")
      .attr("class", "role")
      .attr("y", 32)
      .text(d => d.data.Position);

    nodeEnter.append("text")
      .attr("class", "count")
      .attr("y", 55)
      .text(d => (d.children || d._children) ? `👤 ${count(d)}` : "");

    node.merge(nodeEnter)
      .transition(t)
      .attr("transform", d => `translate(${d.x},${d.y})`);

    node.exit().transition(t).remove();

    nodes.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  function toggle(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    update(d);
  }

  function count(d) {
    let n = 0;
    d.each(() => n++);
    return n - 1;
  }
}
