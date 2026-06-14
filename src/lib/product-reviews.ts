import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type ProductReview = {
  id: string;
  productId: number;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ProductReviewRow = {
  id: string;
  product_id: number;
  user_id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const REVIEW_SELECT =
  "id, product_id, user_id, author_name, rating, comment, created_at";

function mapReview(row: ProductReviewRow): ProductReview {
  return {
    id: row.id,
    productId: Number(row.product_id),
    userId: row.user_id,
    authorName: row.author_name,
    rating: Number(row.rating),
    comment: row.comment ?? "",
    createdAt: row.created_at,
  };
}

export async function getProductReviews(
  productId: number,
): Promise<ProductReview[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_reviews")
    .select(REVIEW_SELECT)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .returns<ProductReviewRow[]>();

  if (error) {
    // Don't break the storefront if the table isn't there yet (e.g. before the
    // migration is run) — just show the seed reviews.
    console.error(`Failed to fetch product reviews: ${error.message}`);
    return [];
  }

  return (data ?? []).map(mapReview);
}

export async function upsertProductReview(input: {
  productId: number;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
}): Promise<ProductReview> {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const comment = input.comment.trim().slice(0, 1000);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("product_reviews")
    .upsert(
      {
        product_id: input.productId,
        user_id: input.userId,
        author_name: input.authorName,
        rating,
        comment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,user_id" },
    )
    .select(REVIEW_SELECT)
    .single<ProductReviewRow>();

  if (error || !data) {
    throw new Error(
      `Failed to save product review: ${error?.message ?? "unknown error"}`,
    );
  }

  return mapReview(data);
}

export async function deleteProductReview(reviewId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("product_reviews")
    .delete()
    .eq("id", reviewId);

  if (error) {
    throw new Error(`Failed to delete product review: ${error.message}`);
  }
}

export async function deleteProductComment(commentId: number): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("product_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    throw new Error(`Failed to delete product comment: ${error.message}`);
  }
}
