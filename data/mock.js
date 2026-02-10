export const seed = {
  brand: {
    name: "Axxess",
    primary: "#0B7EA8"
  },
  teams: ["Sales", "Support", "Fibre Orders", "Accounts", "Walk-In Centre"],
  agents: [
    { id: "AG-001", name: "Leah Mokoena", team: "Support", email: "leah.mokoena@axxess.local", aliases: ["Leah", "L. Mokoena"] },
    { id: "AG-002", name: "Kyle Jacobs", team: "Sales", email: "kyle.jacobs@axxess.local", aliases: ["Kyle", "K. Jacobs"] },
    { id: "AG-003", name: "Nandi Dlamini", team: "Fibre Orders", email: "nandi.dlamini@axxess.local", aliases: ["Nandi", "N. Dlamini"] },
    { id: "AG-004", name: "Ethan Naidoo", team: "Accounts", email: "ethan.naidoo@axxess.local", aliases: ["Ethan", "E. Naidoo"] },
    { id: "AG-005", name: "Ayesha Khan", team: "Walk-In Centre", email: "ayesha.khan@axxess.local", aliases: ["Ayesha", "A. Khan"] },
    { id: "AG-006", name: "Siyabonga Zulu", team: "Support", email: "siya.zulu@axxess.local", aliases: ["Siya", "S. Zulu"] },
    { id: "AG-007", name: "Mia van Wyk", team: "Sales", email: "mia.vanwyk@axxess.local", aliases: ["Mia", "M. van Wyk"] },
    { id: "AG-008", name: "Thabo Maseko", team: "Fibre Orders", email: "thabo.maseko@axxess.local", aliases: ["Thabo", "T. Maseko"] },
    { id: "AG-009", name: "Priya Pillay", team: "Accounts", email: "priya.pillay@axxess.local", aliases: ["Priya", "P. Pillay"] },
    { id: "AG-010", name: "Liam Smith", team: "Walk-In Centre", email: "liam.smith@axxess.local", aliases: ["Liam", "L. Smith"] }
  ],
  items: generateItems()
};

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
    "{word} experience overall — {agent} {reasonLower}."
  ];

  const templatesNeutral = [
    "Service was {word}. {agent} helped, but {neutral}.",
    "{agent} was {word}, but {neutral}.",
    "Overall {word}. {neutral}."
  ];

  const templatesNegative = [
    "{neg}. {neg2}.",
    "Very {neg}. {neg2}.",
    "Not happy — {neg}. {neg2}."
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
        .replaceAll("{word}", word)
        .replaceAll("{word2}", word2)
        .replaceAll("{agent}", a.name)
        .replaceAll("{reason}", reason.charAt(0).toUpperCase() + reason.slice(1))
        .replaceAll("{reasonLower}", reasonLower);
      keywords = pickMany(rng, [...new Set([word, word2, ...pickMany(rng, positiveWords, 1, 3)])], 3, 6);
      if (source === "Google") {
        rating = rng() < 0.72 ? 5 : 4;
      }
      tvSnippet = `${word.charAt(0).toUpperCase() + word.slice(1)} — ${theme || "Great service"}.`;
    } else if (sentiment === "Neutral") {
      text = pick(rng, templatesNeutral)
        .replaceAll("{word}", pick(rng, ["good", "okay", "fine"]))
        .replaceAll("{agent}", a.name)
        .replaceAll("{neutral}", neutral);
      keywords = pickMany(rng, neutralKeywords, 2, 4);
      if (source === "Google") rating = rng() < 0.6 ? 3 : 4;
    } else {
      text = pick(rng, templatesNegative)
        .replaceAll("{neg}", neg)
        .replaceAll("{neg2}", neg2);
      keywords = pickMany(rng, negKeywords, 2, 5);
      if (source === "Google") rating = rng() < 0.6 ? 1 : 2;
    }

    const maybeUnknown = rng() < 0.07;
    const agent = maybeUnknown ? "Unknown" : a.name;
    const team = maybeUnknown ? "Unknown" : a.team;

    items.push({
      id: `IT-${String(20000 + i).padStart(5, "0")}`,
      createdAt: created.toISOString(),
      source,
      rating,
      sentiment,
      status,
      agent,
      team,
      theme,
      keywords,
      tvSnippet,
      text
    });
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return items;
}
