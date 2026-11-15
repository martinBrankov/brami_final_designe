import { cache } from "react";
import { translatedLocales } from "@/lib/content-locales";

import { createSupabaseClient } from "@/lib/supabase";
import { slugifyQuestion } from "@/lib/faq-slug";
import { pickTranslation } from "@/lib/i18n-content";
import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";
import { productImages } from "@/data/product-images";
import ogId01 from "@/assets/images/products/krem-za-litse-s-shafran-saffron-adela-sunny-50-ml/krem-za-litse-s-shafran-saffron-adela-sunny-50-ml-og.jpg";
import ogId02 from "@/assets/images/products/krem-losion-za-tyalo-s-shafran-saffron-adela-sunny-120-ml/krem-losion-za-tyalo-s-shafran-saffron-adela-sunny-120-ml-og.jpg";
import ogId03 from "@/assets/images/products/balsam-za-kosa-s-shafran-saffron-adela-sunny-250-ml/balsam-za-kosa-s-shafran-saffron-adela-sunny-250-ml-og.jpg";
import ogId04 from "@/assets/images/products/dush-gel-s-shafran-tuberoza-i-krusha-saffron-adela-sunny-250-ml/dush-gel-s-shafran-tuberoza-i-krusha-saffron-adela-sunny-250-ml-og.jpg";
import ogId05 from "@/assets/images/products/dush-gel-za-kosa-i-tyalo-za-mazhe-s-shafran-saffron-adela-sunny-300-ml/dush-gel-za-kosa-i-tyalo-za-mazhe-s-shafran-saffron-adela-sunny-300-ml-og.jpg";
import ogId06 from "@/assets/images/products/shampoan-s-shafran-saffron-adela-sunny-250-ml/shampoan-s-shafran-saffron-adela-sunny-250-ml-og.jpg";
import ogId07 from "@/assets/images/products/dush-gel-s-shafran-saffron-adela-sunny-250-ml/dush-gel-s-shafran-saffron-adela-sunny-250-ml-og.jpg";
import ogId08 from "@/assets/images/products/glitserinov-sapun-s-shafran-saffron-adela-sunny-80-g/glitserinov-sapun-s-shafran-saffron-adela-sunny-80-g-og.jpg";
import ogId09 from "@/assets/images/products/shampoan-s-shafran-saffron-adela-sunny-50-ml/shampoan-s-shafran-saffron-adela-sunny-50-ml-og.jpg";
import ogId10 from "@/assets/images/products/dush-gel-s-shafran-saffron-adela-sunny-50-ml/dush-gel-s-shafran-saffron-adela-sunny-50-ml-og.jpg";
import ogId11 from "@/assets/images/products/dush-gel-za-kosa-i-tyalo-za-mazhe-s-shafran-saffron-adela-sunny-50-ml/dush-gel-za-kosa-i-tyalo-za-mazhe-s-shafran-saffron-adela-sunny-50-ml-og.jpg";
import ogId12 from "@/assets/images/products/podarachen-komplekt-s-shafran-saffron-adela-sunny/podarachen-komplekt-s-shafran-saffron-adela-sunny-og.jpg";
import ogId13 from "@/assets/images/products/komplekt-za-patuvane-s-shafran-saffron-adela-sunny-3x50-ml/komplekt-za-patuvane-s-shafran-saffron-adela-sunny-3x50-ml-og.jpg";
import ogId14 from "@/assets/images/products/ozaryavashta-maska-za-litse-voditsa-100-ml/ozaryavashta-maska-za-litse-voditsa-100-ml-og.jpg";
import ogId15 from "@/assets/images/products/noshten-krem-protiv-brachki-voditsa-50-ml/noshten-krem-protiv-brachki-voditsa-50-ml-og.jpg";
import ogId16 from "@/assets/images/products/dneven-krem-protiv-brachki-voditsa-50-ml/dneven-krem-protiv-brachki-voditsa-50-ml-og.jpg";
import ogId17 from "@/assets/images/products/okoloochen-krem-protiv-brachki-voditsa-15-ml/okoloochen-krem-protiv-brachki-voditsa-15-ml-og.jpg";
import ogId18 from "@/assets/images/products/hidratirasht-mist-za-litse-voditsa-100-ml/hidratirasht-mist-za-litse-voditsa-100-ml-og.jpg";
import ogId19 from "@/assets/images/products/mitselarna-voda-s-roza-voditsa-250-ml/mitselarna-voda-s-roza-voditsa-250-ml-og.jpg";
import ogId20 from "@/assets/images/products/voda-ot-shafran-hidrolat-100-ml/voda-ot-shafran-hidrolat-100-ml-og.jpg";
import ogId21 from "@/assets/images/products/serum-za-litse-s-shafran-perla-i-vitamin-c-shafpol-beauty-30-ml/serum-za-litse-s-shafran-perla-i-vitamin-c-shafpol-beauty-30-ml-og.jpg";
import ogId22 from "@/assets/images/products/slantsezashtiten-krem-za-litse-spf-50-shafpol-beauty-50-ml/slantsezashtiten-krem-za-litse-spf-50-shafpol-beauty-50-ml-og.jpg";
import ogId23 from "@/assets/images/products/shafrancho-i-priyateli-detska-knizhka/shafrancho-i-priyateli-detska-knizhka-og.jpg";
import ogId24 from "@/assets/images/products/pochistvasht-gel-za-litse-pure-pearl-shafpol-beauty-150-ml/pochistvasht-gel-za-litse-pure-pearl-shafpol-beauty-150-ml-og.jpg";

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

