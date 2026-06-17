import { NextResponse } from "next/server";

import {
  requireMerchantSession,
  setMerchantBankDetails,
  validateBankDetails,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const merchant = await requireMerchantSession();
  if (!merchant) {
    return NextResponse.json({ error: "Само за търговци." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { bankAccountHolder?: unknown; bankIban?: unknown; bankBic?: unknown }
    | null;

  const bank = validateBankDetails({
    bankAccountHolder: body?.bankAccountHolder,
    bankIban: body?.bankIban,
    bankBic: body?.bankBic,
  });
  if (!bank.ok) {
    return NextResponse.json({ error: bank.message }, { status: 400 });
  }

  try {
    await setMerchantBankDetails(merchant.session.id, bank.value);
    return NextResponse.json({ ok: true, bank: bank.value });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Грешка при запис." },
      { status: 400 },
    );
  }
}
