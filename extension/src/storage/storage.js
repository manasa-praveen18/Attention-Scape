export async function saveEvent(event) {
  const result = await chrome.storage.local.get(["events"]);
  const events = result.events || [];

  events.push(event);

  // keep only last 5000 events
  const MAX_EVENTS = 5000;
  const trimmed = events.slice(-MAX_EVENTS);

  await chrome.storage.local.set({ events: trimmed });
}

export async function getEvents() {
  const result = await chrome.storage.local.get(["events"]);
  return result.events || [];
}