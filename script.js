const chart = new d3.OrgChart()
  .container('#chart')
  .svgWidth(4000)
  .svgHeight(2200)

  .nodeWidth(() => 220)
  .nodeHeight(d => d.data._isRow ? 10 : 150)

  .compact(false)
  .childrenMargin(() => 120)
  .siblingsMargin(() => 80)

  // eliminar flechas internas
  .buttonContent(() => '')

  .nodeContent(d => {
    if (d.data._isRow) return '';
    return `
      <div class="org-node">
        <img src="${d.data.ImageURL || ''}">
        <div class="name">
          ${d.data["First name (required)"]} ${d.data["Last name (required)"]}
        </div>
        <div class="role">${d.data.Position || ''}</div>
      </div>
    `;
  })

  // 🔑 CLICK REAL
  .onNodeClick(d => {
    if (d.data._isRow) return;
    d.data._expanded = !d.data._expanded;
    chart.render();
  });

Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: res => {

    const raw = res.data.filter(d => d["Email (required)"]);
    const leader = raw.find(d => !d["SupervisorEmail (required)"]);
    const supervisors = raw.filter(
      d => d["SupervisorEmail (required)"] === leader["Email (required)"]
    );

    const ROW = "__ROW__";
    const data = [];

    data.push({
      ...leader,
      id: leader["Email (required)"],
      parentId: null,
      _expanded: true
    });

    data.push({
      id: ROW,
      parentId: leader["Email (required)"],
      _isRow: true,
      _expanded: true
    });

    supervisors.forEach(s => {
      data.push({
        ...s,
        id: s["Email (required)"],
        parentId: ROW,
        _expanded: false
      });
    });

    raw.forEach(p => {
      if (p["SupervisorEmail (required)"]
        && p["SupervisorEmail (required)"] !== leader["Email (required)"]) {
        data.push({
          ...p,
          id: p["Email (required)"],
          parentId: p["SupervisorEmail (required)"],
          _expanded: false
        });
      }
    });

    chart.data(data).render();
  }
});
