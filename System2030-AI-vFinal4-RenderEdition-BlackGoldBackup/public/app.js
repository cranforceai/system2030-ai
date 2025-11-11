const API = "/api";
let currentUser = null;

// --- LOGOWANIE ---
async function login() {
  const code = document.getElementById("code").value.trim().toUpperCase();
  const res = await fetch(`${API}/operators`);
  const users = await res.json();
  const user = users.find(u => u.code === code);

  if (!user) return alert("❌ Nieprawidłowy kod użytkownika!");

  currentUser = user;
  document.getElementById("login").classList.add("hidden");
  document.getElementById("panel").classList.remove("hidden");
  document.getElementById("roleTitle").innerText = `👤 Zalogowany jako: ${user.name} (${user.role})`;
  renderTabs(user.role);
}

// --- WYLOGOWANIE ---
function logout() {
  currentUser = null;
  document.getElementById("panel").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

// --- RENDER ZAKŁADEK ---
function renderTabs(role) {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  const content = document.getElementById("content");
  content.innerHTML = "";

  const createTab = (label, action) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = action;
    tabs.appendChild(btn);
  };

  if (role === "operator") {
    createTab("🧾 Raporty dzienne", showReports);
    createTab("📅 Obecność", showAttendance);
  }
  if (role === "kierownik") {
    createTab("👷 Operatorzy", showOperators);
    createTab("🧾 Raporty", showReports);
    createTab("📅 Obecność", showAttendance);
  }
  if (role === "admin") {
    createTab("🏗️ Budowy", showSites);
    createTab("👷 Operatorzy", showOperators);
    createTab("🧾 Raporty", showReports);
    createTab("💰 Finanse", showFinances);
    createTab("📦 Backupy", showBackups);
  }
}

// --- PRZYKŁADOWE FUNKCJE PANELU ---
async function showOperators() {
  const res = await fetch(`${API}/operators`);
  const data = await res.json();
  const c = document.getElementById("content");
  c.innerHTML = "<h3>Operatorzy</h3>";
  data.forEach(op => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<strong>${op.name}</strong><br>${op.site}<br><em>${op.role}</em>`;
    c.appendChild(div);
  });
}

async function showSites() {
  const res = await fetch(`${API}/sites`);
  const data = await res.json();
  const c = document.getElementById("content");
  c.innerHTML = "<h3>Budowy</h3>";
  data.forEach(s => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<strong>${s.name}</strong><br>${s.location}<br>Status: ${s.status}`;
    c.appendChild(div);
  });
}

async function showReports() {
  const res = await fetch(`${API}/reports`);
  const data = await res.json();
  const c = document.getElementById("content");
  c.innerHTML = "<h3>Raporty dzienne</h3>";
  data.forEach(r => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${r.operator_name}</strong> – ${r.site}<br>
      ${r.date}, ${r.hours}h<br>
      <em>${r.notes}</em><br>
      Status: ${r.status}
    `;
    c.appendChild(div);
  });
}

async function showAttendance() {
  const res = await fetch(`${API}/attendance`);
  const data = await res.json();
  const c = document.getElementById("content");
  c.innerHTML = "<h3>Obecność</h3>";
  data.forEach(a => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${a.operator_name}</strong> – ${a.date}<br>
      Status: ${a.status || "niezatwierdzony"}
    `;
    c.appendChild(div);
  });
}

async function showFinances() {
  const res = await fetch(`${API}/finances`);
  const data = await res.json();
  const c = document.getElementById("content");
  c.innerHTML = "<h3>Finanse</h3>";
  data.forEach(f => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${f.contractor}</strong><br>
      ${f.site}<br>
      Kwota: ${f.amount} zł<br>
      Koszt: ${f.cost} zł<br>
      Zysk: <span style="color:#d4af37">${f.profit} zł</span>
    `;
    c.appendChild(div);
  });
}

async function showBackups() {
  const res = await fetch(`${API}/monthly`);
  const files = await res.json();
  const c = document.getElementById("content");
  c.innerHTML = "<h3>Backupy i raporty miesięczne</h3>";
  files.forEach(f => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<a href="/data/monthly/${f}" target="_blank">${f}</a>`;
    c.appendChild(div);
  });
}
