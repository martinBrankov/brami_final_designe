import { NextResponse } from "next/server";
import { createHash } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackPayload = {
  sessionId?: unknown;
  path?: unknown;
  title?: unknown;
  referrer?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function clip(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}

function hashIp(ip: string | null) {
  if (!ip) return null;
  const salt = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
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
  const userAgent = clip(request.headers.get("user-agent") ?? "", 512) || null;
  const ipHash = hashIp(getClientIp(request));

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // Try to find an existing visit for this session
  const { data: existing, error: lookupError } = await supabase
    .from("site_visits")
    .select("id, pageview_count")
    .eq("session_id", sessionId)
    .maybeSingle<{ id: string; pageview_count: number }>();

  if (lookupError) {
    return NextResponse.json({ error: "Failed to look up visit." }, { status: 500 });
  }

  let visitId: string;

  if (existing) {
    visitId = existing.id;
    const { error: updateError } = await supabase
      .from("site_visits")
      .update({
        last_seen_at: now,
        pageview_count: existing.pageview_count + 1,
      })
      .eq("id", visitId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update visit." }, { status: 500 });
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("site_visits")
      .insert({
        session_id: sessionId,
        started_at: now,
        last_seen_at: now,
        pageview_count: 1,
        referrer,
        user_agent: userAgent,
        landing_path: path,
        ip_hash: ipHash,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !created) {
      return NextResponse.json({ error: "Failed to create visit." }, { status: 500 });
    }
    visitId = created.id;
  }

  const { error: pageviewError } = await supabase.from("visit_pageviews").insert({
    visit_id: visitId,
    path,
    title,
    viewed_at: now,
  });

  if (pageviewError) {
    return NextResponse.json({ error: "Failed to record pageview." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
