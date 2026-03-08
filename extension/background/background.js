import { getDomainFromUrl } from "../src/utils/utils.js";
import { saveEvent } from "../src/storage/storage.js";

let activeTabId = null;
let activeDomain = null;
let activeTitle = null;
let activeUrl = null;
let activeStartTime = null;

const sensitiveDomains = [
  "mail.google.com",
  "outlook.com",
  "web.whatsapp.com",
  "accounts.google.com",
  "bank",
  "webmd.com",
  "mayoclinic.org",
  "healthline.com",
  "medlineplus.gov",
  "nih.gov",
  "nhs.uk",
  "drugs.com",
  "rxlist.com",
  "psychologytoday.com",
  "betterhelp.com",
  "talkspace.com",
  "zocdoc.com",
  "mychart",
];

async function isStrictPrivacyEnabled() {
  const result = await chrome.storage.local.get(["strictPrivacy"]);
  // strict privacy is ON by default
  return result.strictPrivacy !== false;
}

async function getSafeTitle(domain, title) {
  const strict = await isStrictPrivacyEnabled();
  // if strict privacy is OFF, always return the real title
  if (!strict) return title || "";
  // if strict privacy is ON, suppress title only for sensitive domains
  if (sensitiveDomains.some((s) => domain.includes(s))) return "";
  return title || "";
}

async function saveTimeSpentEvent(endTime = Date.now()) {
  if (!activeDomain || !activeStartTime) return;

  const duration = endTime - activeStartTime;

  // Ignore tiny durations like accidental switches
  if (duration < 1000) return;

  // Resolve the title before building the event object
  const safeTitle = await getSafeTitle(activeDomain, activeTitle);

  const event = {
    type: "time_spent",
    timestamp: endTime,
    domain: activeDomain,
    title: safeTitle,
    tabId: activeTabId,
    duration: duration
  };

  await saveEvent(event);
}

async function startTrackingTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);

    if (!tab.url || tab.url.startsWith("chrome://")) {
      activeTabId = null;
      activeDomain = null;
      activeTitle = null;
      activeUrl = null;
      activeStartTime = null;
      return;
    }

    const domain = getDomainFromUrl(tab.url);

    if (!domain) {
      activeTabId = null;
      activeDomain = null;
      activeTitle = null;
      activeUrl = null;
      activeStartTime = null;
      return;
    }

    activeTabId = tabId;
    activeDomain = domain;
    activeTitle = tab.title || "";
    activeUrl = tab.url || "";
    activeStartTime = Date.now();
  } catch (error) {
    console.error("Error starting tab tracking:", error);
  }
}

// Track page visits
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  try {
    const url = details.url;

    if (!url || url.startsWith("chrome://")) return;

    const domain = getDomainFromUrl(url);

    if (!domain) return;

    const tab = await chrome.tabs.get(details.tabId);

    // Resolve the title before building the event object
    const safeTitle = await getSafeTitle(domain, tab.title);

    const event = {
      type: "visit",
      timestamp: Date.now(),
      domain: domain,
      title: safeTitle,
      tabId: details.tabId
    };

    await saveEvent(event);
  } catch (error) {
    console.error("Error saving browsing event:", error);
  }
});

// Track tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    await saveTimeSpentEvent();
    await startTrackingTab(activeInfo.tabId);
  } catch (error) {
    console.error("Error handling tab activation:", error);
  }
});

// Track URL/title changes in the same tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (tabId !== activeTabId) return;
    if (changeInfo.status !== "complete") return;
    if (!tab.url || tab.url.startsWith("chrome://")) return;

    const newDomain = getDomainFromUrl(tab.url);

    if (!newDomain) return;

    // Save old page session before switching to new page
    if (
      newDomain !== activeDomain ||
      (tab.title || "") !== (activeTitle || "") ||
      (tab.url || "") !== (activeUrl || "")
    ) {
      await saveTimeSpentEvent();
      await startTrackingTab(tabId);
    }
  } catch (error) {
    console.error("Error handling tab update:", error);
  }
});

// Stop timer when Chrome loses focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  try {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await saveTimeSpentEvent();

      activeTabId = null;
      activeDomain = null;
      activeTitle = null;
      activeUrl = null;
      activeStartTime = null;
    }
  } catch (error) {
    console.error("Error handling window focus change:", error);
  }
});