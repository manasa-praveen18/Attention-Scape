import { getEvents } from "../src/storage/storage.js";
import { getPlatformInfo } from "../src/utils/platform.js";
import {
  getTimeSpentEvents,
  getDomainTimeMap,
  getSortedDomainTimes,
  getAttentionShareData
} from "../src/analytics/domainStats.js";
import { renderAttentionGravityMap } from "../src/insights/attentionGravity.js";

function isToday(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function cleanDomain(domain) {
  if (!domain) return "-";
  return domain.replace(/^www\./, "");
}

function formatMinutes(ms) {
  return `${(ms / 60000).toFixed(1)} min`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getTodayEvents(events) {
  return events.filter((event) => isToday(event.timestamp));
}

function getVisitEvents(events) {
  return events.filter((event) => event.type === "visit");
}

function getTotalTrackedTime(domainMap) {
  return Object.values(domainMap).reduce((sum, ms) => sum + ms, 0);
}

function renderTimeline(events) {
  const list = document.getElementById("timeline-list");
  if (!list) return;

  list.innerHTML = "";

  const recent = [...events]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  if (recent.length === 0) {
    list.innerHTML = `<li class="empty">No browsing data yet.</li>`;
    return;
  }

  for (const event of recent) {
    const li = document.createElement("li");
    li.className = "timeline-item";

    li.innerHTML = `
      <span class="timeline-time">${formatTime(event.timestamp)}</span>
      <span class="timeline-domain">${cleanDomain(event.domain)}</span>
      <span class="timeline-title">${event.title || "Untitled page"}</span>
    `;

    list.appendChild(li);
  }
}

function renderGravityList(sortedDomainTimes, totalTime) {
  const list = document.getElementById("gravity-list");
  if (!list) return;

  list.innerHTML = "";

  if (sortedDomainTimes.length === 0) {
    list.innerHTML = `<li class="empty">No attention gravity data yet.</li>`;
    return;
  }

  for (const [domain, ms] of sortedDomainTimes.slice(0, 8)) {
    const share = totalTime > 0 ? ((ms / totalTime) * 100).toFixed(1) : "0.0";
    const info = getPlatformInfo(domain);

    const li = document.createElement("li");
    li.className = "gravity-item";

    li.innerHTML = `
      <div class="gravity-top">
        <span class="gravity-domain">${cleanDomain(domain)}</span>
        <span>${share}%</span>
      </div>
      <div class="gravity-meta">
        ${formatMinutes(ms)} • ${info.type} • ${info.interaction}
      </div>
    `;

    list.appendChild(li);
  }
}

function setCard(idValue, idText, value, text) {
  const valueEl = document.getElementById(idValue);
  const textEl = document.getElementById(idText);

  if (valueEl) valueEl.textContent = value;
  if (textEl) textEl.textContent = text;
}

function buildSummary(sortedDomainTimes, totalTime) {
  if (sortedDomainTimes.length === 0) {
    return "No meaningful browsing patterns detected yet today.";
  }

  const [topDomain, topMs] = sortedDomainTimes[0];
  const share = totalTime > 0 ? ((topMs / totalTime) * 100).toFixed(0) : "0";

  return `${cleanDomain(topDomain)} held the strongest attention gravity today, capturing about ${share}% of your tracked attention so far.`;
}

function computeDiversity(sortedDomainTimes) {
  const uniqueDomains = sortedDomainTimes.length;

  if (uniqueDomains >= 8) {
    return {
      value: "High",
      text: "Your browsing moved across a broad range of sources today."
    };
  }

  if (uniqueDomains >= 4) {
    return {
      value: "Medium",
      text: "Your browsing shows some variety, but attention is still concentrated in a few places."
    };
  }

  return {
    value: "Low",
    text: "Your browsing stayed within a narrow set of sources today."
  };
}

function computeGravity(sortedDomainTimes, totalTime) {
  if (sortedDomainTimes.length === 0) {
    return {
      value: "--",
      text: "No strong attention pull detected yet."
    };
  }

  const [topDomain, topMs] = sortedDomainTimes[0];
  const share = totalTime > 0 ? ((topMs / totalTime) * 100).toFixed(0) : "0";

  return {
    value: cleanDomain(topDomain),
    text: `${cleanDomain(topDomain)} captured about ${share}% of your tracked attention.`
  };
}

function computeAgency(sortedDomainTimes) {
  if (sortedDomainTimes.length === 0) {
    return {
      value: "--",
      text: "Not enough activity to estimate browsing agency yet."
    };
  }

  const topDomain = sortedDomainTimes[0][0];
  const info = getPlatformInfo(topDomain);

  if (info.interaction === "intent" || info.interaction === "documentation") {
    return {
      value: "Higher",
      text: "Your recent browsing appears more self-directed than platform-led."
    };
  }

  if (info.interaction === "algorithmic") {
    return {
      value: "Lower",
      text: "A large share of your attention came from algorithm-driven environments."
    };
  }

  return {
    value: "Mixed",
    text: "Your browsing shows a balance between self-directed and platform-shaped attention."
  };
}

function computeDrift(visitEvents, sortedDomainTimes) {
  if (sortedDomainTimes.length === 0) {
    return {
      value: "Low",
      text: "No strong attention drift pattern detected yet."
    };
  }

  const totalTime = sortedDomainTimes.reduce((sum, [, ms]) => sum + ms, 0);
  const topDomain = sortedDomainTimes[0][0];
  const topShare = totalTime > 0 ? sortedDomainTimes[0][1] / totalTime : 0;
  const topInfo = getPlatformInfo(topDomain);

  if (topShare >= 0.5 && topInfo.interaction === "algorithmic") {
    return {
      value: "Rising",
      text: "Recent browsing is narrowing into a smaller loop of repeated destinations."
    };
  }

  if (topShare >= 0.7) {
    return {
      value: "Rising",
      text: "Recent browsing is narrowing into a smaller loop of repeated destinations."
    };
  }

  return {
    value: "Stable",
    text: "Your browsing pattern does not currently show a strong drift loop."
  };
}

function computeEvolution(visitEvents) {
  if (visitEvents.length < 4) {
    return {
      value: "Early",
      text: "Not enough linked browsing steps yet to detect idea evolution."
    };
  }

  const lastTitles = visitEvents.slice(-4).map((e) => e.title).filter(Boolean);

  if (lastTitles.length >= 3) {
    return {
      value: "Active",
      text: "Your recent browsing suggests topic movement across multiple pages."
    };
  }

  return {
    value: "Weak",
    text: "Recent activity shows limited visible progression across ideas."
  };
}

function getEvolutionEvents(visitEvents) {
  const sorted = [...visitEvents].sort((a, b) => a.timestamp - b.timestamp);

  const deduped = [];

  for (const event of sorted) {
    const previous = deduped[deduped.length - 1];

    if (
      previous &&
      cleanDomain(previous.domain) === cleanDomain(event.domain) &&
      (previous.title || "") === (event.title || "")
    ) {
      continue;
    }

    deduped.push(event);
  }

  return deduped.slice(-10);
}

function buildTransitionNote(current, next) {
  if (!next) return "Current endpoint in this browsing path.";

  const currentInfo = getPlatformInfo(current.domain);
  const nextInfo = getPlatformInfo(next.domain);

  if (currentInfo.type !== nextInfo.type) {
    return `Shifted from ${currentInfo.type} to ${nextInfo.type}.`;
  }

  if (cleanDomain(current.domain) !== cleanDomain(next.domain)) {
    return "Moved across sources within a related browsing path.";
  }

  return "Continued within the same platform environment.";
}

function renderEvolutionFlow(visitEvents) {
  const container = document.getElementById("evolution-flow");
  if (!container) return;

  container.innerHTML = "";

  const steps = getEvolutionEvents(visitEvents);

  if (steps.length === 0) {
    container.innerHTML = `<div class="empty">No idea evolution trail yet.</div>`;
    return;
  }

  steps.forEach((event, index) => {
    const info = getPlatformInfo(event.domain);
    const next = steps[index + 1];

    const card = document.createElement("div");
    card.className = "evolution-step";

    card.innerHTML = `
      <span class="evolution-badge" style="background:${getTypeColor(info.type)}">
        ${info.type}
      </span>
      <span class="evolution-time">${formatTime(event.timestamp)}</span>
      <h4 class="evolution-domain">${cleanDomain(event.domain)}</h4>
      <p class="evolution-title">${event.title || "Untitled page"}</p>
      <div class="evolution-note">${buildTransitionNote(event, next)}</div>
    `;

    container.appendChild(card);
  });
}
function getDriftEvents(visitEvents) {
  const sorted = [...visitEvents].sort((a, b) => a.timestamp - b.timestamp);

  const deduped = [];

  for (const event of sorted) {
    const previous = deduped[deduped.length - 1];

    // Only skip exact back-to-back same domain — allow same domain to reappear
    // after visiting other sites so loops are visible in the path
    if (
      previous &&
      cleanDomain(previous.domain) === cleanDomain(event.domain)
    ) {
      continue;
    }

    deduped.push(event);
  }

  return deduped.slice(-8);
}

function analyzeDrift(visitEvents) {
  const steps = getDriftEvents(visitEvents);

  if (steps.length < 2) {
    return {
      value: "Early",
      text: "Not enough browsing movement yet to detect a clear drift pattern.",
      steps
    };
  }

  const domains = steps.map((event) => cleanDomain(event.domain));
  const uniqueCount = new Set(domains).size;

  const counts = {};
  for (const domain of domains) {
    counts[domain] = (counts[domain] || 0) + 1;
  }

  const repeatedDomains = Object.values(counts).filter((count) => count >= 2).length;
  const maxRepeat = Math.max(...Object.values(counts));

  const lastFour = domains.slice(-4);
  const lastFourUnique = new Set(lastFour).size;

  if (maxRepeat >= 2 || lastFourUnique <= 2) {
    return {
      value: "Loop Forming",
      text: "Recent browsing is circling back to the same destinations, suggesting attention may be shifting from exploration into autopilot.",
      steps
    };
  }

  if (repeatedDomains >= 2 || uniqueCount <= Math.ceil(steps.length / 2)) {
    return {
      value: "Narrowing",
      text: "Attention is still moving, but it is beginning to concentrate in a smaller set of recurring sources.",
      steps
    };
  }

  return {
    value: "Exploratory",
    text: "Your recent browsing path still looks varied and exploratory rather than looped.",
    steps
  };
}

function getDriftStepClass(steps, index) {
  const current = cleanDomain(steps[index].domain);
  const previous = index > 0 ? cleanDomain(steps[index - 1].domain) : null;

  const occurrences = steps
    .slice(0, index + 1)
    .filter((step) => cleanDomain(step.domain) === current).length;

  if (previous && previous === current) {
    return "drift-step loop";
  }

  if (occurrences >= 2) {
    return "drift-step repeat";
  }

  return "drift-step";
}

function getDriftNote(steps, index) {
  const current = cleanDomain(steps[index].domain);
  const previous = index > 0 ? cleanDomain(steps[index - 1].domain) : null;

  const occurrences = steps
    .slice(0, index + 1)
    .filter((step) => cleanDomain(step.domain) === current).length;

  if (previous && previous === current) {
    return "Immediate repeat";
  }

  if (occurrences >= 2) {
    return "Returning to earlier source";
  }

  return "New step in path";
}

function renderDriftPanel(visitEvents) {
  const driftValue = document.getElementById("drift-visual-value");
  const driftText = document.getElementById("drift-visual-text");
  const container = document.getElementById("drift-path");

  if (!driftValue || !driftText || !container) return;

  const analysis = analyzeDrift(visitEvents);

  driftValue.textContent = analysis.value;
  driftText.textContent = analysis.text;

  container.innerHTML = "";

  if (!analysis.steps.length) {
    container.innerHTML = `<div class="empty">No drift path available yet.</div>`;
    return;
  }

  analysis.steps.forEach((event, index) => {
    const step = document.createElement("div");
    step.className = getDriftStepClass(analysis.steps, index);

    step.innerHTML = `
      <div class="drift-step-header">
        <h4 class="drift-domain">${cleanDomain(event.domain)}</h4>
        <span class="drift-time">${formatTime(event.timestamp)}</span>
      </div>
      <p class="drift-title">${event.title || "Untitled page"}</p>
      <div class="drift-note">${getDriftNote(analysis.steps, index)}</div>
    `;

    container.appendChild(step);
  });
}
function computeAgencyMeterData(visitEvents, sortedDomainTimes) {
  if (!visitEvents.length || !sortedDomainTimes.length) {
    return {
      score: 50,
      value: "Insufficient Data",
      text: "Not enough activity to estimate browsing agency yet."
    };
  }

  let score = 50;

  const recentVisits = visitEvents.slice(-12);

  for (const event of recentVisits) {
    const info = getPlatformInfo(event.domain);

    if (info.interaction === "intent") score -= 12;
    if (info.interaction === "documentation") score -= 10;
    if (info.interaction === "reference") score -= 8;
    if (info.interaction === "practice") score -= 8;
    if (info.interaction === "community") score += 2;
    if (info.interaction === "editorial") score += 4;
    if (info.interaction === "network") score += 4;
    if (info.interaction === "algorithmic") score += 12;
  }

  const domains = recentVisits.map((e) => cleanDomain(e.domain));
  const uniqueDomains = new Set(domains).size;

  if (uniqueDomains >= 6) score -= 8;
  if (uniqueDomains <= 3) score += 8;

  const counts = {};
  for (const domain of domains) {
    counts[domain] = (counts[domain] || 0) + 1;
  }

  const maxRepeat = Math.max(...Object.values(counts));
  if (maxRepeat >= 3) score += 10;

  score = Math.max(0, Math.min(100, score));

  if (score <= 33) {
    return {
      score,
      value: "High Agency",
      text: "Your browsing appears mostly self-directed, with stronger signals of intentional navigation and lower dependence on platform-led loops."
    };
  }

  if (score <= 66) {
    return {
      score,
      value: "Mixed Agency",
      text: "Your browsing shows a balance between intentional exploration and platform-shaped attention."
    };
  }

  return {
    score,
    value: "Low Agency",
    text: "A large share of recent browsing appears influenced by algorithmic or recurring platform-led attention patterns."
  };
}

function renderAgencyMeter(visitEvents, sortedDomainTimes) {
  const marker = document.getElementById("agency-marker");
  const fill = document.getElementById("agency-fill");
  const valueEl = document.getElementById("agency-meter-value");
  const textEl = document.getElementById("agency-meter-text");

  if (!marker || !fill || !valueEl || !textEl) return;

  const agency = computeAgencyMeterData(visitEvents, sortedDomainTimes);

  marker.style.left = `${agency.score}%`;
  fill.style.width = `${agency.score}%`;

  valueEl.textContent = `${agency.value} (${agency.score}/100)`;
  textEl.textContent = agency.text;
}
function getTypeColor(type) {
  const colors = {
    search: "#3b82f6",
    video: "#8b5cf6",
    knowledge: "#22c55e",
    development: "#22c55e",
    community: "#f97316",
    social: "#ef4444",
    professional: "#06b6d4",
    news: "#eab308",
    unknown: "#64748b"
  };

  return colors[type] || colors.unknown;
}

function getDiversityTypeMap(timeEvents) {
  const totals = {};

  for (const event of timeEvents) {
    const info = getPlatformInfo(event.domain);
    const type = info.type || "unknown";
    totals[type] = (totals[type] || 0) + (event.duration || 0);
  }

  return totals;
}

function getSortedTypeTimes(typeMap) {
  return Object.entries(typeMap).sort((a, b) => b[1] - a[1]);
}

function computeDiversityVisual(timeEvents) {
  const typeMap = getDiversityTypeMap(timeEvents);
  const sorted = getSortedTypeTimes(typeMap);
  const total = Object.values(typeMap).reduce((sum, ms) => sum + ms, 0);

  if (!sorted.length || total === 0) {
    return {
      value: "Insufficient Data",
      text: "Not enough tracked activity to estimate information diversity yet.",
      sorted,
      total
    };
  }

  const topShare = sorted[0][1] / total;
  const activeTypes = sorted.length;

  if (activeTypes >= 5 && topShare < 0.45) {
    return {
      value: "Broad",
      text: "Your attention spread across multiple source environments rather than staying concentrated in one dominant ecosystem.",
      sorted,
      total
    };
  }

  if (activeTypes >= 3 && topShare < 0.65) {
    return {
      value: "Moderate",
      text: "Your browsing shows some variety, but a few source types are shaping most of the information flow.",
      sorted,
      total
    };
  }

  return {
    value: "Narrow",
    text: "Your information intake is concentrated in a limited set of source environments, which may reduce perspective diversity.",
    sorted,
    total
  };
}

function renderDiversityPanel(timeEvents) {
  const valueEl = document.getElementById("diversity-visual-value");
  const textEl = document.getElementById("diversity-visual-text");
  const barsEl = document.getElementById("diversity-bars");

  if (!valueEl || !textEl || !barsEl) return;

  const diversity = computeDiversityVisual(timeEvents);

  valueEl.textContent = diversity.value;
  textEl.textContent = diversity.text;
  barsEl.innerHTML = "";

  if (!diversity.sorted.length || diversity.total === 0) {
    barsEl.innerHTML = `<div class="empty">No diversity breakdown available yet.</div>`;
    return;
  }

  for (const [type, ms] of diversity.sorted) {
    const percent = (ms / diversity.total) * 100;

    const row = document.createElement("div");
    row.className = "diversity-row";

    row.innerHTML = `
      <div class="diversity-label">${type}</div>
      <div class="diversity-bar-track">
        <div class="diversity-bar-fill" style="width:${percent}%; background:${getTypeColor(type)}"></div>
      </div>
      <div class="diversity-value">${percent.toFixed(1)}%</div>
    `;

    barsEl.appendChild(row);
  }
}
async function loadDashboard() {
  try {
    const allEvents = await getEvents();
    const todayEvents = getTodayEvents(allEvents);
    const timeEvents = getTimeSpentEvents(todayEvents);
    const visitEvents = getVisitEvents(todayEvents);

    const domainMap = getDomainTimeMap(timeEvents);
    const sortedDomainTimes = getSortedDomainTimes(domainMap);
    const attentionShares = getAttentionShareData(domainMap);
    const totalTime = getTotalTrackedTime(domainMap);

    const summaryEl = document.getElementById("summary-text");
    if (summaryEl) {
      summaryEl.textContent = buildSummary(sortedDomainTimes, totalTime);
    }

    const drift = computeDrift(visitEvents, sortedDomainTimes);
    const agency = computeAgency(sortedDomainTimes);
    const diversity = computeDiversity(sortedDomainTimes);
    const evolution = computeEvolution(visitEvents);
    const gravity = computeGravity(sortedDomainTimes, totalTime);

    setCard("drift-value", "drift-text", drift.value, drift.text);
    setCard("agency-value", "agency-text", agency.value, agency.text);
    setCard("diversity-value", "diversity-text", diversity.value, diversity.text);
    setCard("evolution-value", "evolution-text", evolution.value, evolution.text);
    setCard("gravity-value", "gravity-text", gravity.value, gravity.text);

    renderTimeline(todayEvents);
    renderGravityList(sortedDomainTimes, totalTime);
    renderEvolutionFlow(visitEvents);
    renderDriftPanel(visitEvents);
    renderAgencyMeter(visitEvents, sortedDomainTimes);
    renderDiversityPanel(timeEvents);

    const canvas = document.getElementById("gravity-canvas");
    renderAttentionGravityMap(canvas, attentionShares);
  } catch (error) {
    console.error("Error loading dashboard:", error);

    const summaryEl = document.getElementById("summary-text");
    if (summaryEl) {
      summaryEl.textContent = "Something went wrong while loading your dashboard.";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);