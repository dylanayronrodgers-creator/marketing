import { seed } from "./mock.js";

const STORAGE_KEY = "axxess_dashboard_state_v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(seed);
    const parsed = JSON.parse(raw);
    return mergeWithSeed(parsed);
  } catch {
    return structuredClone(seed);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(seed);
}

function mergeWithSeed(state) {
  const s = structuredClone(seed);

  if (state && typeof state === "object") {
    if (state.brand && typeof state.brand === "object") {
      s.brand = { ...s.brand, ...state.brand };
    }

    if (Array.isArray(state.teams)) s.teams = state.teams;
    if (Array.isArray(state.agents)) s.agents = state.agents;

    if (Array.isArray(state.items)) {
      // ensure required properties exist
      s.items = state.items.map((it) => ({
        id: String(it.id ?? crypto.randomUUID()),
        createdAt: String(it.createdAt ?? new Date().toISOString()),
        source: String(it.source ?? "Google"),
        rating: it.rating == null ? null : Number(it.rating),
        sentiment: String(it.sentiment ?? "Neutral"),
        status: String(it.status ?? "Pending"),
        team: String(it.team ?? "Unknown"),
        agent: String(it.agent ?? "Unknown"),
        text: String(it.text ?? ""),
        keywords: Array.isArray(it.keywords) ? it.keywords.map(String) : [],
        theme: String(it.theme ?? ""),
        tvSnippet: String(it.tvSnippet ?? "")
      }));
    }
  }

  return s;
}

export function updateBrandPrimary(color) {
  const state = loadState();
  state.brand.primary = color;
  saveState(state);
  return state;
}

export function updateItem(id, patch) {
  const state = loadState();
  const idx = state.items.findIndex((i) => i.id === id);
  if (idx === -1) return state;
  state.items[idx] = { ...state.items[idx], ...patch };
  saveState(state);
  return state;
}

export function getApprovedItems(state = loadState()) {
  return state.items.filter((i) => i.status === "Approved" && i.sentiment !== "Negative");
}

export function getQueueItems(state = loadState()) {
  return state.items.filter((i) => i.status !== "Approved" || i.sentiment === "Negative");
}

export function computeStats(state = loadState()) {
  const pending = state.items.filter((i) => i.status === "Pending").length;
  const approvedWeek = state.items.filter((i) => i.status === "Approved").length;
  const negativeFlagged = state.items.filter(
    (i) => i.sentiment === "Negative" || i.status === "Flagged (Negative)"
  ).length;

  const positives = state.items.filter((i) => i.sentiment === "Positive").length;
  const total = state.items.length || 1;
  const avgSentiment = `${Math.round((positives / total) * 100)}% positive`;

  return { pending, approvedWeek, negativeFlagged, avgSentiment };
}

export function scoreItem(it) {
  const ratingScore = it.rating == null ? 0 : it.rating * 8; // up to 40
  const sentimentScore =
    it.sentiment === "Positive" ? 35 : it.sentiment === "Neutral" ? 12 : -30;

  const kwBoost = Math.min(25, (it.keywords?.length || 0) * 5);
  const themeBoost = it.theme ? 8 : 0;

  return ratingScore + sentimentScore + kwBoost + themeBoost;
}

export function computeLeaderboards(state = loadState(), now = new Date()) {
  const approved = getApprovedItems(state);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  // Monday as week start
  const diff = (day === 0 ? -6 : 1) - day;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const inWeek = approved.filter((i) => new Date(i.createdAt) >= startOfWeek);
  const inMonth = approved.filter((i) => new Date(i.createdAt) >= startOfMonth);

  const byAgent = (items) => {
    const map = new Map();
    for (const it of items) {
      const agent = it.agent || "Unknown";
      if (!map.has(agent)) {
        map.set(agent, { agent, team: it.team || "Unknown", score: 0, count: 0, themes: new Map() });
      }
      const row = map.get(agent);
      row.score += scoreItem(it);
      row.count += 1;
      if (it.theme) row.themes.set(it.theme, (row.themes.get(it.theme) || 0) + 1);
    }

    return [...map.values()]
      .map((r) => {
        const themes = [...r.themes.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((t) => t[0]);
        return { ...r, themes };
      })
      .sort((a, b) => b.score - a.score);
  };

  return {
    weekStart: startOfWeek.toISOString(),
    monthStart: startOfMonth.toISOString(),
    weeklyTop: byAgent(inWeek).slice(0, 5),
    monthlyTop: byAgent(inMonth).slice(0, 2),
    highlights: inWeek
      .slice()
      .sort((a, b) => scoreItem(b) - scoreItem(a))
      .slice(0, 8)
  };
}
