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
    li.textContent = `${domain} — ${count} visits`;
    topSitesList.appendChild(li);
  }
}

loadPopupData();
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("open-dashboard");

  if (button) {
    button.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("dashboard/dashboard.html")
      });
    });
  }
});