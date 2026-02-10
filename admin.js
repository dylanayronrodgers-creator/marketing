import {
  computeLeaderboards,
  computeStats,
  loadState,
  resetState,
  saveState,
  updateBrandPrimary,
  updateItem
} from "./data/store.js";

const root = document.documentElement;

const views = ["overview", "queue", "agents", "negative"];
const viewTitle = document.getElementById("viewTitle");
const viewSubtitle = document.getElementById("viewSubtitle");

const sections = {
  overview: document.getElementById("view-overview"),
  queue: document.getElementById("view-queue"),
  agents: document.getElementById("view-agents"),
  negative: document.getElementById("view-negative")
};

const subtitles = {
  overview: "High level health and pipeline",
  queue: "Review items before they appear on the TV dashboard",
  agents: "Manage agent directory and team mapping",
  negative: "Internal-only negative feedback themes"
};

function setActive(view) {
  for (const v of views) {
    sections[v].style.display = v === view ? "block" : "none";
  }

  for (const a of document.querySelectorAll("#nav .navItem")) {
    a.classList.toggle("active", a.dataset.view === view);
  }

  viewTitle.textContent =
    view === "overview"
      ? "Overview"
      : view === "queue"
      ? "Approvals Queue"
      : view === "agents"
      ? "Agents & Teams"
      : "Negative (Internal)";

  viewSubtitle.textContent = subtitles[view] || "";
}

function parseHash() {
  const raw = (location.hash || "#overview").replace("#", "");
  return views.includes(raw) ? raw : "overview";
}

window.addEventListener("hashchange", () => setActive(parseHash()));
setActive(parseHash());

let state = loadState();
root.style.setProperty("--brand", state.brand.primary);

// Overview
const kpis = document.getElementById("kpis");
const themes = document.getElementById("themes");
const teams = document.getElementById("teams");

// Queue
let selectedId = null;

const queueTable = document.getElementById("queueTable");
const previewText = document.getElementById("previewText");
const agentSelect = document.getElementById("agentSelect");
const qSearch = document.getElementById("qSearch");
const qSource = document.getElementById("qSource");
const qTeam = document.getElementById("qTeam");
const qStatus = document.getElementById("qStatus");

function renderAgentSelect(current) {
  const options = [
    "Unknown",
    ...state.agents.map((a) => a.name)
  ];

  agentSelect.innerHTML = options
    .map((n) => `<option value="${n}">${n}</option>`)
    .join("");

  agentSelect.value = current || "Unknown";
}

function rowBadge(text) {
  const safe = String(text || "");
  return `<span class="pill">${safe}</span>`;
}

