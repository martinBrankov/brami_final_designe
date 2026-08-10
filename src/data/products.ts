import { cache } from "react";

import { createSupabaseClient } from "@/lib/supabase";
import { productImages } from "@/data/product-images";
import ogId01 from "@/assets/images/products/0000001/og.jpg";
import ogId02 from "@/assets/images/products/0000002/og.jpg";
import ogId03 from "@/assets/images/products/0000003/og.jpg";
import ogId04 from "@/assets/images/products/0000004/og.jpg";
import ogId05 from "@/assets/images/products/0000005/og.jpg";
import ogId06 from "@/assets/images/products/0000006/og.jpg";
import ogId07 from "@/assets/images/products/0000007/og.jpg";
import ogId08 from "@/assets/images/products/0000008/og.jpg";
import ogId09 from "@/assets/images/products/0000009/og.jpg";
import ogId10 from "@/assets/images/products/00000010/og.jpg";
import ogId11 from "@/assets/images/products/00000011/og.jpg";
import ogId12 from "@/assets/images/products/00000012/og.jpg";
import ogId13 from "@/assets/images/products/00000013/og.jpg";
import ogId14 from "@/assets/images/products/00000014/og.jpg";
import ogId15 from "@/assets/images/products/00000015/og.jpg";
import ogId16 from "@/assets/images/products/00000016/og.jpg";
import ogId17 from "@/assets/images/products/00000017/og.jpg";
import ogId18 from "@/assets/images/products/00000018/og.jpg";
import ogId19 from "@/assets/images/products/00000019/og.jpg";
import ogId20 from "@/assets/images/products/00000020/og.jpg";
import ogId21 from "@/assets/images/products/00000021/og.jpg";
import ogId22 from "@/assets/images/products/00000022/og.jpg";
import ogId23 from "@/assets/images/products/00000023/og.jpg";

export const FREE_SHIPPING_THRESHOLD_EUR = 70;
export const HEAVY_THRESHOLD_KG = 3;
export const BGN_TO_EUR = 1.95583;
export const LOCKER_SHIPPING_BGN = 1.52 * BGN_TO_EUR;

export const SHIPPING_RATE_TABLE = {
  office: [
    { maxWeightKg: 1, eur: 2.5 },
    { maxWeightKg: 3, eur: 2.5 },
    { maxWeightKg: 6, eur: 3.48 },
    { maxWeightKg: 10, eur: 4.3 },
    { maxWeightKg: 20, eur: 7.65 },
  ],
  address: [
    { maxWeightKg: 1, eur: 3.6 },
    { maxWeightKg: 3, eur: 4.3 },
    { maxWeightKg: 6, eur: 7.34 },
    { maxWeightKg: 10, eur: 8.06 },
    { maxWeightKg: 20, eur: 11.76 },
  ],
} as const;

export const PACKAGING_WEIGHT_TABLE = [
  { maxWeightKg: 1, packagingWeightKg: 0.3 },
  { maxWeightKg: 3, packagingWeightKg: 0.3 },
  { maxWeightKg: 6, packagingWeightKg: 0.35 },
  { maxWeightKg: 10, packagingWeightKg: 0.4 },
  { maxWeightKg: 20, packagingWeightKg: 0.6 },
] as const;

export const SHIPPING_RATES = {
  locker: { standard: LOCKER_SHIPPING_BGN, heavy: LOCKER_SHIPPING_BGN },
} as const;

export interface Comment {
  id: number;
  name: string;
  comment: string;
  rating: number;
  data: string;
}

export type Product = {
  id: number;
  name: string;
  category: ("hair" | "body" | "face")[];
  audience: ("women" | "men" | "unisex" | "kids")[];
  brand: "brami" | "Voditsa" | "Shafpol Beauty" | "other";
  badge: "bestseller" | "sale" | "new" | "favorite" | "featured" | "kids" | "none";
  discountPercent?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageSrc: any[];
  checkboxInfo: string[];
  price: string;
  packaging: string;
  weight: number;
  rating: number;
  /** Average of all rating votes (user reviews + seed comments), or the curated `rating` when there are no votes. */
  averageRating: number;
  /** Number of rating votes the average is based on (user reviews + seed comments with a rating). */
  reviewCount: number;
  stock: number;
  comments: Comment[];
  description: string;
  relatedProductIds: number[];
  ogImage?: { src: string; width: number; height: number };
};

