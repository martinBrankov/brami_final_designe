import { NextResponse } from "next/server";

import {
  getUserSession,
  updateUserProfile,
  type PreferredSpeedyLocation,
  type SpeedyOfficeSnapshot,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileBody = {
  fullName?: unknown;
  phone?: unknown;
  city?: unknown;
  postalCode?: unknown;
  address?: unknown;
  marketingSubscription?: unknown;
  preferredOffice?: unknown;
  preferredLocker?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parsePreferredLocation(
  raw: unknown,
): PreferredSpeedyLocation | null | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (raw === null) {
    return null;
  }

  if (typeof raw !== "object") {
    return undefined;
  }

  const candidate = raw as { id?: unknown; data?: unknown };
  const id = typeof candidate.id === "string" ? candidate.id : null;
  const data = candidate.data as SpeedyOfficeSnapshot | undefined;

  if (!id || !data || typeof data !== "object" || typeof data.id !== "number") {
    return undefined;
  }

  return { id, data };
}

export async function PATCH(request: Request) {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json({ error: "Не сте влезли в профил." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ProfileBody | null;

  if (!body) {
    return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
  }

  try {
    const profile = await updateUserProfile(session.id, {
      fullName: asString(body.fullName),
      phone: asString(body.phone),
      city: asString(body.city),
      postalCode: asString(body.postalCode),
      address: asString(body.address),
      marketingSubscription: Boolean(body.marketingSubscription),
      preferredOffice: parsePreferredLocation(body.preferredOffice),
      preferredLocker: parsePreferredLocation(body.preferredLocker),
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Грешка при запис." },
      { status: 500 },
    );
  }
}
