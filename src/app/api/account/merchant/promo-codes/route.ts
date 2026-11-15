import { NextResponse } from "next/server";

import { getMerchantTierStatus } from "@/lib/merchant-tier";
import { createMerchantPromoCode, listPromoCodesForMerchant } from "@/lib/promo-codes";
import { requireMerchantSession } from "@/lib/user-auth";
import { localizeApiError } from "@/lib/api-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const merchant = await requireMerchantSession();
  if (!merchant) {
    return NextResponse.json({ error: await localizeApiError("Само за търговци.") }, { status: 401 });
  }
  try {
    const codes = await listPromoCodesForMerchant(merchant.session.id);
    return NextResponse.json({ codes });
  } catch (error) {
    return NextResponse.json(
      { error: await localizeApiError(error instanceof Error ? error.message : "Failed to list codes.") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const merchant = await requireMerchantSession();
  if (!merchant) {
    return NextResponse.json({ error: await localizeApiError("Само за търговци.") }, { status: 401 });
  }
  if (!merchant.profile.merchantTermsAcceptedAt) {
    return NextResponse.json(
      { error: await localizeApiError("Приеми условията за търговец, за да управляваш кодове.") },
      { status: 403 },
    );
  }
  try {
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

    const code = await createMerchantPromoCode({
      merchantId: merchant.session.id,
      poolPercent: tier.poolPercent,
      code: String(body?.code ?? ""),
      discountPercent: Number(body?.discountPercent ?? 0),
      commissionPercent: Number(body?.commissionPercent ?? 0),
      isActive: body?.isActive === undefined ? true : Boolean(body?.isActive),
    });

    return NextResponse.json({ code });
  } catch (error) {
    return NextResponse.json(
      { error: await localizeApiError(error instanceof Error ? error.message : "Failed to create code.") },
      { status: 400 },
    );
  }
}
