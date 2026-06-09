import { NextResponse } from "next/server";

import { isFullAdmin, requireAdminSession } from "@/lib/admin-auth";
import { updateAdminUser } from "@/lib/admin-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await requireAdminSession();

  try {
    const { id } = await params;
    const body = await request.json();
    const canManageMerchant = isFullAdmin(session);

    await updateAdminUser({
      id,
      username: String(body.username ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      country: String(body.country ?? ""),
      city: String(body.city ?? ""),
      postalCode: String(body.postalCode ?? ""),
      address: String(body.address ?? ""),
      role: body.role,
      marketingSubscription: Boolean(body.marketingSubscription),
      merchantDiscountPercent:
        canManageMerchant && body.merchantDiscountPercent !== undefined
          ? Number(body.merchantDiscountPercent)
          : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user." },
      { status: 400 },
    );
  }
}
