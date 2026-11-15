import { NextResponse } from "next/server";

import { validatePromoCode } from "@/lib/promo-codes";
import { localizeApiError } from "@/lib/api-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  if (!code.trim()) {
    return NextResponse.json({ error: await localizeApiError("Въведете промо код.") }, { status: 400 });
  }

  try {
    const result = await validatePromoCode(code);

    if (!result) {
      return NextResponse.json(
        { error: await localizeApiError("Невалиден или неактивен промо код.") },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      promo: {
        id: result.id,
        code: result.code,
        merchantId: result.merchantId,
        discountPercent: result.discountPercent,
        commissionPercent: result.commissionPercent,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: await localizeApiError(error instanceof Error ? error.message : "Грешка при проверка.") },
      { status: 500 },
    );
  }
}
