import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { USER_SESSION_COOKIE } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(USER_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
