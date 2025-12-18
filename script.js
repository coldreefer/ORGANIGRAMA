const CSV_PATH = "team.csv";

fetch(CSV_PATH)
  .then(res => res.text())
  .then(parseCSV)
  .then(buildOrgChart)
  .catch(err => console.error("Error cargando CSV:", err));

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",");

  return lines.map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
    return obj;
  });
}

function buildOrgChart(data) {
  const people = {};
  const tree = {};

  data.forEach(p => {
    people[p.Email] = p;
    tree[p.Email] = [];
  });

  let root = null;

  data.forEach(p => {
    if (p.SupervisorEmail) {
      tree[p.SupervisorEmail]?.push(p.Email);
    } else {
      root = p.Email;
    }
  });

  const chart = document.getElementById("org-chart");
  chart.appendChild(createNode(root, people, tree));
}

function createNode(email, people, tree) {
  const person = people[email];

  const node = document.createElement("div");
  node.className = "node";

  node.innerHTML = `
    <div class="arrow">▸</div>
    <div class="node-header">
      <img src="${person.ImageURL || "https://via.placeholder.com/100"}" />
      <div>
        <div class="node-name">${person["First name"]} ${person["Last name"]}</div>
        <div class="node-role">${person.Position}</div>
      </div>
    </div>
  `;

  const childrenContainer = document.createElement("div");
  childrenContainer.className = "children";

  tree[email].forEach(childEmail => {
    childrenContainer.appendChild(createNode(childEmail, people, tree));
  });

  if (tree[email].length > 0) {
    node.addEventListener("click", e => {
      e.stopPropagation();
      const open = childrenContainer.classList.toggle("open");
      node.querySelector(".arrow").textContent = open ? "▾" : "▸";
    });
  } else {
    node.querySelector(".arrow").style.display = "none";
  }

  node.appendChild(childrenContainer);
  return node;
}
