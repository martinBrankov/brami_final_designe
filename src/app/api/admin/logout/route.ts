import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { USER_SESSION_COOKIE } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    const protocol =
      forwardedProto ||
      (host.includes("localhost") || host.startsWith("192.168.") ? "http" : "https");
    return `${protocol}://${host}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(USER_SESSION_COOKIE);
  return NextResponse.redirect(new URL("/", resolveOrigin(request)));
}
