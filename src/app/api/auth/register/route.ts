import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getUserSessionCookieOptions,
  getUserSessionCookieValue,
  registerUser,
  toPublicUser,
  USER_SESSION_COOKIE,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegisterBody = {
  username?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  const username = body?.username?.trim() ?? "";
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: "Моля попълни всички полета." },
      { status: 400 },
    );
  }

  try {
    const result = await registerUser({ username, email, password });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
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
      { error: error instanceof Error ? error.message : "Неуспешна регистрация." },
      { status: 500 },
    );
  }
}
