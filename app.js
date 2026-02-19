// ============================================
// AXXESS DASHBOARD - BUNDLED (NO SERVER NEEDED)
// ============================================

// --- MOCK DATA GENERATOR ---
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickMany(rng, arr, min, max) {
  const count = Math.max(min, Math.floor(rng() * (max - min + 1)) + min);
  const copy = arr.slice();
  const out = [];
  while (out.length < count && copy.length) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function generateItems() {
  const rng = mulberry32(19420427);
  const now = new Date();
  const agents = [
    { name: "Leah Mokoena", team: "Support" },
    { name: "Siyabonga Zulu", team: "Support" },
    { name: "Kyle Jacobs", team: "Sales" },
    { name: "Mia van Wyk", team: "Sales" },
    { name: "Nandi Dlamini", team: "Fibre Orders" },
    { name: "Thabo Maseko", team: "Fibre Orders" },
    { name: "Ethan Naidoo", team: "Accounts" },
    { name: "Priya Pillay", team: "Accounts" },
    { name: "Ayesha Khan", team: "Walk-In Centre" },
    { name: "Liam Smith", team: "Walk-In Centre" }
  ];

  const positiveWords = ["great", "exceptional", "good", "nice", "amazing", "brilliant", "helpful", "professional", "friendly", "efficient"];
  const posThemes = {
    Support: ["Fast resolution", "Proactive updates", "Clear troubleshooting", "Friendly tone"],
    Sales: ["Clear communication", "Honest advice", "Quick turnaround", "Great product knowledge"],
    "Fibre Orders": ["Quick coordination", "On-time installation", "Kept me informed", "Smooth onboarding"],
    Accounts: ["First-time resolution", "Billing clarity", "Helpful guidance", "Quick refund/credit"],
    "Walk-In Centre": ["Friendly service", "Patient assistance", "Quick help", "Went the extra mile"]
  };

  const negThemes = ["Installation delays", "No follow-up", "Billing confusion", "Slow response", "Poor communication", "Router issues"];
  const negKeywords = ["delayed", "waiting", "no response", "unhelpful", "frustrating", "confusing", "incorrect", "dropped", "unstable"];
  const neutralKeywords = ["okay", "fine", "eventually", "average", "could be better", "not bad"];

  const templatesPositive = [
    "{word} service from {agent}. {reason}.",
    "{agent} was {word} and {word2}. {reason}.",
    "Really {word} support. {agent} {reasonLower}.",
    "{word} experience overall - {agent} {reasonLower}."
  ];

  const templatesNeutral = [
    "Service was {word}. {agent} helped, but {neutral}.",
    "{agent} was {word}, but {neutral}.",
    "Overall {word}. {neutral}."
  ];

  const templatesNegative = [
    "{neg}. {neg2}.",
    "Very {neg}. {neg2}.",
    "Not happy - {neg}. {neg2}."
  ];

  const reasons = [
    "fixed my issue quickly and kept me updated",
    "explained everything clearly and gave options",
    "followed up until it was sorted",
    "made the process quick and painless",
    "handled everything professionally",
    "went the extra mile to help"
  ];

  const items = [];
  const daysBack = 60;
  const count = 140;

  for (let i = 0; i < count; i += 1) {
    const ageDays = Math.floor(rng() * daysBack);
    const created = new Date(now);
    created.setDate(created.getDate() - ageDays);
    created.setHours(clamp(Math.floor(rng() * 12) + 7, 0, 23), Math.floor(rng() * 60), 0, 0);

    const source = rng() < 0.68 ? "Google" : "Email";
    const a = pick(rng, agents);

    const sentimentRoll = rng();
    const sentiment = sentimentRoll < 0.74 ? "Positive" : sentimentRoll < 0.88 ? "Neutral" : "Negative";

    const statusRoll = rng();
    const status =
      sentiment === "Negative"
        ? statusRoll < 0.7
          ? "Flagged (Negative)"
          : "Pending"
        : statusRoll < 0.62
        ? "Approved"
        : statusRoll < 0.86
        ? "Pending"
        : "On hold";

    const theme =
      sentiment === "Positive"
        ? pick(rng, posThemes[a.team] || ["Great service"])
        : sentiment === "Negative"
        ? pick(rng, negThemes)
        : rng() < 0.6
        ? pick(rng, posThemes[a.team] || [""])
        : "";

    const word = pick(rng, positiveWords);
    const word2 = pick(rng, positiveWords);
    const reason = pick(rng, reasons);
    const reasonLower = reason;
    const neutral = pick(rng, neutralKeywords);
    const neg = pick(rng, negKeywords);
    const neg2 = pick(rng, negKeywords);

    let text;
    let keywords;
    let rating = null;
    let tvSnippet = "";

    if (sentiment === "Positive") {
      text = pick(rng, templatesPositive)
        .replace(/{word}/g, word)
        .replace(/{word2}/g, word2)
        .replace(/{agent}/g, a.name)
        .replace(/{reason}/g, reason.charAt(0).toUpperCase() + reason.slice(1))
        .replace(/{reasonLower}/g, reasonLower);
      keywords = pickMany(rng, [...new Set([word, word2, ...pickMany(rng, positiveWords, 1, 3)])], 3, 6);
      if (source === "Google") {
        rating = rng() < 0.72 ? 5 : 4;
      }
      tvSnippet = word.charAt(0).toUpperCase() + word.slice(1) + " - " + (theme || "Great service") + ".";
    } else if (sentiment === "Neutral") {
      text = pick(rng, templatesNeutral)
        .replace(/{word}/g, pick(rng, ["good", "okay", "fine"]))
        .replace(/{agent}/g, a.name)
        .replace(/{neutral}/g, neutral);
      keywords = pickMany(rng, neutralKeywords, 2, 4);
      if (source === "Google") rating = rng() < 0.6 ? 3 : 4;
    } else {
      text = pick(rng, templatesNegative)
        .replace(/{neg}/g, neg)
        .replace(/{neg2}/g, neg2);
      keywords = pickMany(rng, negKeywords, 2, 5);
      if (source === "Google") rating = rng() < 0.6 ? 1 : 2;
    }

    const maybeUnknown = rng() < 0.07;
    const agent = maybeUnknown ? "Unknown" : a.name;
    const team = maybeUnknown ? "Unknown" : a.team;

    items.push({
      id: "IT-" + String(20000 + i).padStart(5, "0"),
      createdAt: created.toISOString(),
      source: source,
      rating: rating,
      sentiment: sentiment,
      status: status,
      agent: agent,
      team: team,
      theme: theme,
      keywords: keywords,
      tvSnippet: tvSnippet,
      text: text
    });
  }

  items.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return items;
}

// --- SEED DATA ---
var seed = {
  brand: {
    name: "Axxess",
    primary: "#0099cc"
  },
  teams: ["Sales", "Support", "Fibre Orders", "Accounts", "Walk-In Centre"],
  agents: [
    { id: "AG-001", name: "Leah Mokoena", team: "Support", email: "leah.mokoena@axxess.local" },
    { id: "AG-002", name: "Kyle Jacobs", team: "Sales", email: "kyle.jacobs@axxess.local" },
    { id: "AG-003", name: "Nandi Dlamini", team: "Fibre Orders", email: "nandi.dlamini@axxess.local" },
    { id: "AG-004", name: "Ethan Naidoo", team: "Accounts", email: "ethan.naidoo@axxess.local" },
    { id: "AG-005", name: "Ayesha Khan", team: "Walk-In Centre", email: "ayesha.khan@axxess.local" },
    { id: "AG-006", name: "Siyabonga Zulu", team: "Support", email: "siya.zulu@axxess.local" },
    { id: "AG-007", name: "Mia van Wyk", team: "Sales", email: "mia.vanwyk@axxess.local" },
    { id: "AG-008", name: "Thabo Maseko", team: "Fibre Orders", email: "thabo.maseko@axxess.local" },
    { id: "AG-009", name: "Priya Pillay", team: "Accounts", email: "priya.pillay@axxess.local" },
    { id: "AG-010", name: "Liam Smith", team: "Walk-In Centre", email: "liam.smith@axxess.local" }
  ],
  items: generateItems()
};

// --- STORE (localStorage) ---
var STORAGE_KEY = "axxess_dashboard_state_v2";
var GOOGLE_REVIEWS_LOADED_KEY = "axxess_google_reviews_loaded";

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(seed));
    var parsed = JSON.parse(raw);
    return mergeWithSeed(parsed);
  } catch (e) {
    return JSON.parse(JSON.stringify(seed));
  }
}

