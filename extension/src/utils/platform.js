import { platformMap } from "../config/platformMap.js";

export function getPlatformInfo(domain) {
  if (!domain) {
    return {
      type: "unknown",
      interaction: "unknown"
    };
  }

  const clean = domain.replace(/^www\./, "");

  // direct match
  if (platformMap[clean]) {
    return platformMap[clean];
  }

  // partial/domain-family match
  for (const key of Object.keys(platformMap)) {
    if (clean === key || clean.endsWith(`.${key}`)) {
      return platformMap[key];
    }
  }

  return {
    type: "unknown",
    interaction: "unknown"
  };
}