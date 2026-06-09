import { NextResponse } from "next/server";

import {
  assertMarketingRateLimit,
  getClientIp,
  isValidMarketingEmail,
  normalizeMarketingEmail,
  recordMarketingAttempt,
  subscribeMarketingEmail,
} from "@/lib/marketing-subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscribeBody = {
  email?: unknown;
  website?: unknown;
  issuedAt?: unknown;
};

function parseIssuedAt(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SubscribeBody | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const issuedAt = parseIssuedAt(body.issuedAt);
  const elapsedMs = issuedAt ? Date.now() - issuedAt : null;

  if (elapsedMs === null || elapsedMs < 1800 || elapsedMs > 60 * 60 * 1000) {
    return NextResponse.json({ error: "Please try again." }, { status: 400 });
  }

  const email = normalizeMarketingEmail(typeof body.email === "string" ? body.email : "");

  if (!isValidMarketingEmail(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);
    const rateLimit = await assertMarketingRateLimit({ email, ip });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    await recordMarketingAttempt({
      emailHash: rateLimit.emailHash,
      ipHash: rateLimit.ipHash,
      action: "subscribe",
    });

    await subscribeMarketingEmail({
      email,
      source: "beauty-care",
      ipHash: rateLimit.ipHash,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Subscription failed." },
      { status: 500 },
    );
  }
}
