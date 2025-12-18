const chart = new d3.OrgChart()
  .container('#chart')
  .svgWidth(4000)
  .svgHeight(2200)
  .nodeWidth(() => 220)
  .nodeHeight(d => d.data._isRow ? 10 : 140)
  .compact(false)
  .childrenMargin(() => 120)
  .siblingsMargin(() => 80)

  // Contenido del nodo
  .nodeContent(d => {
    if (d.data._isRow) return '';

    const img = d.data.ImageURL || '';
    const count = d.data._childrenCount || 0;

    return `
      <div class="org-node">
        <img src="${img}">
        <div class="name">
          ${d.data["First name (required)"]} ${d.data["Last name (required)"]}
        </div>
        <div class="role">${d.data.Position || ''}</div>

        ${
          count > 0
            ? `<div class="count">⌄ ${count}</div>`
            : ''
        }
      </div>
    `;
  })

  // ✅ CLICK CORRECTO
  .onNodeClick(d => {
    if (d.data._isRow) return;

    const id = d.data.id;
    const isExpanded = chart.getExpanded(id);

    chart.setExpanded(id, !isExpanded);
    chart.render();
  });

Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (res) {

    const raw = res.data.filter(d => d["Email (required)"]);

    const leader = raw.find(d => !d["SupervisorEmail (required)"]);
    const supervisors = raw.filter(
      d => d["SupervisorEmail (required)"] === leader["Email (required)"]
    );

    const ROW_ID = "__SUPERVISOR_ROW__";
    const data = [];

    // Función para contar descendientes
    function countChildren(id) {
      const direct = raw.filter(p => p["SupervisorEmail (required)"] === id);
      let total = direct.length;
      direct.forEach(c => {
        total += countChildren(c["Email (required)"]);
      });
      return total;
    }

    // Leader
    data.push({
      ...leader,
      id: leader["Email (required)"],
      parentId: null,
      expanded: true,
      _childrenCount: supervisors.length
    });

    // Row invisible
    data.push({
      id: ROW_ID,
      parentId: leader["Email (required)"],
      _isRow: true,
      expanded: true
    });

    // Supervisores
    supervisors.forEach(s => {
      const count = countChildren(s["Email (required)"]);
      data.push({
        ...s,
        id: s["Email (required)"],
        parentId: ROW_ID,
        expanded: false,
        _childrenCount: count
      });
    });

    // Resto del personal
    raw.forEach(p => {
      if (
        p["SupervisorEmail (required)"] &&
        p["SupervisorEmail (required)"] !== leader["Email (required)"]
      ) {
        data.push({
          ...p,
          id: p["Email (required)"],
          parentId: p["SupervisorEmail (required)"],
          expanded: false
        });
      }
    });

    chart.data(data).render();
  }
});