// Load Google Reviews from scraped JSON file
function loadGoogleReviews() {
  return fetch('./data/google-reviews.json')
    .then(function(response) {
      if (!response.ok) {
        console.log('No Google reviews file found. Using mock data.');
        return null;
      }
      return response.json();
    })
    .then(function(data) {
      if (!data || !data.reviews || data.reviews.length === 0) {
        return null;
      }
      
      var lastLoaded = localStorage.getItem(GOOGLE_REVIEWS_LOADED_KEY);
      if (lastLoaded === data.scrapedAt) {
        console.log('Google reviews already loaded (scraped at ' + data.scrapedAt + ')');
        return null;
      }
      
      var state = loadState();
      
      // Keep existing Google reviews, add new ones (avoid duplicates by ID)
      var existingIds = {};
      state.items.forEach(function(item) {
        if (item.id.startsWith('GR-')) {
          existingIds[item.id] = true;
        }
      });
      
      // Remove mock data (IDs starting with IT-) but keep existing Google reviews
      state.items = state.items.filter(function(item) {
        return item.id.startsWith('GR-');
      });
      
      // Add new reviews that don't already exist
      data.reviews.forEach(function(review) {
        if (!existingIds[review.id]) {
          state.items.push(review);
        }
      });
      
      // Sort by date (newest first)
      state.items.sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      saveState(state);
      localStorage.setItem(GOOGLE_REVIEWS_LOADED_KEY, data.scrapedAt);
      
      console.log('✅ Loaded ' + data.reviews.length + ' Google reviews (Rating: ' + data.overallRating + ')');
      
      // Reload page to show new reviews
      location.reload();
      
      return data;
    })
    .catch(function(err) {
      console.log('Could not load Google reviews:', err.message);
      return null;
    });
}

