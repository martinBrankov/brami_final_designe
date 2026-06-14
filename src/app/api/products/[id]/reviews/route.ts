import { NextResponse } from "next/server";

import {
  deleteProductComment,
  deleteProductReview,
  upsertProductReview,
} from "@/lib/product-reviews";
import { getUserSession } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json(
      { error: "Трябва да влезеш в профила си, за да оставиш отзив." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const productId = Number.parseInt(id, 10);

  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { rating?: unknown; comment?: unknown; name?: unknown }
    | null;

  const rating = Number(body?.rating);

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Избери оценка от 1 до 5 звезди." },
      { status: 400 },
    );
  }

  const comment = typeof body?.comment === "string" ? body.comment : "";
  const providedName =
    typeof body?.name === "string" ? body.name.trim().slice(0, 50) : "";
  const authorName = providedName || session.username;

  try {
    const review = await upsertProductReview({
      productId,
      userId: session.id,
      authorName,
      rating,
      comment,
    });

    return NextResponse.json({
      ok: true,
      review: {
        authorName: review.authorName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save review.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getUserSession();

  // Only admins may remove comments from the site interface.
  if (!session || session.role !== "admin") {
    return NextResponse.json(
      { error: "Нямаш права за това действие." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { kind?: unknown; id?: unknown }
    | null;

  try {
    if (body?.kind === "review" && typeof body.id === "string") {
      await deleteProductReview(body.id);
    } else if (
      body?.kind === "comment" &&
      (typeof body.id === "number" || typeof body.id === "string") &&
      Number.isInteger(Number(body.id))
    ) {
      await deleteProductComment(Number(body.id));
    } else {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete comment.",
      },
      { status: 400 },
    );
  }
}
