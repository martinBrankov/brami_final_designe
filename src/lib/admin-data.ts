import "server-only";

import { slugifyQuestion } from "@/lib/faq-slug";
import { isValidGtin, normalizeGtin } from "@/lib/gtin";
import { syncMarketingSubscriberForProfile, unsubscribeMarketingEmail } from "@/lib/marketing-subscribers";
import { normalizeOrderImageUrl } from "@/lib/order-image";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type AdminUserProfile = {
  id: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  postalCode: string;
  address: string;
  role: "user" | "merchant" | "admin";
  marketingSubscription: boolean;
  merchantDiscountPercent: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminFaqItem = { question: string; answer: string };

/** Bulgarian SEO fields of a product (stored in the products row). */
export type AdminProductSeo = {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  summary: string;
  faq: AdminFaqItem[];
  gtin: string;
  /** Alt text per image, in the order of imageKeys. */
  imageAlts: string[];
};

/** English version of a product (products.translations.en + related rows). */
export type AdminProductEnglish = {
  name: string;
  slug: string;
  packaging: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  summary: string;
  faq: AdminFaqItem[];
  highlights: string[];
  imageAlts: string[];
};

export type AdminProductRecord = {
  id: number;
  seo: AdminProductSeo;
  en: AdminProductEnglish;
  name: string;
  brand: "brami" | "Voditsa" | "Shafpol Beauty" | "other";
  badge: "bestseller" | "sale" | "new" | "favorite" | "featured" | "kids" | "none";
  discountPercent: number | null;
  priceEur: number;
  priceBgn: number;
  packaging: string;
  weight: number;
  rating: number;
  stock: number;
  description: string;
  categories: string[];
  audiences: string[];
  imageKeys: string[];
  highlights: string[];
  relatedProductIds: number[];
};

export type AdminProductInput = {
  id: number;
  seo?: AdminProductSeo;
  en?: AdminProductEnglish;
  name: string;
  brand: AdminProductRecord["brand"];
  badge: AdminProductRecord["badge"];
  discountPercent: number | null;
  priceEur: number;
  priceBgn: number;
  packaging: string;
  weight: number;
  rating: number;
  stock: number;
  description: string;
  categories: string[];
  audiences: string[];
  imageKeys: string[];
  highlights: string[];
  relatedProductIds: number[];
};

export type AdminUserUpdateInput = {
  id: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  postalCode: string;
  address: string;
  role: AdminUserProfile["role"];
  marketingSubscription: boolean;
  merchantDiscountPercent?: number;
};

export type AdminOrderRecord = {
  id: string;
  orderNumber: string;
  status: string;
  customerFullName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryMethodLabel: string;
  deliveryDestination: string;
  deliveryNotes: string;
  subtotal: number;
  shipping: number;
  total: number;
  promoCode: string | null;
  orderCreatedAt: string;
  createdAt: string;
  items: Array<{
    id: string;
    productId: number | null;
    productName: string;
    packaging: string;
    imageUrl: string | null;
    productUrl: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

type AdminOrderItemRow = {
  id: string;
  product_id: number | null;
  product_name: string;
  packaging: string;
  image_url: string | null;
  product_url: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type AdminOrderRow = {
  id: string;
  order_number: string;
  status: string;
  customer_full_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_method_label: string;
  delivery_destination: string;
  delivery_notes: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  promo_code_text: string | null;
  order_created_at: string;
  created_at: string;
  customer_order_items?: AdminOrderItemRow[];
};

type CategoryRow = { id: number; slug: string };
type AudienceRow = { id: number; slug: string };

export type AdminVisitRecord = {
  id: string;
  sessionId: string;
  visitorId: string | null;
  startedAt: string;
  lastSeenAt: string;
  pageviewCount: number;
  referrer: string | null;
  userAgent: string | null;
  landingPath: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  pageviews: Array<{
    id: string;
    path: string;
    title: string | null;
    viewedAt: string;
  }>;
};

export type AdminVisitorRecord = {
  id: string;
  visitorToken: string;
  fingerprintHash: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

type VisitPageviewRow = {
  id: string;
  path: string;
  title: string | null;
  viewed_at: string;
};

type VisitRow = {
  id: string;
  session_id: string;
  visitor_id: string | null;
  started_at: string;
  last_seen_at: string;
  pageview_count: number;
  referrer: string | null;
  user_agent: string | null;
  landing_path: string | null;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  visit_pageviews?: VisitPageviewRow[];
};

type VisitorRow = {
  id: string;
  visitor_token: string;
  fingerprint_hash: string | null;
  first_seen_at: string;
  last_seen_at: string;
  visit_count: number;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

function toSlugList(value: Array<string | undefined> | null | undefined) {
  return (value ?? []).filter((slug): slug is string => Boolean(slug));
}

function getNestedSlug(entry: unknown, relationKey: "categories" | "audiences") {
  const relation = (entry as Record<string, unknown>)[relationKey];
  const nestedValue = Array.isArray(relation) ? relation[0] : relation;

  if (!nestedValue || typeof nestedValue !== "object") {
    return undefined;
  }

  const slug = (nestedValue as { slug?: unknown }).slug;
  return typeof slug === "string" ? slug : undefined;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueNumbers(values: number[]) {
  return Array.from(
    new Set(
      values.filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
}

function mapAdminOrder(row: AdminOrderRow): AdminOrderRecord {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerFullName: row.customer_full_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    deliveryMethodLabel: row.delivery_method_label,
    deliveryDestination: row.delivery_destination,
    deliveryNotes: row.delivery_notes ?? "",
    subtotal: Number(row.subtotal ?? 0),
    shipping: Number(row.shipping ?? 0),
    total: Number(row.total ?? 0),
    promoCode: row.promo_code_text ?? null,
    orderCreatedAt: row.order_created_at,
    createdAt: row.created_at,
    items: (row.customer_order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      packaging: item.packaging,
      imageUrl: normalizeOrderImageUrl(item.image_url),
      productUrl: item.product_url,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      totalPrice: Number(item.total_price ?? 0),
    })),
  };
}

export async function getAdminProducts() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      brand,
      badge,
      discount_percent,
      price_eur,
      price_bgn,
      packaging,
      weight,
      rating,
      stock_quantity,
      description,
      slug,
      seo_title,
      meta_description,
      focus_keyword,
      summary,
      faq,
      gtin,
      translations,
      product_categories(categories(slug)),
      product_audiences(audiences(slug)),
      product_images(image_src, sort_order, alt, translations),
      product_highlights(text, sort_order, translations),
      related_products!product_id(related_product_id)
    `)
    .order("id");

  if (error) {
    throw new Error(`Failed to fetch admin products: ${error.message}`);
  }

  type ImageRow = { image_src: string; sort_order: number; alt: string | null; translations: Translations };
  type HighlightRow = { text: string; sort_order: number; translations: Translations };
  const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

  return (data ?? []).map((row) => {
    const en = (row.translations as Translations)?.en ?? {};
    const images = [...((row.product_images ?? []) as ImageRow[])].sort(bySortOrder);
    const highlightRows = [...((row.product_highlights ?? []) as HighlightRow[])].sort(bySortOrder);

    return {
    id: Number(row.id),
    seo: {
      slug: row.slug ?? "",
      seoTitle: row.seo_title ?? "",
      metaDescription: row.meta_description ?? "",
      focusKeyword: row.focus_keyword ?? "",
      summary: row.summary ?? "",
      faq: toFaqList(row.faq),
      gtin: row.gtin ?? "",
      imageAlts: images.map((image) => image.alt ?? ""),
    },
    en: {
      name: asString(en.name),
      slug: asString(en.slug),
      packaging: asString(en.packaging),
      description: asString(en.description),
      seoTitle: asString(en.seo_title),
      metaDescription: asString(en.meta_description),
      focusKeyword: asString(en.focus_keyword),
      summary: asString(en.summary),
      faq: toFaqList(en.faq),
      highlights: highlightRows.map((h) => asString(h.translations?.en?.text)),
      imageAlts: images.map((image) => asString(image.translations?.en?.alt)),
    },
    name: row.name,
    brand: row.brand,
    badge: row.badge,
    discountPercent: row.discount_percent ?? null,
    priceEur: Number(row.price_eur),
    priceBgn: Number(row.price_bgn),
    packaging: row.packaging ?? "",
    weight: Number(row.weight ?? 0),
    rating: Number(row.rating ?? 0),
    stock: Math.max(0, Math.trunc(Number(row.stock_quantity ?? 0))),
    description: row.description ?? "",
    categories: toSlugList(
      (row.product_categories ?? []).map((entry) => getNestedSlug(entry, "categories")),
    ),
    audiences: toSlugList(
      (row.product_audiences ?? []).map((entry) => getNestedSlug(entry, "audiences")),
    ),
    imageKeys: [...(row.product_images ?? [])]
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((entry: { image_src: string }) => entry.image_src)
      .filter(Boolean),
    highlights: [...(row.product_highlights ?? [])]
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((entry: { text: string }) => entry.text)
      .filter(Boolean),
    relatedProductIds: [...(row.related_products ?? [])]
      .map((entry: { related_product_id: number }) => Number(entry.related_product_id))
      .filter((value: number) => Number.isInteger(value)),
    };
  }) satisfies AdminProductRecord[];
}

// ── i18n / SEO helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Translations = Record<string, Record<string, any>> | null;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toFaqList(value: unknown): AdminFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({ question: asString(item?.question).trim(), answer: asString(item?.answer).trim() }))
    .filter((item) => item.question && item.answer);
}

/** Drops empty values so missing English fields fall back to Bulgarian. */
function compact(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim() !== "" : value != null,
    ),
  );
}

export async function getAdminUsers() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, email, phone, country, city, postal_code, address, role, marketing_subscription, merchant_discount_percent, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch admin users: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    country: row.country ?? "",
    city: row.city ?? "",
    postalCode: row.postal_code ?? "",
    address: row.address ?? "",
    role: row.role,
    marketingSubscription: Boolean(row.marketing_subscription),
    merchantDiscountPercent: Number(row.merchant_discount_percent ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) satisfies AdminUserProfile[];
}

export async function getAdminOrders() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_orders")
    .select(`
      id,
      order_number,
      status,
      customer_full_name,
      customer_email,
      customer_phone,
      delivery_method_label,
      delivery_destination,
      delivery_notes,
      subtotal,
      shipping,
      total,
      promo_code_text,
      order_created_at,
      created_at,
      customer_order_items(
        id,
        product_id,
        product_name,
        packaging,
        image_url,
        product_url,
        quantity,
        unit_price,
        total_price
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch admin orders: ${error.message}`);
  }

  return ((data ?? []) as AdminOrderRow[]).map(mapAdminOrder);
}

export async function getAdminOrderById(orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_orders")
    .select(`
      id,
      order_number,
      status,
      customer_full_name,
      customer_email,
      customer_phone,
      delivery_method_label,
      delivery_destination,
      delivery_notes,
      subtotal,
      shipping,
      total,
      promo_code_text,
      order_created_at,
      created_at,
      customer_order_items(
        id,
        product_id,
        product_name,
        packaging,
        image_url,
        product_url,
        quantity,
        unit_price,
        total_price
      )
    `)
    .eq("id", orderId)
    .maybeSingle<AdminOrderRow>();

  if (error) {
    throw new Error(`Failed to fetch admin order: ${error.message}`);
  }

  return data ? mapAdminOrder(data) : null;
}

export async function getAdminVisits({ limit = 500 }: { limit?: number } = {}): Promise<AdminVisitRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("site_visits")
    .select(`
      id,
      session_id,
      visitor_id,
      started_at,
      last_seen_at,
      pageview_count,
      referrer,
      user_agent,
      landing_path,
      country,
      country_code,
      region,
      city,
      latitude,
      longitude,
      visit_pageviews(id, path, title, viewed_at)
    `)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch admin visits: ${error.message}`);
  }

  return ((data ?? []) as VisitRow[]).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    visitorId: row.visitor_id,
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
    pageviewCount: row.pageview_count,
    referrer: row.referrer,
    userAgent: row.user_agent,
    landingPath: row.landing_path,
    country: row.country,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    pageviews: [...(row.visit_pageviews ?? [])]
      .sort((a, b) => new Date(a.viewed_at).getTime() - new Date(b.viewed_at).getTime())
      .map((pv) => ({
        id: pv.id,
        path: pv.path,
        title: pv.title,
        viewedAt: pv.viewed_at,
      })),
  }));
}

export async function getAdminVisitors({ limit = 500 }: { limit?: number } = {}): Promise<AdminVisitorRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("site_visitors")
    .select(
      "id, visitor_token, fingerprint_hash, first_seen_at, last_seen_at, visit_count, country, country_code, region, city, latitude, longitude",
    )
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch admin visitors: ${error.message}`);
  }

  return ((data ?? []) as VisitorRow[]).map((row) => ({
    id: row.id,
    visitorToken: row.visitor_token,
    fingerprintHash: row.fingerprint_hash,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    visitCount: row.visit_count,
    country: row.country,
    countryCode: row.country_code,
    region: row.region,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
  }));
}

export async function getAdminTaxonomy() {
  const supabase = createSupabaseAdminClient();
  const [{ data: categoryRows, error: categoryError }, { data: audienceRows, error: audienceError }] =
    await Promise.all([
      supabase.from("categories").select("id, slug").order("slug"),
      supabase.from("audiences").select("id, slug").order("slug"),
    ]);

  if (categoryError) {
    throw new Error(`Failed to fetch categories: ${categoryError.message}`);
  }

  if (audienceError) {
    throw new Error(`Failed to fetch audiences: ${audienceError.message}`);
  }

  return {
    categories: (categoryRows ?? []) as CategoryRow[],
    audiences: (audienceRows ?? []) as AudienceRow[],
  };
}

async function replaceRows(
  table: string,
  productId: number,
  rows: Record<string, unknown>[],
) {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase.from(table).delete().eq("product_id", productId);

  if (deleteError) {
    throw new Error(`Failed to clear ${table}: ${deleteError.message}`);
  }

  if (!rows.length) {
    return;
  }

  const { error: insertError } = await supabase.from(table).insert(rows);

  if (insertError) {
    throw new Error(`Failed to save ${table}: ${insertError.message}`);
  }
}

export async function saveAdminProduct(input: AdminProductInput) {
  const normalizedInput = {
    ...input,
    categories: uniqueStrings(input.categories),
    audiences: uniqueStrings(input.audiences),
    imageKeys: uniqueStrings(input.imageKeys),
    highlights: uniqueStrings(input.highlights),
    relatedProductIds: uniqueNumbers(input.relatedProductIds).filter((id) => id !== input.id),
  };
  const supabase = createSupabaseAdminClient();
  const { categories, audiences } = await getAdminTaxonomy();
  const categoryMap = new Map(categories.map((row) => [row.slug, row.id]));
  const audienceMap = new Map(audiences.map((row) => [row.slug, row.id]));

  const unknownCategories = normalizedInput.categories.filter((slug) => !categoryMap.has(slug));
  const unknownAudiences = normalizedInput.audiences.filter((slug) => !audienceMap.has(slug));

  if (unknownCategories.length) {
    throw new Error(`Unknown categories: ${unknownCategories.join(", ")}`);
  }

  if (unknownAudiences.length) {
    throw new Error(`Unknown audiences: ${unknownAudiences.join(", ")}`);
  }

  const { data: existing } = await supabase
    .from("products")
    .select("name, slug, old_slugs, translations")
    .eq("id", normalizedInput.id)
    .maybeSingle<{ name: string; slug: string | null; old_slugs: string[] | null; translations: Translations }>();

  const seo = input.seo;
  const en = input.en;
  if (seo?.gtin.trim() && !isValidGtin(normalizeGtin(seo.gtin))) {
    throw new Error(`Баркодът „${seo.gtin.trim()}“ не е валиден EAN/GTIN (грешна дължина или контролна цифра).`);
  }
  const slug = seo ? slugifyQuestion(seo.slug || normalizedInput.name) || null : (existing?.slug ?? null);
  const enSlug = en ? slugifyQuestion(en.slug || en.name) : "";
  const previousEnSlug = asString(existing?.translations?.en?.slug);
  const effectiveEnSlug = en ? enSlug : previousEnSlug;
  if (effectiveEnSlug) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from("products")
      .select("id")
      .eq("translations->en->>slug", effectiveEnSlug)
      .neq("id", normalizedInput.id)
      .limit(1);
    if (duplicateError) throw new Error(`Failed to check English URL: ${duplicateError.message}`);
    if (duplicate?.length) throw new Error(`The English URL slug "${effectiveEnSlug}" is already used by another product.`);
  }
  // Retired slugs keep redirecting (any language), so changing a URL is safe.
  const oldSlugs = [
    ...new Set([
      ...(existing?.old_slugs ?? []),
      ...(existing ? [`${slugifyQuestion(existing.name)}-${normalizedInput.id}`] : []),
      ...(existing?.slug && existing.slug !== slug ? [existing.slug] : []),
      ...(previousEnSlug && en && previousEnSlug !== enSlug ? [previousEnSlug] : []),
    ]),
  ].filter((value) => value !== slug && value !== enSlug);

  const translations = { ...(existing?.translations ?? {}) };
  if (en) {
    translations.en = compact({
      ...(existing?.translations?.en ?? {}),
      name: en.name.trim(),
      slug: enSlug,
      packaging: en.packaging.trim(),
      description: en.description.trim(),
      seo_title: en.seoTitle.trim(),
      meta_description: en.metaDescription.trim(),
      focus_keyword: en.focusKeyword.trim(),
      summary: en.summary.trim(),
      faq: toFaqList(en.faq),
    });
  }

  const { error: productError } = await supabase.from("products").upsert({
    id: normalizedInput.id,
    // Used as lastModified in the sitemap.
    updated_at: new Date().toISOString(),
    slug,
    old_slugs: oldSlugs,
    translations,
    ...(seo
      ? {
          seo_title: seo.seoTitle.trim() || null,
          meta_description: seo.metaDescription.trim() || null,
          focus_keyword: seo.focusKeyword.trim() || null,
          summary: seo.summary.trim() || null,
          faq: toFaqList(seo.faq),
          gtin: seo.gtin.trim() || null,
        }
      : {}),
    name: normalizedInput.name,
    brand: normalizedInput.brand,
    badge: normalizedInput.badge,
    discount_percent: normalizedInput.discountPercent,
    price_eur: normalizedInput.priceEur,
    price_bgn: normalizedInput.priceBgn,
    packaging: normalizedInput.packaging,
    weight: normalizedInput.weight,
    rating: normalizedInput.rating,
    stock_quantity: Math.max(0, Math.trunc(Number(normalizedInput.stock) || 0)),
    description: normalizedInput.description,
  });

  if (productError) {
    if (productError.code === "23505") {
      const duplicateSlug = productError.message.includes("products_en_slug_key") ? effectiveEnSlug : slug;
      throw new Error(`The URL slug "${duplicateSlug}" is already used by another product.`);
    }
    throw new Error(`Failed to save product: ${productError.message}`);
  }

  await Promise.all([
    replaceRows(
      "product_categories",
      normalizedInput.id,
      normalizedInput.categories.map((slug) => ({
        product_id: normalizedInput.id,
        category_id: categoryMap.get(slug),
      })),
    ),
    replaceRows(
      "product_audiences",
      normalizedInput.id,
      normalizedInput.audiences.map((slug) => ({
        product_id: normalizedInput.id,
        audience_id: audienceMap.get(slug),
      })),
    ),
    replaceRows(
      "product_images",
      normalizedInput.id,
      normalizedInput.imageKeys.map((imageSrc, index) => ({
        product_id: normalizedInput.id,
        image_src: imageSrc,
        sort_order: index,
        // Re-inserted rows must carry their alt texts, or they would be lost.
        alt: seo?.imageAlts[index]?.trim() || null,
        translations: en?.imageAlts[index]?.trim() ? { en: { alt: en.imageAlts[index].trim() } } : {},
      })),
    ),
    replaceRows(
      "product_highlights",
      normalizedInput.id,
      normalizedInput.highlights.map((text, index) => ({
        product_id: normalizedInput.id,
        text,
        sort_order: index,
        translations: en?.highlights[index]?.trim() ? { en: { text: en.highlights[index].trim() } } : {},
      })),
    ),
    replaceRows(
      "related_products",
      normalizedInput.id,
      normalizedInput.relatedProductIds.map((relatedProductId) => ({
        product_id: normalizedInput.id,
        related_product_id: relatedProductId,
      })),
    ),
  ]);
}

export async function deleteAdminProduct(productId: number) {
  const supabase = createSupabaseAdminClient();

  for (const table of [
    "related_products",
    "product_comments",
    "product_highlights",
    "product_images",
    "product_audiences",
    "product_categories",
  ]) {
    const { error } = await supabase.from(table).delete().eq("product_id", productId);

    if (error) {
      throw new Error(`Failed to delete ${table}: ${error.message}`);
    }
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`);
  }
}

