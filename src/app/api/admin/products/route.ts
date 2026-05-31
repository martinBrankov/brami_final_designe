import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { saveAdminProduct } from "@/lib/admin-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireAdminSession();

  try {
    const body = await request.json();
    await saveAdminProduct(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save product." },
      { status: 400 },
    );
  }
}
