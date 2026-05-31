import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getAdminSessionCookieOptions,
  getAdminSessionCookieValue,
  verifyAdminCredentials,
  ADMIN_SESSION_COOKIE,
} from "@/lib/admin-auth";

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
    return NextResponse.json({ error: "Липсват username/email и парола." }, { status: 400 });
  }

  try {
    const result = await verifyAdminCredentials(identifier, password);

    if (!result.ok) {
      if (result.reason === "invalid_hash") {
        return NextResponse.json(
          {
            error:
              "Записаният password_hash не е валиден bcrypt hash. Обнови стойността в user_profiles с истински bcrypt hash.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({ error: "Невалидни данни за вход." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(
      ADMIN_SESSION_COOKIE,
      getAdminSessionCookieValue(result.session),
      getAdminSessionCookieOptions(),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 500 },
    );
  }
}
