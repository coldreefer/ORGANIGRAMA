fetch("./team.csv")
  .then(res => {
    if (!res.ok) throw new Error("No se pudo cargar team.csv");
    return res.text();
  })
  .then(text => {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    return d3.csvParse(text);
  })
  .then(initChart)
  .catch(err => console.error(err));

function initChart(data) {

  // 🔎 detectar columnas automáticamente
  const headers = Object.keys(data[0]).map(h => h.toLowerCase());
  const col = {
    id: detect(headers, ["email", "mail"]),
    parent: detect(headers, ["supervisor", "manager", "reports"]),
    first: detect(headers, ["first", "nombre"]),
    last: detect(headers, ["last", "apellido"]),
    role: detect(headers, ["position", "cargo", "role"]),
    image: detect(headers, ["image", "photo", "picture"])
  };

  // Normalizar dataset para d3-org-chart
  const nodes = data.map((d, i) => ({
    id: d[col.id] || `node-${i}`,
    parentId: d[col.parent] || null,
    name: `${d[col.first] || ""} ${d[col.last] || ""}`.trim(),
    role: d[col.role] || "",
    image: d[col.image] || "",
  }));

  const chart = new d3.OrgChart()
    .container("#chart-container")
    .data(nodes)
    .nodeWidth(() => 190)
    .nodeHeight(() => 120)
    .childrenMargin(() => 40)
    .compactMarginBetween(() => 25)
    .compactMarginPair(() => 60)
    .nodeContent(d => {
      const count = d.descendants().length - 1;

      return `
        <div class="org-card">
          <img src="${d.data.image || ""}" onerror="this.style.display='none'"/>
          <div class="org-name">${d.data.name || "Sin nombre"}</div>
          <div class="org-role">${d.data.role || ""}</div>
          ${count > 0 ? `<div class="org-count">👤 ${count}</div>` : ""}
        </div>
      `;
    })
    .onNodeClick(d => {
      d.children ? chart.collapse(d.id) : chart.expand(d.id);
    });

  chart.render();
}

// util
function detect(headers, keys) {
  return headers.find(h => keys.some(k => h.includes(k)));
}
