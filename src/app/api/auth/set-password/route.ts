import { NextResponse } from "next/server";

import {
  getUserProfile,
  getUserSession,
  setUserPassword,
  validateStrongPassword,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { password?: unknown };

export async function POST(request: Request) {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json({ error: "Не сте влезли в профил." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const password = typeof body?.password === "string" ? body.password : "";

  const validation = validateStrongPassword(password);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  try {
    const existing = await getUserProfile(session.id);
    if (existing?.hasPassword) {
      return NextResponse.json(
        { error: "Вече имаш зададена парола за този профил." },
        { status: 409 },
      );
    }

    await setUserPassword(session.id, password);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Грешка при запис на парола." },
      { status: 500 },
    );
  }
}
