// Order item images were stored as absolute URLs at creation time. Orders made
// on a dev/local host bake in e.g. http://localhost:3000/..., which breaks on
// the live domain. Strip such local origins to a site-relative path so the
// image resolves against whatever domain is serving the page. Genuine external
// URLs (CDNs, other domains) are left untouched.
export function normalizeOrderImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.endsWith(".local");
    return isLocal ? `${parsed.pathname}${parsed.search}` : url;
  } catch {
    return url;
  }
}
