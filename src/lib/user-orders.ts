import "server-only";

import { normalizeOrderImageUrl } from "@/lib/order-image";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type UserOrderItem = {
  id: string;
  productName: string;
  packaging: string;
  imageUrl: string | null;
  productUrl: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type UserOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerFullName: string;
  deliveryMethodLabel: string;
  deliveryDestination: string;
  subtotal: number;
  shipping: number;
  total: number;
  promoCode: string | null;
  orderCreatedAt: string;
  createdAt: string;
  items: UserOrderItem[];
};

type OrderItemRow = {
  id: string;
  product_name: string;
  packaging: string;
  image_url: string | null;
  product_url: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  customer_full_name: string;
  delivery_method_label: string;
  delivery_destination: string;
  subtotal: number;
  shipping: number;
  total: number;
  promo_code_text: string | null;
  order_created_at: string;
  created_at: string;
  customer_order_items?: OrderItemRow[];
};

export async function getOrdersForEmail(email: string): Promise<UserOrder[]> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("customer_orders")
    .select(
      `id, order_number, status, customer_full_name, delivery_method_label,
       delivery_destination, subtotal, shipping, total, promo_code_text,
       order_created_at, created_at,
       customer_order_items ( id, product_name, packaging, image_url, product_url,
         quantity, unit_price, total_price )`,
    )
    .ilike("customer_email", normalized)
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>();

  if (error) {
    throw new Error(`Failed to load orders: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerFullName: row.customer_full_name,
    deliveryMethodLabel: row.delivery_method_label,
    deliveryDestination: row.delivery_destination,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
    promoCode: row.promo_code_text,
    orderCreatedAt: row.order_created_at,
    createdAt: row.created_at,
    items: (row.customer_order_items ?? []).map((item) => ({
      id: item.id,
      productName: item.product_name,
      packaging: item.packaging,
      imageUrl: normalizeOrderImageUrl(item.image_url),
      productUrl: item.product_url,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
    })),
  }));
}
