const width = 2200;
const dx = 120;
const dy = 260;

const tree = d3.tree().nodeSize([dx, dy]);
const diagonal = d3.linkVertical().x(d => d.x).y(d => d.y);

fetch("team.csv")
  .then(r => r.text())
  .then(parseCSV)
  .then(buildChart);

function parseCSV(text) {
  return d3.csvParse(text);
}

function buildChart(data) {
  const map = new Map();
  data.forEach(d => map.set(d.Email, { ...d, children: [] }));

  let rootData = null;

  data.forEach(d => {
    if (d.SupervisorEmail) {
      map.get(d.SupervisorEmail)?.children.push(map.get(d.Email));
    } else {
      rootData = map.get(d.Email);
    }
  });

  const root = d3.hierarchy(rootData, d => d.children);
  root.x0 = 0;
  root.y0 = 0;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-width / 2, -50, width, 1000]);

  const g = svg.append("g");

  update(root);

  function update(source) {
    const nodes = root.descendants();
    const links = root.links();

    tree(root);

    const transition = svg.transition().duration(400);

    /** LINKS **/
    g.selectAll(".link")
      .data(links, d => d.target.data.Email)
      .join(
        enter => enter.append("path")
          .attr("class", "link")
          .attr("d", d => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
          })
          .transition(transition)
          .attr("d", diagonal),
        update => update.transition(transition).attr("d", diagonal),
        exit => exit.transition(transition).remove()
      );

    /** NODES **/
    const node = g.selectAll(".node")
      .data(nodes, d => d.data.Email);

    const nodeEnter = node.enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${source.x0},${source.y0})`)
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
      .text(d => d.children || d._children ? `👤 ${count(d)}` : "");

    node.merge(nodeEnter)
      .transition(transition)
      .attr("transform", d => `translate(${d.x},${d.y})`);

    node.exit()
      .transition(transition)
      .remove();

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
    d.each(c => n++);
    return n - 1;
  }
}
