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

  const headers = Object.keys(data[0]).map(h => h.toLowerCase());

  // 🔍 detección automática de columnas
  const col = {
    firstName: find(headers, ["first", "nombre"]),
    lastName: find(headers, ["last", "apellido"]),
    position: find(headers, ["position", "cargo", "role"]),
    email: find(headers, ["email", "mail"]),
    supervisor: find(headers, ["supervisor", "manager", "reports"]),
    image: find(headers, ["image", "photo", "picture"])
  };

  function val(row, key) {
    const h = headers.indexOf(col[key]);
    return h >= 0 ? row[Object.keys(row)[h]]?.trim() : "";
  }

  // Normalizar personas
  const people = data.map(d => ({
    id: val(d, "email") || crypto.randomUUID(),
    name: `${val(d, "firstName")} ${val(d, "lastName")}`.trim() || "Sin nombre",
    role: val(d, "position") || "",
    supervisor: val(d, "supervisor"),
    image: val(d, "image"),
    children: []
  }));

  // Mapas
  const map = new Map();
  const supervisors = new Set();

  people.forEach(p => {
    map.set(p.id, p);
    if (p.supervisor) supervisors.add(p.supervisor);
  });

  // Root = quien no aparece como subordinado
  const rootId = [...map.keys()].find(id => !supervisors.has(id));
  if (!rootId) throw new Error("No se pudo detectar raíz");

  // Construir árbol
  people.forEach(p => {
    if (p.supervisor && map.has(p.supervisor)) {
      map.get(p.supervisor).children.push(p);
    }
  });

  const root = d3.hierarchy(map.get(rootId));
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

    // Links
    g.selectAll(".link")
      .data(links, d => d.target.data.id)
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

    // Nodes
    const node = g.selectAll(".node")
      .data(nodes, d => d.data.id);

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

    nodeEnter.append("circle")
      .attr("cy", -20)
      .attr("r", 18)
      .attr("fill", "#cbd5e1");

    nodeEnter.append("text")
      .attr("class", "name")
      .attr("y", 15)
      .text(d => d.data.name);

    nodeEnter.append("text")
      .attr("class", "role")
      .attr("y", 32)
      .text(d => d.data.role);

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
}

// util
function find(headers, keywords) {
  return headers.find(h => keywords.some(k => h.includes(k))) || "";
}