export async function updateAdminUser(input: AdminUserUpdateInput) {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("id", input.id)
    .maybeSingle<{ email: string | null }>();

  if (existingError) {
    throw new Error(`Failed to load existing user profile: ${existingError.message}`);
  }

  const updates: Record<string, unknown> = {
    username: input.username,
    email: input.email,
    phone: input.phone,
    country: input.country,
    city: input.city,
    postal_code: input.postalCode,
    address: input.address,
    role: input.role,
    marketing_subscription: input.marketingSubscription,
    updated_at: new Date().toISOString(),
  };

  if (input.merchantDiscountPercent !== undefined) {
    updates.merchant_discount_percent = Math.max(
      0,
      Math.min(100, Number(input.merchantDiscountPercent) || 0),
    );
  }

  const { error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", input.id);

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  if (
    existing?.email &&
    existing.email.toLowerCase() !== input.email.trim().toLowerCase()
  ) {
    await unsubscribeMarketingEmail({ email: existing.email });
  }

  await syncMarketingSubscriberForProfile({
    userId: input.id,
    email: input.email,
    enabled: input.marketingSubscription,
    source: "admin-user-edit",
  });
}

export async function updateAdminOrderStatus(orderId: string, status: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("order_number, customer_full_name, customer_email, raw_payload")
    .single<{
      order_number: string;
      customer_full_name: string;
      customer_email: string;
      raw_payload: unknown;
    }>();

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  return {
    orderNumber: data.order_number,
    customerFullName: data.customer_full_name,
    customerEmail: data.customer_email,
    rawPayload: data.raw_payload,
  };
}

type SavedOrderInput = {
  orderId: string;
  status: string;
  createdAt: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  delivery: {
    methodLabel: string;
    destination: string;
    notes?: string;
  };
  items: Array<{
    id?: string;
    name: string;
    packaging: string;
    imageUrl?: string;
    productUrl?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totals: {
    subtotal: number;
    shipping: number;
    total: number;
  };
  promo?: {
    id: string;
    code: string;
    merchantId: string;
    discountPercent: number;
    discountAmount: number;
    commissionPercent: number;
    commissionAmount: number;
  } | null;
  rawPayload: unknown;
};

export async function saveCustomerOrder(input: SavedOrderInput) {
  const supabase = createSupabaseAdminClient();
  const { data: orderRow, error: orderError } = await supabase
    .from("customer_orders")
    .upsert(
      {
        order_number: input.orderId,
        status: input.status,
        customer_full_name: input.customer.fullName,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone,
        delivery_method_label: input.delivery.methodLabel,
        delivery_destination: input.delivery.destination,
        delivery_notes: input.delivery.notes ?? "",
        subtotal: input.totals.subtotal,
        shipping: input.totals.shipping,
        total: input.totals.total,
        order_created_at: input.createdAt,
        raw_payload: input.rawPayload,
        promo_code_id: input.promo?.id ?? null,
        promo_code_text: input.promo?.code ?? null,
        promo_discount_percent: input.promo?.discountPercent ?? null,
        promo_discount_amount: input.promo?.discountAmount ?? null,
        promo_merchant_id: input.promo?.merchantId ?? null,
        promo_commission_percent: input.promo?.commissionPercent ?? null,
        promo_commission_amount: input.promo?.commissionAmount ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "order_number" },
    )
    .select("id")
    .single<{ id: string }>();

  if (orderError) {
    throw new Error(`Failed to save customer order: ${orderError.message}`);
  }

  const orderId = orderRow.id;
  const { error: deleteItemsError } = await supabase
    .from("customer_order_items")
    .delete()
    .eq("order_id", orderId);

  if (deleteItemsError) {
    throw new Error(`Failed to clear customer order items: ${deleteItemsError.message}`);
  }

  if (!input.items.length) {
    return orderId;
  }

  const { error: insertItemsError } = await supabase
    .from("customer_order_items")
    .insert(
      input.items.map((item) => ({
        order_id: orderId,
        product_id: item.id ? Number.parseInt(item.id, 10) || null : null,
        product_name: item.name,
        packaging: item.packaging,
        image_url: item.imageUrl ?? null,
        product_url: item.productUrl ?? null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      })),
    );

  if (insertItemsError) {
    throw new Error(`Failed to save customer order items: ${insertItemsError.message}`);
  }

  return orderId;
}
