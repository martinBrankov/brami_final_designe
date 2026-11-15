import { localizeApiError } from "@/lib/api-i18n";
import { NextResponse } from "next/server";
import { getProductUrls, notifyIndexNow } from "@/lib/indexnow";

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
      return NextResponse.json({ error: await localizeApiError("Invalid product id.") }, { status: 400 });
    }

    // URLs are taken before the delete, so search engines learn they are gone.
    const urls = await getProductUrls(productId);
    await deleteAdminProduct(productId);
    notifyIndexNow(() => urls);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: await localizeApiError(error instanceof Error ? error.message : "Failed to delete product.") },
      { status: 400 },
    );
  }
}
