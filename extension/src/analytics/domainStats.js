export function getTimeSpentEvents(events) {
  return events.filter((event) => event.type === "time_spent");
}

export function getDomainTimeMap(events) {
  const totals = {};

  for (const event of events) {
    if (!event.domain) continue;
    totals[event.domain] = (totals[event.domain] || 0) + (event.duration || 0);
  }

  return totals;
}

export function getSortedDomainTimes(domainMap) {
  return Object.entries(domainMap).sort((a, b) => b[1] - a[1]);
}

export function getTotalTrackedTime(domainMap) {
  return Object.values(domainMap).reduce((sum, ms) => sum + ms, 0);
}

export function getAttentionShareData(domainMap) {
  const totalTime = getTotalTrackedTime(domainMap);

  if (totalTime === 0) return [];

  return Object.entries(domainMap)
    .map(([domain, ms]) => ({
      domain,
      timeMs: ms,
      share: ms / totalTime
    }))
    .sort((a, b) => b.share - a.share);
}