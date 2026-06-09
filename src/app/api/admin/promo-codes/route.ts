import { NextResponse } from "next/server";

import { requireFullAdminSession } from "@/lib/admin-auth";
import { createPromoCode, listPromoCodes } from "@/lib/promo-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireFullAdminSession();
  try {
    const codes = await listPromoCodes();
    return NextResponse.json({ codes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list codes." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  await requireFullAdminSession();
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          code?: unknown;
          merchantId?: unknown;
          discountPercent?: unknown;
          commissionPercent?: unknown;
          isActive?: unknown;
        }
      | null;

    const code = await createPromoCode({
      code: String(body?.code ?? ""),
      merchantId: String(body?.merchantId ?? ""),
      discountPercent: Number(body?.discountPercent ?? 0),
      commissionPercent: Number(body?.commissionPercent ?? 0),
      isActive: body?.isActive === undefined ? true : Boolean(body?.isActive),
    });

    return NextResponse.json({ code });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create code." },
      { status: 400 },
    );
  }
}