// Initialize Google reviews on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function() {
    loadGoogleReviews();
  });
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  seed.items = generateItems();
  return JSON.parse(JSON.stringify(seed));
}

function mergeWithSeed(state) {
  var s = JSON.parse(JSON.stringify(seed));

  if (state && typeof state === "object") {
    if (state.brand && typeof state.brand === "object") {
      s.brand = Object.assign({}, s.brand, state.brand);
    }
    if (Array.isArray(state.teams)) s.teams = state.teams;
    if (Array.isArray(state.agents)) s.agents = state.agents;
    if (Array.isArray(state.items)) {
      s.items = state.items.map(function(it) {
        var item = {
          id: String(it.id || Math.random().toString(36).substr(2, 9)),
          createdAt: String(it.createdAt || new Date().toISOString()),
          source: String(it.source || "Google"),
          rating: it.rating == null ? null : Number(it.rating),
          sentiment: String(it.sentiment || "Neutral"),
          status: String(it.status || "Pending"),
          team: String(it.team || "Unknown"),
          agent: String(it.agent || "Unknown"),
          text: String(it.text || ""),
          keywords: Array.isArray(it.keywords) ? it.keywords.map(String) : [],
          theme: String(it.theme || ""),
          tvSnippet: String(it.tvSnippet || ""),
          managerRating: it.managerRating == null ? null : Number(it.managerRating)
        };
        if (it.reviewerName) item.reviewerName = String(it.reviewerName);
        if (it.reviewerThumbnail) item.reviewerThumbnail = String(it.reviewerThumbnail);
        if (it.reviewerLink) item.reviewerLink = String(it.reviewerLink);
        if (it.likes != null) item.likes = Number(it.likes);
        return item;
      });
    }
  }
  return s;
}

function updateBrandPrimary(color) {
  var state = loadState();
  state.brand.primary = color;
  saveState(state);
  return state;
}