function renderQueue() {
  const items = getFilteredQueue();
  if (!selectedId && items[0]) selectedId = items[0].id;

  queueTable.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Source</th>
        <th>Rating</th>
        <th>Sentiment</th>
        <th>Agent</th>
        <th>Team</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map((q) => {
          const rating = q.rating == null ? "—" : `${q.rating}/5`;
          const isSelected = q.id === selectedId;
          const d = new Date(q.createdAt);
          const dateLabel = isNaN(d.getTime())
            ? q.createdAt
            : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
          return `
            <tr data-id="${q.id}" style="cursor:pointer; background:${
            isSelected ? "rgba(11,126,168,.10)" : "transparent"
          }">
              <td>${dateLabel}</td>
              <td>${rowBadge(q.source)}</td>
              <td>${rating}</td>
              <td>${rowBadge(q.sentiment)}</td>
              <td>${q.agent}</td>
              <td>${q.team}</td>
              <td>${rowBadge(q.status)}</td>
            </tr>`;
        })
        .join("")}
    </tbody>
  `;

  for (const tr of queueTable.querySelectorAll("tbody tr")) {
    tr.addEventListener("click", () => {
      selectedId = tr.dataset.id;
      renderQueue();
      renderPreview();
    });
  }
}

function renderPreview() {
  const item = state.items.find((q) => q.id === selectedId);
  if (!item) {
    previewText.textContent = "Select a row to preview the full text and actions.";
    renderAgentSelect("Unknown");
    return;
  }

  previewText.textContent = item.text;
  renderAgentSelect(item.agent);
}

agentSelect.addEventListener("change", () => {
  const item = state.items.find((q) => q.id === selectedId);
  if (!item) return;
  const nextAgent = agentSelect.value;
  const agent = state.agents.find((a) => a.name === nextAgent);
  state = updateItem(item.id, {
    agent: nextAgent,
    team: agent ? agent.team : "Unknown"
  });
  root.style.setProperty("--brand", state.brand.primary);
  renderAll();
  showToast(`Assigned to ${nextAgent}`, "success");
});

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 18px;
    border-radius: 12px;
    background: ${type === "success" ? "rgba(46,229,157,.9)" : type === "error" ? "rgba(255,77,77,.9)" : "rgba(11,126,168,.9)"};
    color: white;
    font-weight: 800;
    font-size: 13px;
    z-index: 9999;
    box-shadow: 0 8px 24px rgba(0,0,0,.4);
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function updateSelectedStatus(status) {
  const item = state.items.find((q) => q.id === selectedId);
  if (!item) {
    showToast("Please select an item first", "error");
    return;
  }
  const patch = { status };
  if (status === "Flagged (Negative)") patch.sentiment = "Negative";
  state = updateItem(item.id, patch);
  renderAll();
  showToast(`Item ${item.id} → ${status}`, "success");
}

document.getElementById("approveBtn").addEventListener("click", () => {
  updateSelectedStatus("Approved");
});

document.getElementById("holdBtn").addEventListener("click", () => {
  updateSelectedStatus("On hold");
});

document.getElementById("flagNegBtn").addEventListener("click", () => {
  updateSelectedStatus("Flagged (Negative)");
});
// Filters
function populateFilters() {
  if (qSource) {
    const sources = ["All", ...Array.from(new Set(state.items.map((i) => i.source))).sort()];
    qSource.innerHTML = sources.map((s) => `<option value="${s}">${s}</option>`).join("");
  }
  if (qTeam) {
    const teams = ["All", ...state.teams];
    qTeam.innerHTML = teams.map((t) => `<option value="${t}">${t}</option>`).join("");
  }
  if (qStatus) {
    const statuses = ["All", "Pending", "On hold", "Approved", "Flagged (Negative)"];
    qStatus.innerHTML = statuses.map((s) => `<option value="${s}">${s}</option>`).join("");
  }
}

function getFilteredQueue() {
  const search = (qSearch?.value || "").trim().toLowerCase();
  const source = qSource?.value || "All";
  const team = qTeam?.value || "All";
  const status = qStatus?.value || "All";

  return state.items
    .filter((i) => i.status !== "Approved" || i.sentiment === "Negative")
    .filter((i) => (source === "All" ? true : i.source === source))
    .filter((i) => (team === "All" ? true : i.team === team))
    .filter((i) => (status === "All" ? true : i.status === status))
    .filter((i) => {
      if (!search) return true;
      const blob = `${i.id} ${i.source} ${i.sentiment} ${i.status} ${i.agent} ${i.team} ${i.theme} ${i.text}`.toLowerCase();
      return blob.includes(search);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

if (qSearch) qSearch.addEventListener("input", () => renderAll());
if (qSource) qSource.addEventListener("change", () => renderAll());
if (qTeam) qTeam.addEventListener("change", () => renderAll());
if (qStatus) qStatus.addEventListener("change", () => renderAll());

// Agents
const agentsTable = document.getElementById("agentsTable");
const teamList = document.getElementById("teamList");

function renderAgents() {
  agentsTable.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Team</th>
        <th>Email</th>
      </tr>
    </thead>
    <tbody>
      ${state.agents
        .map(
          (a) => `
          <tr>
            <td>${a.name}</td>
            <td>${rowBadge(a.team)}</td>
            <td>${a.email}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  `;

  teamList.innerHTML = state.teams.map((t) => `<span class="themeChip">${t}</span>`).join(" ");
}

// Negative (internal)
const negativeThemes = document.getElementById("negativeThemes");

function renderNegativeThemes() {
  const neg = state.items.filter((i) => i.sentiment === "Negative" || i.status === "Flagged (Negative)");
  const map = new Map();
  for (const it of neg) {
    const key = it.theme || "Uncategorized";
    map.set(key, (map.get(key) || 0) + 1);
  }
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);

  negativeThemes.innerHTML = rows
    .map(
      ([theme, count]) =>
        `<div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.06);"><span>${theme}</span><span style="color:var(--muted); font-weight:900;">${count}</span></div>`
    )
    .join("");
}

function renderOverview() {
  const stats = computeStats(state);
  const kpiMap = [
    { label: "Pending approvals", value: stats.pending },
    { label: "Approved items", value: state.items.filter((i) => i.status === "Approved").length },
    { label: "Avg sentiment", value: stats.avgSentiment },
    { label: "Negative flagged", value: stats.negativeFlagged }
  ];

  kpis.innerHTML = kpiMap
    .map(
      (k) => `
      <div class="kpi">
        <div class="kpiLabel">${k.label}</div>
        <div class="kpiValue">${k.value}</div>
      </div>`
    )
    .join("");

  const lb = computeLeaderboards(state, new Date());
  const topThemes = Array.from(new Set(lb.weeklyTop.flatMap((a) => a.themes || []))).slice(0, 6);
  themes.textContent = topThemes.length ? topThemes.join(", ") : "Fast resolution, Clear communication";

  const byTeam = new Map();
  for (const it of state.items.filter((i) => i.status === "Approved" && i.sentiment !== "Negative")) {
    byTeam.set(it.team, (byTeam.get(it.team) || 0) + 1);
  }
  teams.textContent = [...byTeam.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t}: ${c}`)
    .join(" · ") || "No approved items yet";
}

function renderAll() {
  state = loadState();
  root.style.setProperty("--brand", state.brand.primary);
  populateFilters();
  renderOverview();
  renderQueue();
  renderPreview();
  renderAgents();
  renderNegativeThemes();
  
  const helpBanner = document.getElementById("helpBanner");
  if (helpBanner && state.items.length < 50) {
    helpBanner.style.display = "block";
  } else if (helpBanner) {
    helpBanner.style.display = "none";
  }
}

renderAll();

// Brand color quick toggle (prototype-only)
document.getElementById("btnBrand").addEventListener("click", () => {
  const current = getComputedStyle(root).getPropertyValue("--brand").trim();
  const next = current.toLowerCase() === "#0b7ea8" ? "#0C8BD0" : "#0B7EA8";
  state = updateBrandPrimary(next);
  root.style.setProperty("--brand", state.brand.primary);
  renderAll();
});

const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset to demo data? This will clear all changes and load 140 fresh items.")) return;
    state = resetState();
    root.style.setProperty("--brand", state.brand.primary);
    renderAll();
    showToast(`Demo data reset: ${state.items.length} items loaded`, "success");
  });
}