export type ProductFaqItem = { question: string; answer: string };

export type Product = {
  id: number;
  /** Locale the text fields below are in. */
  locale: AppLocale;
  /** URL slug in `locale`. */
  slug: string;
  /** URL slug per locale (for hreflang alternates and the language switcher). */
  slugs: Record<AppLocale, string>;
  availableLocales: AppLocale[];
  /** Retired slugs (any locale) that must still redirect to the product. */
  oldSlugs: string[];
  name: string;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  /** 2–3 sentence "answer first" summary shown under the H1. */
  summary: string | null;
  faq: ProductFaqItem[];
  gtin: string | null;
  /** Alt text per entry of `imageSrc`. */
  imageAlts: string[];
  updatedAt: string | null;
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
  24: ogId24,
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

function formatCommentDate(isoDate: string, locale: AppLocale): string {
  if (locale === "en") {
    return new Date(isoDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  }
  const [year, month, day] = isoDate.split("-");
  const monthName = BG_MONTHS[parseInt(month, 10) - 1] ?? month;
  return `${day} ${monthName} ${year}`;
}

type ProductTranslation = {
  name?: string;
  slug?: string;
  description?: string;
  packaging?: string;
  seo_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  summary?: string;
  faq?: ProductFaqItem[];
};

function parseFaq(value: unknown): ProductFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ProductFaqItem =>
      typeof item?.question === "string" &&
      typeof item?.answer === "string" &&
      item.question.trim() !== "" &&
      item.answer.trim() !== "",
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getProductSlugs(row: any): Record<AppLocale, string> {
  // Until a slug is saved in the admin, derive one from the name. The id
  // suffix keeps same-named products (e.g. 250 ml and 50 ml) apart.
  const bgSlug: string = row.slug || `${slugifyQuestion(row.name)}-${row.id}`;
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      locale === defaultLocale
        ? bgSlug
        : pickTranslation<ProductTranslation>(row.translations, locale).slug || bgSlug,
    ]),
  ) as Record<AppLocale, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbProduct(row: any, locale: AppLocale, reviewRatings: number[] = []): Product {
  const eur = Number(row.price_eur);
  const price = `€${eur.toFixed(2)}`;
  const tr = pickTranslation<ProductTranslation>(row.translations, locale);
  const slugs = getProductSlugs(row);
  const name: string = tr.name || row.name;

  const categorySlugs: string[] = (row.product_categories ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pc: any) => pc.categories?.slug,
  ).filter(Boolean);

  const audienceSlugs: string[] = (row.product_audiences ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pa: any) => pa.audiences?.slug,
  ).filter(Boolean);

  type ImageRow = { image_src: string; sort_order: number; alt?: string | null; translations?: unknown };
  const images = [...((row.product_images ?? []) as ImageRow[])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((img) => productImages[img.image_src as keyof typeof productImages]);
  const imageSrc = images.map((img) => productImages[img.image_src as keyof typeof productImages]);
  const imageAlts = images.map(
    (img) =>
      pickTranslation<{ alt?: string }>(img.translations, locale).alt ||
      (locale === defaultLocale ? img.alt : null) ||
      name,
  );

  type HighlightRow = { text: string; sort_order: number; translations?: unknown };
  const checkboxInfo = [...((row.product_highlights ?? []) as HighlightRow[])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((h) => pickTranslation<{ text?: string }>(h.translations, locale).text || h.text);

  const comments: Comment[] = (row.product_comments ?? []).map(
    (c: { id: number; author_name: string; comment: string; rating: number | null; comment_date: string }) => ({
      id: c.id,
      name: c.author_name,
      comment: c.comment,
      rating: c.rating ?? 5,
      data: formatCommentDate(c.comment_date, locale),
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
    locale,
    slug: slugs[locale],
    slugs,
    availableLocales: translatedLocales(row.translations, ["name", "slug", "description", ...(row.packaging ? ["packaging"] : [])]),
    oldSlugs: [...new Set([...(Array.isArray(row.old_slugs) ? row.old_slugs : []), `${slugifyQuestion(row.name)}-${row.id}`])],
    name,
    seoTitle: tr.seo_title || (locale === defaultLocale ? row.seo_title : null) || null,
    metaDescription:
      tr.meta_description || (locale === defaultLocale ? row.meta_description : null) || null,
    focusKeyword:
      tr.focus_keyword || (locale === defaultLocale ? row.focus_keyword : null) || null,
    summary: tr.summary || (locale === defaultLocale ? row.summary : null) || null,
    faq: parseFaq(tr.faq ?? (locale === defaultLocale ? row.faq : [])),
    gtin: row.gtin ?? null,
    imageAlts,
    updatedAt: row.updated_at ?? null,
    category: parseCategory(categorySlugs),
    audience: parseAudience(audienceSlugs),
    brand: parseBrand(row.brand),
    badge: parseBadge(row.badge),
    discountPercent: row.discount_percent ?? undefined,
    imageSrc,
    checkboxInfo: checkboxInfo.length
      ? checkboxInfo
      : [locale === "en" ? "Natural product" : "Натурален продукт"],
    price,
    packaging: tr.packaging || row.packaging,
    weight: Number(row.weight) || 0.2,
    rating: Number(row.rating),
    averageRating,
    reviewCount,
    stock: Math.max(0, Math.trunc(Number(row.stock_quantity ?? 0))),
    comments,
    description: tr.description || row.description || "",
    relatedProductIds,
    ogImage: productOgImages[row.id],
  };
}

// Fetched once per request and shared by every locale.
const getProductRows = cache(async () => {
  const supabase = createSupabaseClient();
  const [productsResult, reviewsResult] = await Promise.all([
    supabase
      .from("products")
      .select(`
        *,
        product_categories(categories(slug)),
        product_audiences(audiences(slug)),
        product_images(*),
        product_highlights(*),
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

  return { rows: data ?? [], reviewRatingsByProduct };
});

export const getProducts = cache(
  async (locale: AppLocale = defaultLocale): Promise<Product[]> => {
    const { rows, reviewRatingsByProduct } = await getProductRows();
    return rows.map((row) =>
      mapDbProduct(row, locale, reviewRatingsByProduct.get(Number(row.id)) ?? []),
    );
  },
);

export function getProductById(
  allProducts: Product[],
  id: number,
): Product | undefined {
  return allProducts.find((product) => product.id === id);
}

export function getProductBySlug(
  allProducts: Product[],
  slug: string,
): Product | undefined {
  return allProducts.find((product) => product.slug === slug);
}

/**
 * Resolves anything that has ever pointed at a product — the numeric id from
 * the QR codes on the labels, a slug in another language or a retired slug —
 * so the page can permanently redirect it to the current URL.
 */
export function findProductByUrlKey(
  allProducts: Product[],
  key: string,
): Product | undefined {
  if (/^\d+$/.test(key)) {
    return getProductById(allProducts, Number(key));
  }
  return allProducts.find(
    (product) =>
      Object.values(product.slugs).includes(key) || product.oldSlugs.includes(key),
  );
}

/** Locale-aware href for next-intl's Link / router (the slug is in the product's locale). */
export function getProductHref(product: Pick<Product, "slug">) {
  return { pathname: "/products/[slug]" as const, params: { slug: product.slug } };
}

export function getProductsByIds(
  allProducts: Product[],
  ids: number[],
): Product[] {
  return ids
    .map((id) => getProductById(allProducts, id))
    .filter((product): product is Product => product !== undefined);
}

/** Display name of the brand (the internal "brami" key is the Saffron Adela Sunny line). */
export function getProductBrandName(product: Product): string | null {
  switch (product.brand) {
    case "brami":
      return "Saffron Adela Sunny";
    case "other":
      return null;
    default:
      return product.brand;
  }
}

/** Legal manufacturer, when it is Brami's own production. */
export function getProductManufacturer(product: Product): string | null {
  return product.brand === "brami" ? "Brami Trade" : null;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** `t` must be bound to the "Product" namespace. */
export function getProductDescription(product: Product, t: Translate): string {
  const description = product.description.trim();

  if (description) {
    return description;
  }

  const highlights = product.checkboxInfo.length
    ? `<br/><br/><b>${t("highlightsLabel")}</b><br/>${product.checkboxInfo.join("<br/>")}`
    : "";

  return [
    `<b>${product.name}</b>`,
    t("fallbackDescription", { packaging: product.packaging }),
    highlights,
  ].join("<br/>");
}

export function stripHtml(value: string): string {
  return value
    .replaceAll(/<br\s*\/?>/gi, " ")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/&nbsp;/g, " ")
    .replaceAll(/&quot;/g, '"')
    .replaceAll(/&amp;/g, "&")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function trimToLength(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

/** `t` must be bound to the "Product" namespace. */
export function getProductShareDescription(product: Product, t: Translate): string {
  if (product.metaDescription) {
    return product.metaDescription;
  }

  const plainDescription = stripHtml(product.summary || product.description);
  const firstSentence = plainDescription.match(/.+?[.!?](?:\s|$)/)?.[0]?.trim();

  if (firstSentence && firstSentence.length >= 40) {
    return trimToLength(firstSentence, 155);
  }

  const highlights = product.checkboxInfo.slice(0, 2).join(", ");
  const fallback = [product.packaging, highlights || t("fallbackShareDescription")].join(" • ");

  return trimToLength(fallback, 155);
}

/** `t` must be bound to the "Product" namespace. */
export function getProductBadgeLabel(
  badge: Product["badge"],
  t: Translate,
  discountPercent?: number,
): string {
  if (badge === "sale") {
    return `-${discountPercent ?? 20}%`;
  }
  return t(`badges.${badge}`);
}
