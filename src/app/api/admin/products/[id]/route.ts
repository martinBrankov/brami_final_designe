import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { deleteAdminProduct } from "@/lib/admin-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  await requireAdminSession();

  try {
    const { id } = await params;
    const productId = Number.parseInt(id, 10);

    if (!Number.isInteger(productId)) {
      return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
    }

    await deleteAdminProduct(productId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete product." },
      { status: 400 },
    );
  }
}
