import "server-only";

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
  role: "user" | "super_user" | "admin";
  marketingSubscription: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductRecord = {
  id: number;
  name: string;
  brand: "brami" | "Voditsa" | "other";
  badge: "bestseller" | "sale" | "new" | "favorite" | "featured" | "none";
  discountPercent: number | null;
  priceEur: number;
  priceBgn: number;
  packaging: string;
  weight: number;
  rating: number;
  description: string;
  categories: string[];
  audiences: string[];
  imageKeys: string[];
  highlights: string[];
  relatedProductIds: number[];
};

export type AdminProductInput = {
  id: number;
  name: string;
  brand: AdminProductRecord["brand"];
  badge: AdminProductRecord["badge"];
  discountPercent: number | null;
  priceEur: number;
  priceBgn: number;
  packaging: string;
  weight: number;
  rating: number;
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
  order_created_at: string;
  created_at: string;
  customer_order_items?: AdminOrderItemRow[];
};

type CategoryRow = { id: number; slug: string };
type AudienceRow = { id: number; slug: string };

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
    orderCreatedAt: row.order_created_at,
    createdAt: row.created_at,
    items: (row.customer_order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      packaging: item.packaging,
      imageUrl: item.image_url,
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
      description,
      product_categories(categories(slug)),
      product_audiences(audiences(slug)),
      product_images(image_src, sort_order),
      product_highlights(text, sort_order),
      related_products!product_id(related_product_id)
    `)
    .order("id");

  if (error) {
    throw new Error(`Failed to fetch admin products: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    name: row.name,
    brand: row.brand,
    badge: row.badge,
    discountPercent: row.discount_percent ?? null,
    priceEur: Number(row.price_eur),
    priceBgn: Number(row.price_bgn),
    packaging: row.packaging ?? "",
    weight: Number(row.weight ?? 0),
    rating: Number(row.rating ?? 0),
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
  })) satisfies AdminProductRecord[];
}

export async function getAdminUsers() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, email, phone, country, city, postal_code, address, role, marketing_subscription, created_at, updated_at")
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

  const { error: productError } = await supabase.from("products").upsert({
    id: normalizedInput.id,
    name: normalizedInput.name,
    brand: normalizedInput.brand,
    badge: normalizedInput.badge,
    discount_percent: normalizedInput.discountPercent,
    price_eur: normalizedInput.priceEur,
    price_bgn: normalizedInput.priceBgn,
    packaging: normalizedInput.packaging,
    weight: normalizedInput.weight,
    rating: normalizedInput.rating,
    description: normalizedInput.description,
  });

  if (productError) {
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
      })),
    ),
    replaceRows(
      "product_highlights",
      normalizedInput.id,
      normalizedInput.highlights.map((text, index) => ({
        product_id: normalizedInput.id,
        text,
        sort_order: index,
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
  const { error } = await supabase
    .from("user_profiles")
    .update({
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
    })
    .eq("id", input.id);

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
}

export async function updateAdminOrderStatus(orderId: string, status: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("customer_orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
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
