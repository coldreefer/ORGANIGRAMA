const chart = new d3.OrgChart()
  .container('#chart')

  // Tamaños
  .nodeWidth(() => 220)
  .nodeHeight(() => 130)

  // 🔑 CLAVE PARA HORIZONTALIDAD
  .compact(true)

  // Espaciados
  .childrenMargin(() => 60)
  .siblingsMargin(() => 40)
  .compactMarginBetween(() => 40)
  .compactMarginPair(() => 80)

  // Contenido del nodo
  .nodeContent(d => {
    const img = d.data.ImageURL || '';
    return `
      <div class="org-node">
        <img src="${img}">
        <div class="name">
          ${d.data["First name (required)"]} ${d.data["Last name (required)"]}
        </div>
        <div class="role">${d.data.Position || ''}</div>
      </div>
    `;
  })

  // Click para expandir / colapsar
  .onNodeClick(d => {
    chart.toggleNode(d.data.id).render();
  });

// CSV
Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (res) {

    const data = res.data
      .filter(d => d["Email (required)"])
      .map(d => ({
        ...d,
        id: d["Email (required)"],
        parentId: d["SupervisorEmail (required)"] || null
      }));

    chart
      .data(data)
      .render();
  }
});
