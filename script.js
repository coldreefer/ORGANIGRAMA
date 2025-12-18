const chart = new d3.OrgChart()
  .container('#chart')
  .svgWidth(4000)
  .svgHeight(2200)
  .nodeWidth(() => 220)
  .nodeHeight(d => d.data._isRow ? 10 : 130)
  .compact(false)
  .childrenMargin(() => 120)
  .siblingsMargin(() => 80)

  // Contenido del nodo
  .nodeContent(d => {
    if (d.data._isRow) return ''; // nodo invisible

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

  .onNodeClick(d => {
    if (!d.data._isRow) {
      chart.toggleNode(d.data.id).render();
    }
  });

Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (res) {

    const raw = res.data.filter(d => d["Email (required)"]);

    // Team Leader (sin supervisor)
    const leader = raw.find(d => !d["SupervisorEmail (required)"]);

    // Supervisores directos del leader
    const supervisors = raw.filter(
      d => d["SupervisorEmail (required)"] === leader["Email (required)"]
    );

    // Nodo fila invisible
    const ROW_ID = "__SUPERVISOR_ROW__";

    const data = [];

    // Leader
    data.push({
      ...leader,
      id: leader["Email (required)"],
      parentId: null
    });

    // Row invisible
    data.push({
      id: ROW_ID,
      parentId: leader["Email (required)"],
      _isRow: true
    });

    // Supervisores → cuelgan del row
    supervisors.forEach(s => {
      data.push({
        ...s,
        id: s["Email (required)"],
        parentId: ROW_ID
      });
    });

    // Resto del personal → cuelga normal del supervisor
    raw.forEach(p => {
      if (
        p["SupervisorEmail (required)"] &&
        !supervisors.find(s => s["Email (required)"] === p["SupervisorEmail (required)"]) &&
        p["Email (required)"] !== leader["Email (required)"]
      ) {
        data.push({
          ...p,
          id: p["Email (required)"],
          parentId: p["SupervisorEmail (required)"]
        });
      }
    });

    chart.data(data).render();
  }
});
