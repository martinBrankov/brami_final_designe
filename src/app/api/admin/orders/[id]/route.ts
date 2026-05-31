import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { updateAdminOrderStatus } from "@/lib/admin-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  await requireAdminSession();

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
    const status = typeof body?.status === "string" ? body.status.trim() : "";

    if (!status) {
      return NextResponse.json({ error: "Missing order status." }, { status: 400 });
    }

    await updateAdminOrderStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order status." },
      { status: 400 },
    );
  }
}
