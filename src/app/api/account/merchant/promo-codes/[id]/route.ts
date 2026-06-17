import { NextResponse } from "next/server";

import { getMerchantTierStatus } from "@/lib/merchant-tier";
import { deleteMerchantPromoCode, updateMerchantPromoCode } from "@/lib/promo-codes";
import { requireMerchantSession } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const merchant = await requireMerchantSession();
  if (!merchant) {
    return NextResponse.json({ error: "Само за търговци." }, { status: 401 });
  }
  if (!merchant.profile.merchantTermsAcceptedAt) {
    return NextResponse.json(
      { error: "Приеми условията за търговец, за да управляваш кодове." },
      { status: 403 },
    );
  }
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

    const tier = await getMerchantTierStatus(
      merchant.session.id,
      merchant.profile.email,
      merchant.profile.merchantDiscountPercent,
    );

    const updated = await updateMerchantPromoCode({
      merchantId: merchant.session.id,
      poolPercent: tier.poolPercent,
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
  const merchant = await requireMerchantSession();
  if (!merchant) {
    return NextResponse.json({ error: "Само за търговци." }, { status: 401 });
  }
  if (!merchant.profile.merchantTermsAcceptedAt) {
    return NextResponse.json(
      { error: "Приеми условията за търговец, за да управляваш кодове." },
      { status: 403 },
    );
  }
  try {
    const { id } = await params;
    await deleteMerchantPromoCode(merchant.session.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete code." },
      { status: 400 },
    );
  }
}
