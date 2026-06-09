import { NextResponse } from "next/server";

import { requireFullAdminSession } from "@/lib/admin-auth";
import { deletePromoCode, updatePromoCode } from "@/lib/promo-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  await requireFullAdminSession();
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as
      | {
          code?: unknown;
          discountPercent?: unknown;
          commissionPercent?: unknown;
          isActive?: unknown;
        }
      | null;

    const updated = await updatePromoCode({
      id,
      code: body?.code !== undefined ? String(body.code) : undefined,
      discountPercent:
        body?.discountPercent !== undefined ? Number(body.discountPercent) : undefined,
      commissionPercent:
        body?.commissionPercent !== undefined
          ? Number(body.commissionPercent)
          : undefined,
      isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });

    return NextResponse.json({ code: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update code." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  await requireFullAdminSession();
  try {
    const { id } = await params;
    await deletePromoCode(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete code." },
      { status: 400 },
    );
  }
}
