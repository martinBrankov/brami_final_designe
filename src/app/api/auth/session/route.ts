import { NextResponse } from "next/server";

import { getCurrentUserState } from "@/lib/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in visitor for UserProvider. Personal data: never cached.
export async function GET() {
  return NextResponse.json(await getCurrentUserState(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
