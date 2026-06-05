import "server-only";

export type GeoLookup = {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
};

export const EMPTY_GEO: GeoLookup = {
  country: null,
  countryCode: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
  source: null,
};

// Vercel sets x-vercel-ip-country / x-vercel-ip-city etc. on every edge request.
// We use these as a zero-cost first source — no external API call needed.
export function geoFromVercelHeaders(headers: Headers): GeoLookup | null {
  const country = headers.get("x-vercel-ip-country");
  const city = headers.get("x-vercel-ip-city");
  const countryRegion = headers.get("x-vercel-ip-country-region");
  const lat = headers.get("x-vercel-ip-latitude");
  const lon = headers.get("x-vercel-ip-longitude");

  if (!country && !city && !countryRegion) return null;

  return {
    country: country ?? null,
    countryCode: country ?? null,
    region: countryRegion ?? null,
    city: city ? decodeURIComponent(city) : null,
    latitude: lat ? Number(lat) : null,
    longitude: lon ? Number(lon) : null,
    source: "vercel-headers",
  };
}

// Normalize IPv6-mapped IPv4 (::ffff:1.2.3.4 → 1.2.3.4) so downstream
// private-range checks and lookups operate on a plain v4 address.
export function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  const mapped = trimmed.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (mapped) return mapped[1];
  // Strip surrounding brackets from IPv6 (e.g. "[::1]:5432")
  const bracket = trimmed.match(/^\[([^\]]+)\]/);
  if (bracket) return bracket[1];
  return trimmed;
}

export function getClientIp(headers: Headers): { ip: string | null; source: string | null } {
  const candidates: Array<[string, string | null]> = [
    ["cf-connecting-ip", headers.get("cf-connecting-ip")],
    ["true-client-ip", headers.get("true-client-ip")],
    ["x-vercel-forwarded-for", headers.get("x-vercel-forwarded-for")],
    ["fly-client-ip", headers.get("fly-client-ip")],
    ["x-real-ip", headers.get("x-real-ip")],
    ["x-client-ip", headers.get("x-client-ip")],
    ["x-forwarded-for", headers.get("x-forwarded-for")],
  ];

  for (const [name, value] of candidates) {
    if (!value) continue;
    // x-forwarded-for can be comma-separated; client is leftmost.
    const first = value.split(",")[0]?.trim();
    const normalized = normalizeIp(first);
    if (normalized) return { ip: normalized, source: name };
  }

  return { ip: null, source: null };
}

export function isPrivateOrInvalidIp(ip: string | null): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // IPv6 ULA
  if (ip.startsWith("fe80:")) return true; // link-local
  if (ip.startsWith("169.254.")) return true; // IPv4 link-local
  return false;
}

async function tryIpwhois(ip: string, signal: AbortSignal): Promise<GeoLookup | null> {
  const res = await fetch(
    `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,region,city,latitude,longitude,message`,
    { signal, cache: "no-store" },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    country?: string;
    country_code?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  if (data.success === false) {
    console.warn("[track] ipwho.is rejected lookup", { ip, message: data.message });
    return null;
  }
  return {
    country: data.country ?? null,
    countryCode: data.country_code ?? null,
    region: data.region ?? null,
    city: data.city ?? null,
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    source: "ipwho.is",
  };
}

async function tryIpapiCo(ip: string, signal: AbortSignal): Promise<GeoLookup | null> {
  const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
    signal,
    cache: "no-store",
    headers: { "user-agent": "brami-visit-tracker/1.0" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    error?: boolean;
    reason?: string;
    country_name?: string;
    country_code?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  if (data.error) {
    console.warn("[track] ipapi.co rejected lookup", { ip, reason: data.reason });
    return null;
  }
  return {
    country: data.country_name ?? null,
    countryCode: data.country_code ?? null,
    region: data.region ?? null,
    city: data.city ?? null,
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    source: "ipapi.co",
  };
}

export async function geolocateIp(ip: string | null): Promise<GeoLookup> {
  if (isPrivateOrInvalidIp(ip)) return EMPTY_GEO;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const primary = await tryIpwhois(ip!, controller.signal).catch((err) => {
      console.warn("[track] ipwho.is fetch failed", { ip, error: String(err) });
      return null;
    });
    if (primary && primary.country) return primary;
  } finally {
    clearTimeout(timer);
  }

  // Fallback provider — separate AbortController so the 2.5s budget restarts.
  const fbController = new AbortController();
  const fbTimer = setTimeout(() => fbController.abort(), 2500);
  try {
    const fallback = await tryIpapiCo(ip!, fbController.signal).catch((err) => {
      console.warn("[track] ipapi.co fetch failed", { ip, error: String(err) });
      return null;
    });
    if (fallback && fallback.country) return fallback;
  } finally {
    clearTimeout(fbTimer);
  }

  return EMPTY_GEO;
}

// High-level: prefer Vercel edge headers (free, instant, no API), then fall
// back to external IP lookup. Returns the geo and source so callers can log it.
export async function resolveGeo(
  headers: Headers,
  ip: string | null,
): Promise<GeoLookup> {
  const fromVercel = geoFromVercelHeaders(headers);
  if (fromVercel && fromVercel.country) return fromVercel;
  return geolocateIp(ip);
}
