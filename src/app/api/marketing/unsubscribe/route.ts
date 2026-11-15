import { NextResponse } from "next/server";

import {
  assertMarketingRateLimit,
  getClientIp,
  isValidMarketingEmail,
  normalizeMarketingEmail,
  recordMarketingAttempt,
  unsubscribeMarketingEmail,
  verifyUnsubscribeToken,
} from "@/lib/marketing-subscribers";
import { localizeApiError } from "@/lib/api-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UnsubscribeBody = {
  email?: unknown;
  token?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as UnsubscribeBody | null;
  const email = normalizeMarketingEmail(typeof body?.email === "string" ? body.email : "");
  const token = typeof body?.token === "string" ? body.token : "";

  if (!isValidMarketingEmail(email)) {
    return NextResponse.json({ error: await localizeApiError("Invalid email address.") }, { status: 400 });
  }

  if (token && !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: await localizeApiError("Invalid unsubscribe link.") }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);
    const rateLimit = await assertMarketingRateLimit({ email, ip });

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: await localizeApiError("Too many attempts. Please try again later.") },
        { status: 429 },
      );
    }

    await recordMarketingAttempt({
      emailHash: rateLimit.emailHash,
      ipHash: rateLimit.ipHash,
      action: "unsubscribe",
    });

    await unsubscribeMarketingEmail({ email });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: await localizeApiError(error instanceof Error ? error.message : "Unsubscribe failed.") },
      { status: 500 },
    );
  }
}
