import { getEvents } from "../src/storage/storage.js";

function isToday(timestamp) {
  const eventDate = new Date(timestamp);
  const today = new Date();

  return (
    eventDate.getFullYear() === today.getFullYear() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getDate() === today.getDate()
  );
}

function countDomains(events) {
  const counts = {};

  for (const event of events) {
    if (!event.domain) continue;
    counts[event.domain] = (counts[event.domain] || 0) + 1;
  }

  return counts;
}

function getTopDomains(domainCounts, limit = 5) {
  return Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

async function loadPopupData() {
  const allEvents = await getEvents();
  const todayEvents = allEvents.filter((event) => isToday(event.timestamp));

  document.getElementById(
    "total-events"
  ).textContent = `Today's browsing events: ${todayEvents.length}`;

  const topSitesList = document.getElementById("top-sites");
  topSitesList.innerHTML = "";

  const domainCounts = countDomains(todayEvents);
  const topDomains = getTopDomains(domainCounts);

  if (topDomains.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No browsing data yet.";
    topSitesList.appendChild(li);
    return;
  }

  for (const [domain, count] of topDomains) {
    const li = document.createElement("li");

    const domainSpan = document.createElement("span");
    domainSpan.textContent = domain;

    const visitsSpan = document.createElement("span");
    visitsSpan.className = "visits";
    visitsSpan.textContent = `${count} visits`;

    li.appendChild(domainSpan);
    li.appendChild(visitsSpan);
    topSitesList.appendChild(li);
  }
}

async function loadPrivacyToggle() {
  const result = await chrome.storage.local.get(["strictPrivacy"]);
  const toggle = document.getElementById("strict-privacy-toggle");

  // default is ON
  toggle.checked = result.strictPrivacy !== false;

  toggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ strictPrivacy: toggle.checked });
  });
}

loadPopupData();

document.addEventListener("DOMContentLoaded", () => {
  loadPrivacyToggle();

  const button = document.getElementById("open-dashboard");

  if (button) {
    button.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("dashboard/dashboard.html")
      });
    });
  }
});