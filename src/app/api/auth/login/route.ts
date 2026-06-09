import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getUserSessionCookieOptions,
  getUserSessionCookieValue,
  toPublicUser,
  USER_SESSION_COOKIE,
  verifyUserCredentials,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginBody = {
  identifier?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginBody | null;
  const identifier = body?.identifier?.trim() ?? "";
  const password = body?.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Моля въведи потребителско име/имейл и парола." },
      { status: 400 },
    );
  }

  try {
    const result = await verifyUserCredentials(identifier, password);

    if (!result.ok) {
      return NextResponse.json(
        { error: "Невалидни данни за вход." },
        { status: 401 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(
      USER_SESSION_COOKIE,
      getUserSessionCookieValue(result.session),
      getUserSessionCookieOptions(),
    );

    return NextResponse.json({ ok: true, user: toPublicUser(result.session) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Неуспешен вход." },
      { status: 500 },
    );
  }
}