const allowedCategories = new Set<Product["category"][number]>([
  "hair",
  "body",
  "face",
]);
const allowedAudiences = new Set<Product["audience"][number]>([
  "women",
  "men",
  "unisex",
  "kids",
]);
const allowedBrands = new Set<Product["brand"]>(["brami", "Voditsa", "Shafpol Beauty", "other"]);
const allowedBadges = new Set<Product["badge"]>([
  "bestseller",
  "sale",
  "new",
  "favorite",
  "featured",
  "kids",
  "none",
]);

const productOgImages: Record<number, { src: string; width: number; height: number }> = {
  1: ogId01,
  2: ogId02,
  3: ogId03,
  4: ogId04,
  5: ogId05,
  6: ogId06,
  7: ogId07,
  8: ogId08,
  9: ogId09,
  10: ogId10,
  11: ogId11,
  12: ogId12,
  13: ogId13,
  14: ogId14,
  15: ogId15,
  16: ogId16,
  17: ogId17,
  18: ogId18,
  19: ogId19,
  20: ogId20,
  21: ogId21,
  22: ogId22,
  23: ogId23,
};

function parseCategory(slugs: string[]): Product["category"] {
  return slugs.filter(
    (s): s is Product["category"][number] =>
      allowedCategories.has(s as Product["category"][number]),
  );
}

function parseAudience(slugs: string[]): Product["audience"] {
  const parsed = slugs.filter(
    (s): s is Product["audience"][number] =>
      allowedAudiences.has(s as Product["audience"][number]),
  );
  return parsed.length ? parsed : ["unisex"];
}

function parseBrand(brand: string): Product["brand"] {
  return allowedBrands.has(brand as Product["brand"])
    ? (brand as Product["brand"])
    : "other";
}

function parseBadge(badge: string): Product["badge"] {
  return allowedBadges.has(badge as Product["badge"])
    ? (badge as Product["badge"])
    : "none";
}

const BG_MONTHS = [
  "януари", "февруари", "март", "април", "май", "юни",
  "юли", "август", "септември", "октомври", "ноември", "декември",
];

function formatBgDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  const monthName = BG_MONTHS[parseInt(month, 10) - 1] ?? month;
  return `${day} ${monthName} ${year}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbProduct(row: any, reviewRatings: number[] = []): Product {
  const eur = Number(row.price_eur);
  const price = `€${eur.toFixed(2)}`;

  const categorySlugs: string[] = (row.product_categories ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pc: any) => pc.categories?.slug,
  ).filter(Boolean);

  const audienceSlugs: string[] = (row.product_audiences ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pa: any) => pa.audiences?.slug,
  ).filter(Boolean);

  const imageSrc = [...(row.product_images ?? [])]
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((img: { image_src: string }) => productImages[img.image_src as keyof typeof productImages])
    .filter(Boolean);

  const checkboxInfo = [...(row.product_highlights ?? [])]
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((h: { text: string }) => h.text);

  const comments: Comment[] = (row.product_comments ?? []).map(
    (c: { id: number; author_name: string; comment: string; rating: number | null; comment_date: string }) => ({
      id: c.id,
      name: c.author_name,
      comment: c.comment,
      rating: c.rating ?? 5,
      data: formatBgDate(c.comment_date),
    }),
  );

  const relatedProductIds: number[] = (row.related_products ?? []).map(
    (r: { related_product_id: number }) => r.related_product_id,
  );

  // A "vote" is any rating: a user review from `product_reviews` plus every seed
  // comment that carries a rating. Kept identical to the product detail page so
  // the star count matches everywhere.
  const commentRatings = comments.map((c) => c.rating).filter((value) => value > 0);
  const ratingValues = [...reviewRatings, ...commentRatings];
  const reviewCount = ratingValues.length;
  const averageRating =
    reviewCount > 0
      ? ratingValues.reduce((sum, value) => sum + value, 0) / reviewCount
      : Number(row.rating);

  return {
    id: row.id,
    name: row.name,
    category: parseCategory(categorySlugs),
    audience: parseAudience(audienceSlugs),
    brand: parseBrand(row.brand),
    badge: parseBadge(row.badge),
    discountPercent: row.discount_percent ?? undefined,
    imageSrc,
    checkboxInfo: checkboxInfo.length ? checkboxInfo : ["Натурален продукт"],
    price,
    packaging: row.packaging,
    weight: Number(row.weight) || 0.2,
    rating: Number(row.rating),
    averageRating,
    reviewCount,
    stock: Math.max(0, Math.trunc(Number(row.stock_quantity ?? 0))),
    comments,
    description: row.description ?? "",
    relatedProductIds,
    ogImage: productOgImages[row.id],
  };
}

export const getProducts = cache(async (): Promise<Product[]> => {
  const supabase = createSupabaseClient();
  const [productsResult, reviewsResult] = await Promise.all([
    supabase
      .from("products")
      .select(`
        *,
        product_categories(categories(slug)),
        product_audiences(audiences(slug)),
        product_images(image_src, sort_order),
        product_highlights(text, sort_order),
        product_comments(id, author_name, comment, rating, comment_date),
        related_products!product_id(related_product_id)
      `)
      .order("id"),
    supabase.from("product_reviews").select("product_id, rating"),
  ]);

  const { data, error } = productsResult;
  if (error) throw new Error(`Failed to fetch products: ${error.message}`);

  // Group user-submitted review ratings by product. If the reviews table is
  // unavailable (e.g. RLS/missing table) we simply fall back to the seed votes,
  // rather than breaking the storefront.
  const reviewRatingsByProduct = new Map<number, number[]>();
  if (!reviewsResult.error) {
    for (const review of reviewsResult.data ?? []) {
      const productId = Number(review.product_id);
      const ratings = reviewRatingsByProduct.get(productId) ?? [];
      ratings.push(Number(review.rating));
      reviewRatingsByProduct.set(productId, ratings);
    }
  }

  return (data ?? []).map((row) =>
    mapDbProduct(row, reviewRatingsByProduct.get(Number(row.id)) ?? []),
  );
});

export function getProductById(
  allProducts: Product[],
  id: number,
): Product | undefined {
  return allProducts.find((product) => product.id === id);
}

export function getProductsByIds(
  allProducts: Product[],
  ids: number[],
): Product[] {
  return ids
    .map((id) => getProductById(allProducts, id))
    .filter((product): product is Product => product !== undefined);
}

export function getProductDescription(product: Product): string {
  const description = product.description.trim();

  if (description) {
    return description;
  }

  const highlights = product.checkboxInfo.length
    ? `<br/><br/><b>Акценти:</b><br/>${product.checkboxInfo.join("<br/>")}`
    : "";

  return [
    `<b>${product.name}</b>`,
    `${product.packaging} от ${getProductBadgeLabel(product.badge).toLowerCase()} продукт с подбрани съставки и предназначение за ежедневна грижа.`,
    highlights,
  ].join("<br/>");
}

function stripHtml(value: string): string {
  return value
    .replaceAll(/<br\s*\/?>/gi, " ")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function trimToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getProductShareDescription(product: Product): string {
  const plainDescription = stripHtml(product.description);
  const firstSentence = plainDescription.match(/.+?[.!?](?:\s|$)/)?.[0]?.trim();

  if (firstSentence && firstSentence.length >= 40) {
    return trimToLength(firstSentence, 140);
  }

  const highlights = product.checkboxInfo.slice(0, 2).join(", ");
  const fallback = [
    product.packaging,
    highlights || "Натурална грижа за ежедневна употреба",
  ].join(" • ");

  return trimToLength(fallback, 140);
}

export function getProductBadgeLabel(
  badge: Product["badge"],
  discountPercent?: number,
): string {
  switch (badge) {
    case "bestseller":
      return "Най-продаван";
    case "sale":
      return discountPercent ? `-${discountPercent}%` : "-20%";
    case "new":
      return "Нов";
    case "favorite":
      return "Препоръчваме Ви";
    case "kids":
      return "За деца";
    case "featured":
      return "Избрано";
    default:
      return "Продукт";
  }
}
