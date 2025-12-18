const chart = new d3.OrgChart()
  .container('#chart')

  .svgWidth(4000)
  .svgHeight(2200)

  .nodeWidth(() => 220)
  .nodeHeight(d => d.data._isRow ? 10 : 150)

  .compact(false)
  .childrenMargin(() => 120)
  .siblingsMargin(() => 80)

  // ❌ eliminar botones/flechas internas
  .buttonContent(() => '')

  // =========================
  // CONTENIDO DEL NODO
  // =========================
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

  // =========================
  // CLICK EN TARJETA / IMAGEN
  // =========================
  .onNodeClick(d => {
    if (d.data._isRow) return;

    d.data._expanded = !d.data._expanded;
    chart.render();
  });


// =========================
// CARGA CSV
// =========================
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

    // Leader
    data.push({
      ...leader,
      id: leader["Email (required)"],
      parentId: null,
      _expanded: true
    });

    // Fila invisible (fuerza horizontal)
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
        _expanded: false
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
