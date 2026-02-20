// =============================================
// Top Reviewa - Supabase Client
// =============================================

var SUPABASE_URL = "https://hzjtthgofkeubksrprmg.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6anR0aGdvZmtldWJrc3Jwcm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzE1NjMsImV4cCI6MjA4NzE0NzU2M30.L8jMG7z441G34gM-hOGNXGLW_XmP9c1cJnMGb1IOdU0";

var supabase;
if (typeof window !== 'undefined' && window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// --- Helper: convert DB row to app item format ---
function dbRowToItem(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    source: row.source || "Google",
    rating: row.rating,
    sentiment: row.sentiment || "Neutral",
    status: row.status || "Pending",
    agent: row.agent || "Unknown",
    team: row.team || "Unknown",
    theme: row.theme || "",
    keywords: row.keywords || [],
    tvSnippet: row.tv_snippet || "",
    text: row.text || "",
    managerRating: row.manager_rating,
    reviewerName: row.reviewer_name || null,
    reviewerThumbnail: row.reviewer_thumbnail || null,
    reviewerLink: row.reviewer_link || null,
    likes: row.likes || 0
  };
}

// --- Helper: convert app item to DB row format ---
function itemToDbRow(item) {
  return {
    id: item.id,
    created_at: item.createdAt,
    source: item.source || "Google",
    rating: item.rating,
    sentiment: item.sentiment || "Neutral",
    status: item.status || "Pending",
    agent: item.agent || "Unknown",
    team: item.team || "Unknown",
    theme: item.theme || "",
    keywords: item.keywords || [],
    tv_snippet: item.tvSnippet || "",
    text: item.text || "",
    manager_rating: item.managerRating || null,
    reviewer_name: item.reviewerName || null,
    reviewer_thumbnail: item.reviewerThumbnail || null,
    reviewer_link: item.reviewerLink || null,
    likes: item.likes || 0
  };
}

// --- DB Operations ---

// Load all reviews from Supabase
function dbLoadReviews() {
  return supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .then(function(res) {
      if (res.error) { console.error("DB load reviews error:", res.error); return []; }
      return (res.data || []).map(dbRowToItem);
    });
}

// Load all agents from Supabase
function dbLoadAgents() {
  return supabase
    .from("agents")
    .select("*")
    .order("name")
    .then(function(res) {
      if (res.error) { console.error("DB load agents error:", res.error); return []; }
      return (res.data || []).map(function(a) {
        return { id: a.id, name: a.name, team: a.team, email: a.email || "" };
      });
    });
}

// Load a setting by key
function dbLoadSetting(key) {
  return supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single()
    .then(function(res) {
      if (res.error) { console.error("DB load setting error:", key, res.error); return null; }
      return res.data ? res.data.value : null;
    });
}

// Load full state (reviews + agents + settings)
function dbLoadState() {
  return Promise.all([
    dbLoadReviews(),
    dbLoadAgents(),
    dbLoadSetting("brand"),
    dbLoadSetting("teams")
  ]).then(function(results) {
    return {
      items: results[0],
      agents: results[1],
      brand: results[2] || { name: "Axxess", primary: "#0099cc" },
      teams: results[3] || ["Sales", "Support", "Fibre Orders", "Accounts", "Walk-In Centre"]
    };
  });
}

// Upsert a single review
function dbUpsertReview(item) {
  return supabase
    .from("reviews")
    .upsert(itemToDbRow(item), { onConflict: "id" })
    .then(function(res) {
      if (res.error) console.error("DB upsert review error:", res.error);
      return res;
    });
}

// Upsert multiple reviews (batch)
function dbUpsertReviews(items) {
  if (!items || items.length === 0) return Promise.resolve();
  var rows = items.map(itemToDbRow);
  return supabase
    .from("reviews")
    .upsert(rows, { onConflict: "id" })
    .then(function(res) {
      if (res.error) console.error("DB batch upsert error:", res.error);
      return res;
    });
}

// Delete a review
function dbDeleteReview(id) {
  return supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .then(function(res) {
      if (res.error) console.error("DB delete review error:", res.error);
      return res;
    });
}

// Update a single review field(s)
function dbUpdateReview(id, patch) {
  var dbPatch = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.agent !== undefined) dbPatch.agent = patch.agent;
  if (patch.team !== undefined) dbPatch.team = patch.team;
  if (patch.managerRating !== undefined) dbPatch.manager_rating = patch.managerRating;
  if (patch.sentiment !== undefined) dbPatch.sentiment = patch.sentiment;
  if (patch.theme !== undefined) dbPatch.theme = patch.theme;
  if (patch.keywords !== undefined) dbPatch.keywords = patch.keywords;
  if (patch.rating !== undefined) dbPatch.rating = patch.rating;
  if (patch.text !== undefined) dbPatch.text = patch.text;
  if (patch.tvSnippet !== undefined) dbPatch.tv_snippet = patch.tvSnippet;
  if (patch.reviewerName !== undefined) dbPatch.reviewer_name = patch.reviewerName;

  return supabase
    .from("reviews")
    .update(dbPatch)
    .eq("id", id)
    .then(function(res) {
      if (res.error) console.error("DB update review error:", res.error);
      return res;
    });
}

// Upsert an agent
function dbUpsertAgent(agent) {
  return supabase
    .from("agents")
    .upsert({ id: agent.id, name: agent.name, team: agent.team, email: agent.email || "" }, { onConflict: "id" })
    .then(function(res) {
      if (res.error) console.error("DB upsert agent error:", res.error);
      return res;
    });
}

// Delete an agent
function dbDeleteAgent(id) {
  return supabase
    .from("agents")
    .delete()
    .eq("id", id)
    .then(function(res) {
      if (res.error) console.error("DB delete agent error:", res.error);
      return res;
    });
}

// Save a setting
function dbSaveSetting(key, value) {
  return supabase
    .from("settings")
    .upsert({ key: key, value: value }, { onConflict: "key" })
    .then(function(res) {
      if (res.error) console.error("DB save setting error:", res.error);
      return res;
    });
}

// Save teams
function dbSaveTeams(teams) {
  return dbSaveSetting("teams", teams);
}

// Save brand
function dbSaveBrand(brand) {
  return dbSaveSetting("brand", brand);
}

// Save TV config
function dbSaveTvConfig(config) {
  return dbSaveSetting("tv_config", config);
}

// Load TV config
function dbLoadTvConfig() {
  return dbLoadSetting("tv_config");
}

// Delete all reviews (for reset)
function dbDeleteAllReviews() {
  return supabase
    .from("reviews")
    .delete()
    .neq("id", "")
    .then(function(res) {
      if (res.error) console.error("DB delete all reviews error:", res.error);
      return res;
    });
}

console.log("Supabase client initialized:", SUPABASE_URL);
