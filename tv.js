import { computeLeaderboards, loadState } from "./data/store.js";

const root = document.documentElement;

const elWeek = document.getElementById("tvWeek");
const elWeekSmall = document.getElementById("tvWeekSmall");
const elMonth = document.getElementById("tvMonth");
const weeklyList = document.getElementById("weeklyList");
const podium = document.getElementById("monthlyPodium");
const ticker = document.getElementById("ticker");

const slide = document.getElementById("highlightSlide");
const counter = document.getElementById("slideCounter");

let highlightIdx = 0;
let highlights = [];

function formatWeekRange(startIso) {
  const d = new Date(startIso);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (x) =>
    x.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  return `Week of ${fmt(d)} - ${fmt(end)}`;
}

function formatMonthLabel(now = new Date()) {
  return now.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function render() {
  const state = loadState();
  root.style.setProperty("--brand", state.brand.primary);

  const now = new Date();
  const lb = computeLeaderboards(state, now);

  elWeek.textContent = formatWeekRange(lb.weekStart);
  elWeekSmall.textContent = formatWeekRange(lb.weekStart);
  elMonth.textContent = formatMonthLabel(now);

  weeklyList.innerHTML = lb.weeklyTop
    .map(
      (r, i) => `
      <div class="rankRow">
        <div class="rankBadge">${i + 1}</div>
        <div>
          <div class="name">${r.agent}</div>
          <div class="meta"><span class="pill">${r.team}</span> <span class="pill">${r.count} mentions</span></div>
        </div>
        <div class="score">
          <div class="scoreValue">${Math.round(r.score)}</div>
          <div class="reason">${(r.themes || []).join(" · ") || "Consistent great feedback"}</div>
        </div>
      </div>`
    )
    .join("");

  podium.innerHTML = lb.monthlyTop
    .map(
      (m, i) => `
      <div class="podiumCard">
        <div class="podiumTop">
          <div style="display:flex; gap:12px; align-items:center;">
            <div class="avatar">${initials(m.agent)}</div>
            <div>
              <div class="podiumName">#${i + 1} ${m.agent}</div>
              <div class="podiumMeta">${m.team} · MTD Score ${Math.round(m.score)}</div>
            </div>
          </div>
          <div class="rankBadge" style="width:44px; height:44px;">${i + 1}</div>
        </div>
        <div class="themeRow">
          ${(m.themes || []).map((t) => `<span class="themeChip">${t}</span>`).join("")}
        </div>
      </div>`
    )
    .join("");

  highlights = lb.highlights;
  highlightIdx = 0;
  renderSlide();

  const approvedCount = state.items.filter((i) => i.status === "Approved" && i.sentiment !== "Negative").length;
  const pendingCount = state.items.filter((i) => i.status === "Pending").length;
  const sync = `Approved: ${approvedCount} · Pending review: ${pendingCount}`;
  const theme = lb.weeklyTop[0]?.themes?.[0] ? `Top theme: ${lb.weeklyTop[0].themes[0]}` : "Top theme: Fast resolution";
  const totalReviews = state.items.length;
  const googleCount = state.items.filter((i) => i.source === "Google").length;
  const loop = [sync, theme, `Google reviews: ${googleCount}`, `Total reviews: ${totalReviews}`]
    .flatMap((t) => [t, t])
    .map((t) => `  ·  ${t}  ·  `)
    .join("");
  ticker.textContent = loop;
}

function renderSlide() {
  if (!highlights.length) {
    slide.innerHTML = `
      <div>
        <div class="quote">No approved highlights yet.</div>
        <div class="cardHint" style="margin-top:10px;">Approve items in the Manager Portal to see them here.</div>
      </div>
      <div class="sourceRow">
        <div class="cardHint">Waiting for approvals</div>
        <div class="sourceBadge">Manager Portal</div>
      </div>
    `;
    counter.textContent = "0/0";
    return;
  }

  const s = highlights[highlightIdx % highlights.length];
  const quote = s.tvSnippet || s.text;
  slide.innerHTML = `
    <div>
      <div class="quote">"${quote}"</div>
      <div class="kchipRow" style="margin-top:14px;">
        ${(s.keywords || []).slice(0, 6).map((k) => `<span class="kchip">${k}</span>`).join("")}
      </div>
    </div>

    <div class="sourceRow">
      <div>
        <div class="name" style="font-size:16px;">${s.agent}</div>
        <div class="meta"><span class="pill">${s.team}</span> ${s.theme ? `<span class="pill">Theme: ${s.theme}</span>` : ""}</div>
      </div>
      <div class="sourceBadge">${s.source}</div>
    </div>
  `;
  counter.textContent = `${(highlightIdx % highlights.length) + 1}/${highlights.length}`;
  highlightIdx += 1;
}

render();
setInterval(renderSlide, 9000);
setInterval(render, 15000);
