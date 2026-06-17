import { NextResponse } from "next/server";

import { deactivateAllMerchantCodes } from "@/lib/promo-codes";
import {
  demoteMerchantToUser,
  requireMerchantSession,
  setMerchantBankDetails,
  setMerchantConsent,
  validateBankDetails,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const merchant = await requireMerchantSession();
  if (!merchant) {
    return NextResponse.json({ error: "Само за търговци." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        accepted?: unknown;
        bankAccountHolder?: unknown;
        bankIban?: unknown;
        bankBic?: unknown;
      }
    | null;
  const accepted = Boolean(body?.accepted);

  try {
    if (accepted) {
      // Valid bank payout details are required to receive dividends.
      const bank = validateBankDetails({
        bankAccountHolder: body?.bankAccountHolder,
        bankIban: body?.bankIban,
        bankBic: body?.bankBic,
      });
      if (!bank.ok) {
        return NextResponse.json({ error: bank.message }, { status: 400 });
      }
      await setMerchantBankDetails(merchant.session.id, bank.value);
      await setMerchantConsent(merchant.session.id, true);
    } else {
      // Declining/withdrawing demotes the profile back to a normal user and
      // deactivates all promo codes. Data, bank details and any due commissions
      // are preserved and still paid out; re-activation needs an admin role change.
      await deactivateAllMerchantCodes(merchant.session.id);
      await demoteMerchantToUser(merchant.session.id);
    }
    return NextResponse.json({ ok: true, accepted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Грешка при запис." },
      { status: 400 },
    );
  }
}
