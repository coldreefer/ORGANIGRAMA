const chart = new d3.OrgChart()
  .container('#chart')
  .svgWidth(4000)
  .svgHeight(2200)

  .nodeWidth(() => 220)
  .nodeHeight(d => d.data._isRow ? 10 : 150)

  .compact(false)
  .childrenMargin(() => 120)
  .siblingsMargin(() => 80)

  // ======================
  // TARJETA COMPLETA
  // ======================
  .nodeContent(d => {
    if (d.data._isRow) return '';

    const img = d.data.ImageURL || '';
    const count = d.data._childrenCount || 0;

    return `
      <div class="org-node clickable">
        <img src="${img}">
        <div class="name">
          ${d.data["First name (required)"]} ${d.data["Last name (required)"]}
        </div>
        <div class="role">${d.data.Position || ''}</div>
        ${count > 0 ? `<div class="count">${count} personas</div>` : ``}
      </div>
    `;
  })

  // ======================
  // CLICK EN CARD / IMAGEN
  // ======================
  .onNodeClick(d => {
    if (d.data._isRow) return;

    // 🔑 ÚNICA forma soportada
    d.data._expanded = !d.data._expanded;
    chart.render();
  });

Papa.parse("team.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (res) {

    const raw = res.data.filter(d => d["Email (required)"]);

    const leader = raw.find(d => !d["SupervisorEmail (required)"]);
    if (!leader) {
      alert("No se pudo detectar Team Leader");
      return;
    }

    const supervisors = raw.filter(
      d => d["SupervisorEmail (required)"] === leader["Email (required)"]
    );

    const ROW_ID = "__SUPERVISOR_ROW__";
    const data = [];

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
      _expanded: true,
      _childrenCount: supervisors.length
    });

    // Row invisible
    data.push({
      id: ROW_ID,
      parentId: leader["Email (required)"],
      _isRow: true,
      _expanded: true
    });

    // Supervisores
    supervisors.forEach(s => {
      data.push({
        ...s,
        id: s["Email (required)"],
        parentId: ROW_ID,
        _expanded: false,
        _childrenCount: countChildren(s["Email (required)"])
      });
    });

    // Personal
    raw.forEach(p => {
      const parent = p["SupervisorEmail (required)"];
      if (parent && parent !== leader["Email (required)"]) {
        data.push({
          ...p,
          id: p["Email (required)"],
          parentId: parent,
          _expanded: false
        });
      }
    });

    chart.data(data).render();
  }
});
