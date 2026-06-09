import { NextResponse } from "next/server";

import { requireFullAdminSession } from "@/lib/admin-auth";
import { markCommissionsPaid } from "@/lib/promo-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  orderIds?: unknown;
  paid?: unknown;
};

export async function POST(request: Request) {
  const session = await requireFullAdminSession();

  const body = (await request.json().catch(() => null)) as Body | null;
  const orderIds = Array.isArray(body?.orderIds)
    ? body.orderIds.filter((id): id is string => typeof id === "string")
    : [];
  const paid = Boolean(body?.paid);

  if (!orderIds.length) {
    return NextResponse.json(
      { error: "Изпрати поне една поръчка." },
      { status: 400 },
    );
  }

  try {
    await markCommissionsPaid(orderIds, paid, session.id);
    return NextResponse.json({ ok: true, count: orderIds.length, paid });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Грешка при запис." },
      { status: 500 },
    );
  }
}