function updateItem(id, patch) {
  var state = loadState();
  var idx = -1;
  for (var i = 0; i < state.items.length; i++) {
    if (state.items[i].id === id) { idx = i; break; }
  }
  if (idx === -1) return state;
  state.items[idx] = Object.assign({}, state.items[idx], patch);
  saveState(state);
  return state;
}

function getApprovedItems(state) {
  state = state || loadState();
  return state.items.filter(function(i) {
    return i.status === "Approved" && i.sentiment !== "Negative";
  });
}

function computeStats(state) {
  state = state || loadState();
  var pending = state.items.filter(function(i) { return i.status === "Pending"; }).length;
  var approvedCount = state.items.filter(function(i) { return i.status === "Approved"; }).length;
  var negativeFlagged = state.items.filter(function(i) {
    return i.sentiment === "Negative" || i.status === "Flagged (Negative)";
  }).length;

  var positives = state.items.filter(function(i) { return i.sentiment === "Positive"; }).length;
  var total = state.items.length || 1;
  var avgSentiment = Math.round((positives / total) * 100) + "% positive";

  return { pending: pending, approvedWeek: approvedCount, negativeFlagged: negativeFlagged, avgSentiment: avgSentiment };
}

function scoreItem(it) {
  var r = it.rating == null ? 0 : Number(it.rating);
  var base = 0;
  if (r >= 5) base = 10;
  else if (r >= 4) base = 7;
  else if (r >= 3) base = 3;
  else if (r >= 2) base = 1;

  var mgr = it.managerRating == null ? 0 : Number(it.managerRating);
  var mgrBase = 0;
  if (mgr >= 5) mgrBase = 10;
  else if (mgr >= 4) mgrBase = 7;
  else if (mgr >= 3) mgrBase = 3;
  else if (mgr >= 2) mgrBase = 1;

  return base + mgrBase;
}

function computeLeaderboards(state, now) {
  state = state || loadState();
  now = now || new Date();
  var approved = getApprovedItems(state);

  var startOfWeek = new Date(now);
  var day = startOfWeek.getDay();
  var diff = (day === 0 ? -6 : 1) - day;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  var inWeek = approved.filter(function(i) { return new Date(i.createdAt) >= startOfWeek; });
  var inMonth = approved.filter(function(i) { return new Date(i.createdAt) >= startOfMonth; });

  function byAgent(items) {
    var map = {};
    items.forEach(function(it) {
      var agent = it.agent || "Unknown";
      if (!map[agent]) {
        map[agent] = { agent: agent, team: it.team || "Unknown", score: 0, count: 0, themesMap: {} };
      }
      var row = map[agent];
      row.score += scoreItem(it);
      row.count += 1;
      if (it.theme) {
        row.themesMap[it.theme] = (row.themesMap[it.theme] || 0) + 1;
      }
    });

    var arr = Object.keys(map).map(function(k) { return map[k]; });
    arr.forEach(function(r) {
      var themePairs = Object.keys(r.themesMap).map(function(t) { return [t, r.themesMap[t]]; });
      themePairs.sort(function(a, b) { return b[1] - a[1]; });
      r.themes = themePairs.slice(0, 3).map(function(p) { return p[0]; });
      delete r.themesMap;
    });
    arr.sort(function(a, b) { return b.score - a.score; });
    return arr;
  }

  return {
    weekStart: startOfWeek.toISOString(),
    monthStart: startOfMonth.toISOString(),
    weeklyTop: byAgent(inWeek).slice(0, 5),
    monthlyTop: byAgent(inMonth).slice(0, 5),
    highlights: approved.slice().sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, 20)
  };
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type) {
  type = type || "info";
  var toast = document.createElement("div");
  toast.textContent = message;
  var bg = type === "success" ? "#22c55e" : type === "error" ? "#dc2626" : "#0099cc";
  toast.style.cssText = "position:fixed;top:20px;right:20px;padding:14px 20px;border-radius:8px;background:" + bg + ";color:white;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.transition = "opacity 0.3s";
    toast.style.opacity = "0";
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

console.log("Axxess Dashboard loaded. Items in seed:", seed.items.length);
