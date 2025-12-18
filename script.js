const CSV_PATH = "team.csv";

fetch(CSV_PATH)
  .then(res => {
    if (!res.ok) throw new Error("No se pudo cargar el CSV");
    return res.text();
  })
  .then(parseCSV)
  .then(buildOrgChart)
  .catch(err => console.error(err));

/* =======================
   CSV PARSER REAL
   ======================= */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if (char === "\n" && !insideQuotes) {
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length) {
    row.push(current.trim());
    rows.push(row);
  }

  const headers = rows.shift();

  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = r[i]?.trim() || "";
    });
    return obj;
  });
}

/* =======================
   ORGANIGRAMA
   ======================= */
function buildOrgChart(data) {
  const people = {};
  const tree = {};
  let root = null;

  data.forEach(p => {
    people[p.Email] = p;
    tree[p.Email] = [];
  });

  data.forEach(p => {
    if (p.SupervisorEmail) {
      tree[p.SupervisorEmail]?.push(p.Email);
    } else {
      root = p.Email;
    }
  });

  if (!root) {
    console.error("No se encontró raíz (SupervisorEmail vacío)");
    return;
  }

  const container = document.getElementById("org-chart");
  container.innerHTML = "";
  container.appendChild(createNode(root, people, tree));
}

function createNode(email, people, tree) {
  const p = people[email];

  const node = document.createElement("div");
  node.className = "node";

  node.innerHTML = `
    <div class="arrow">▸</div>
    <div class="node-header">
      <img src="${p.ImageURL || "https://via.placeholder.com/100"}" />
      <div>
        <div class="node-name">${p["First name"]} ${p["Last name"]}</div>
        <div class="node-role">${p.Position}</div>
      </div>
    </div>
  `;

  const children = document.createElement("div");
  children.className = "children";

  (tree[email] || []).forEach(child => {
    children.appendChild(createNode(child, people, tree));
  });

  if (tree[email] && tree[email].length > 0) {
    node.addEventListener("click", e => {
      e.stopPropagation();
      const open = children.classList.toggle("open");
      node.querySelector(".arrow").textContent = open ? "▾" : "▸";
    });
  } else {
    node.querySelector(".arrow").style.display = "none";
  }

  node.appendChild(children);
  return node;
}
