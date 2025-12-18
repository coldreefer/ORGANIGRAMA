const chart = new d3.OrgChart()
  .container('#chart')

  // Tamaños fijos (importante para alineación)
  .nodeWidth(() => 220)
  .nodeHeight(() => 130)

  // 🔴 CLAVE: DESACTIVAR COMPACT
  .compact(false)

  // Espaciados horizontales reales
  .childrenMargin(() => 80)
  .siblingsMargin(() => 60)

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

  // Expandir / colapsar
  .onNodeClick(d => {
    chart.toggleNode(d.data.id).render();
  });

// Cargar CSV
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
