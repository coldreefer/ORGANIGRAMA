const chart = new d3.OrgChart()
  .container('#chart')
  .svgWidth(4000)
  .svgHeight(2200)
  .nodeWidth(() => 220)
  .nodeHeight(d => d.data._isRow ? 10 : 130)
  .compact(false)
  .childrenMargin(() => 120)
  .siblingsMargin(() => 80)

  .nodeContent(d => {
    if (d.data._isRow) return '';

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

  // 🔴 AQUÍ NO EXISTE toggleNode
  .onNodeClick(d => {
    if (d.data._isRow) return;

    d.expanded = !d.expanded;
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

    data.push({
      ...leader,
      id: leader["Email (required)"],
      parentId: null,
      expanded: true
    });

    data.push({
      id: ROW_ID,
      parentId: leader["Email (required)"],
      _isRow: true,
      expanded: true
    });

    supervisors.forEach(s => {
      data.push({
        ...s,
        id: s["Email (required)"],
        parentId: ROW_ID,
        expanded: false
      });
    });

    raw.forEach(p => {
      if (
        p["SupervisorEmail (required)"] &&
        !supervisors.find(s => s["Email (required)"] === p["SupervisorEmail (required)"]) &&
        p["Email (required)"] !== leader["Email (required)"]
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
