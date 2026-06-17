// Canonical public site URL for SEO (sitemap, canonical links, Open Graph).
//
// On Vercel, NEXT_PUBLIC_SITE_URL is often set to the *.vercel.app deployment
// URL, and requests may also be crawled through that host. We must never expose
// a *.vercel.app address in SEO output, so we ignore such values and fall back
// to the production domain.
const CANONICAL_FALLBACK = "https://brami.shop";

export function isVercelHost(host: string): boolean {
  return host.endsWith(".vercel.app");
}

function resolveCanonical(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return CANONICAL_FALLBACK;
  try {
    if (isVercelHost(new URL(raw).hostname)) return CANONICAL_FALLBACK;
  } catch {
    return CANONICAL_FALLBACK;
  }
  return raw.replace(/\/$/, "");
}

export const SITE_URL = resolveCanonical();
