import { getDomainFromUrl } from "../src/utils/utils.js";
import { saveEvent } from "../src/storage/storage.js";

let activeTabId = null;
let activeDomain = null;
let activeTitle = null;
let activeUrl = null;
let activeStartTime = null;

async function saveTimeSpentEvent(endTime = Date.now()) {
  if (!activeDomain || !activeStartTime) return;

  const duration = endTime - activeStartTime;

  // Ignore tiny durations like accidental switches
  if (duration < 1000) return;

  const event = {
    type: "time_spent",
    timestamp: endTime,
    domain: activeDomain,
    title: activeTitle || "",
    url: activeUrl || "",
    tabId: activeTabId,
    duration: duration
  };

  await saveEvent(event);
  console.log("Time spent event saved:", event);
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

    console.log("Started tracking tab:", {
      tabId: activeTabId,
      domain: activeDomain,
      title: activeTitle,
      url: activeUrl,
      startTime: activeStartTime
    });
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

    const event = {
      type: "visit",
      timestamp: Date.now(),
      domain: domain,
      title: tab.title || "",
      url: url,
      tabId: details.tabId
    };

    await saveEvent(event);

    console.log("Browsing event saved:", event);
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