import { NextResponse } from "next/server";
import { createHash } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackPayload = {
  sessionId?: unknown;
  visitorToken?: unknown;
  fingerprint?: unknown;
  path?: unknown;
  title?: unknown;
  referrer?: unknown;
  timezone?: unknown;
};

type GeoLookup = {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

const EMPTY_GEO: GeoLookup = {
  country: null,
  countryCode: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function clip(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}

function getSalt() {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function hashIp(ip: string | null) {
  if (!ip) return null;
  return createHash("sha256").update(`${getSalt()}:${ip}`).digest("hex").slice(0, 32);
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

function isPrivateOrInvalidIp(ip: string | null): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // IPv6 ULA
  if (ip.startsWith("fe80:")) return true; // link-local
  return false;
}

// Best-effort IP geolocation via ipwho.is (no API key, free tier).
// Times out fast and silently falls back to nulls.
async function geolocateIp(ip: string | null): Promise<GeoLookup> {
  if (isPrivateOrInvalidIp(ip)) return EMPTY_GEO;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip!)}?fields=success,country,country_code,region,city,latitude,longitude`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!res.ok) return EMPTY_GEO;
    const data = (await res.json()) as {
      success?: boolean;
      country?: string;
      country_code?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    if (data.success === false) return EMPTY_GEO;
    return {
      country: data.country ?? null,
      countryCode: data.country_code ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
    };
  } catch {
    return EMPTY_GEO;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as TrackPayload | null;

  if (!body || !isNonEmptyString(body.sessionId) || !isNonEmptyString(body.path)) {
    return NextResponse.json({ error: "Invalid track payload." }, { status: 400 });
  }

  const sessionId = clip(body.sessionId.trim(), 64);
  const path = clip(body.path.trim(), 512);
  const title = isNonEmptyString(body.title) ? clip(body.title.trim(), 256) : null;
  const referrer = isNonEmptyString(body.referrer) ? clip(body.referrer.trim(), 512) : null;
  const visitorToken = isNonEmptyString(body.visitorToken)
    ? clip(body.visitorToken.trim(), 64)
    : null;
  const fingerprint = isNonEmptyString(body.fingerprint)
    ? clip(body.fingerprint.trim(), 128)
    : null;
  const userAgent = clip(request.headers.get("user-agent") ?? "", 512) || null;
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // 1) Resolve / create visitor.
  // Strategy: look up by visitor_token first (strongest signal — cookie-equivalent).
  // If no token match but we have a fingerprint, look that up too (catches cleared
  // localStorage on same browser).
  let visitor: {
    id: string;
    country: string | null;
    country_code: string | null;
    region: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null = null;

  if (visitorToken) {
    const { data } = await supabase
      .from("site_visitors")
      .select("id, country, country_code, region, city, latitude, longitude")
      .eq("visitor_token", visitorToken)
      .maybeSingle();
    if (data) visitor = data;
  }

  if (!visitor && fingerprint) {
    const { data } = await supabase
      .from("site_visitors")
      .select("id, country, country_code, region, city, latitude, longitude")
      .eq("fingerprint_hash", fingerprint)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) visitor = data;
  }

  // 2) Look up existing visit for this session id (incremental pageview).
  const { data: existingVisit, error: visitLookupError } = await supabase
    .from("site_visits")
    .select("id, pageview_count, visitor_id")
    .eq("session_id", sessionId)
    .maybeSingle<{ id: string; pageview_count: number; visitor_id: string | null }>();

  if (visitLookupError) {
    return NextResponse.json({ error: "Failed to look up visit." }, { status: 500 });
  }

  let visitId: string;
  let isNewVisit = false;
  let geo: GeoLookup = EMPTY_GEO;

  if (existingVisit) {
    visitId = existingVisit.id;
    const { error: updateError } = await supabase
      .from("site_visits")
      .update({
        last_seen_at: now,
        pageview_count: existingVisit.pageview_count + 1,
      })
      .eq("id", visitId);
    if (updateError) {
      return NextResponse.json({ error: "Failed to update visit." }, { status: 500 });
    }
  } else {
    isNewVisit = true;

    // Geo lookup only on new visits (one network hit per session, not per pageview).
    // Reuse the visitor's cached geo when present and IP unchanged conceptually —
    // we still re-fetch if the visitor has no geo yet.
    if (visitor && visitor.country) {
      geo = {
        country: visitor.country,
        countryCode: visitor.country_code,
        region: visitor.region,
        city: visitor.city,
        latitude: visitor.latitude,
        longitude: visitor.longitude,
      };
    } else {
      geo = await geolocateIp(ip);
    }

    // Create or upsert visitor first so we can link the visit.
    if (!visitor && visitorToken) {
      const { data: newVisitor, error: createVisitorError } = await supabase
        .from("site_visitors")
        .insert({
          visitor_token: visitorToken,
          fingerprint_hash: fingerprint,
          first_seen_at: now,
          last_seen_at: now,
          visit_count: 1,
          ip_hash: ipHash,
          country: geo.country,
          country_code: geo.countryCode,
          region: geo.region,
          city: geo.city,
          latitude: geo.latitude,
          longitude: geo.longitude,
        })
        .select("id, country, country_code, region, city, latitude, longitude")
        .single();

      if (createVisitorError) {
        // If it raced on unique constraint, fetch the existing row.
        const { data: raced } = await supabase
          .from("site_visitors")
          .select("id, country, country_code, region, city, latitude, longitude")
          .eq("visitor_token", visitorToken)
          .maybeSingle();
        visitor = raced ?? null;
      } else {
        visitor = newVisitor;
      }
    } else if (visitor) {
      // Existing visitor returning — bump count + refresh last_seen + backfill geo
      const { data: counterRow } = await supabase
        .from("site_visitors")
        .select("visit_count")
        .eq("id", visitor.id)
        .single<{ visit_count: number }>();

      const updatePayload: Record<string, unknown> = {
        last_seen_at: now,
        visit_count: (counterRow?.visit_count ?? 0) + 1,
      };
      if (!visitor.country && geo.country) {
        updatePayload.country = geo.country;
        updatePayload.country_code = geo.countryCode;
        updatePayload.region = geo.region;
        updatePayload.city = geo.city;
        updatePayload.latitude = geo.latitude;
        updatePayload.longitude = geo.longitude;
      }
      if (fingerprint) {
        updatePayload.fingerprint_hash = fingerprint;
      }
      await supabase.from("site_visitors").update(updatePayload).eq("id", visitor.id);
    }

    const { data: createdVisit, error: insertError } = await supabase
      .from("site_visits")
      .insert({
        session_id: sessionId,
        visitor_id: visitor?.id ?? null,
        started_at: now,
        last_seen_at: now,
        pageview_count: 1,
        referrer,
        user_agent: userAgent,
        landing_path: path,
        ip_hash: ipHash,
        country: geo.country,
        country_code: geo.countryCode,
        region: geo.region,
        city: geo.city,
        latitude: geo.latitude,
        longitude: geo.longitude,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !createdVisit) {
      return NextResponse.json({ error: "Failed to create visit." }, { status: 500 });
    }
    visitId = createdVisit.id;
  }

  // 3) Pageview row.
  const { error: pageviewError } = await supabase.from("visit_pageviews").insert({
    visit_id: visitId,
    path,
    title,
    viewed_at: now,
  });

  if (pageviewError) {
    return NextResponse.json({ error: "Failed to record pageview." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, newVisit: isNewVisit });
}
