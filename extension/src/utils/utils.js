export function getDomainFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname;
  } catch (error) {
    console.error("Invalid URL:", url, error);
    return null;
  }
}