/**
 * Reads customer_orders and customer_order_items from the DEV Supabase database
 * and generates a complete SQL migration file (schema + data) ready
 * to be pasted into the PRODUCTION Supabase SQL Editor.
 *
 * Usage:
 *   node scripts/migrate-orders-to-production.mjs
 *
 * Output:
 *   scripts/migrate-orders-to-production.sql
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const DEV_URL = "https://zjlhbkgjcrevfjlkgtzm.supabase.co";
const DEV_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqbGhia2dqY3JldmZqbGtndHptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgzNDc5NywiZXhwIjoyMDkzNDEwNzk3fQ.cpB0v60y99WEAwLW5iiF4cNEKgLyWmm_wwVz2bqsfhg";

const supabase = createClient(DEV_URL, DEV_KEY);

function esc(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  console.log("Fetching customer_orders from dev...");
  const { data: orders, error: ordersErr } = await supabase
    .from("customer_orders")
    .select("*")
    .order("created_at", { ascending: true });

  if (ordersErr) throw new Error(`customer_orders: ${ordersErr.message}`);
  console.log(`  → ${orders.length} orders`);

  console.log("Fetching customer_order_items from dev...");
  const { data: items, error: itemsErr } = await supabase
    .from("customer_order_items")
    .select("*")
    .order("order_id, created_at", { ascending: true });

  if (itemsErr) throw new Error(`customer_order_items: ${itemsErr.message}`);
  console.log(`  → ${items.length} order items`);

  const lines = [];

  lines.push(`-- =============================================================================`);
  lines.push(`-- Orders migration for production`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Orders: ${orders.length}  |  Items: ${items.length}`);
  lines.push(`-- Safe to run multiple times (fully idempotent).`);
  lines.push(`-- Does NOT touch: products, blog_posts, blog_blocks, user_profiles or any other table.`);
  lines.push(`-- =============================================================================`);
  lines.push(``);

  // ── Schema ──────────────────────────────────────────────────────────────
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 1. customer_orders table`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  lines.push(``);
  lines.push(`CREATE TABLE IF NOT EXISTS customer_orders (`);
  lines.push(`  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  order_number          TEXT          NOT NULL UNIQUE,`);
  lines.push(`  status                TEXT          NOT NULL DEFAULT 'Потвърдена',`);
  lines.push(`  customer_full_name    TEXT          NOT NULL,`);
  lines.push(`  customer_email        TEXT          NOT NULL,`);
  lines.push(`  customer_phone        TEXT          NOT NULL,`);
  lines.push(`  delivery_method_label TEXT          NOT NULL,`);
  lines.push(`  delivery_destination  TEXT          NOT NULL,`);
  lines.push(`  delivery_notes        TEXT          NOT NULL DEFAULT '',`);
  lines.push(`  subtotal              NUMERIC(10,2) NOT NULL,`);
  lines.push(`  shipping              NUMERIC(10,2) NOT NULL,`);
  lines.push(`  total                 NUMERIC(10,2) NOT NULL,`);
  lines.push(`  order_created_at      TEXT          NOT NULL,`);
  lines.push(`  raw_payload           JSONB         NOT NULL DEFAULT '{}'::jsonb,`);
  lines.push(`  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),`);
  lines.push(`  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 2. customer_order_items table`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`CREATE TABLE IF NOT EXISTS customer_order_items (`);
  lines.push(`  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  order_id     UUID          NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,`);
  lines.push(`  product_id   INTEGER       REFERENCES products(id) ON DELETE SET NULL,`);
  lines.push(`  product_name TEXT          NOT NULL,`);
  lines.push(`  packaging    TEXT          NOT NULL,`);
  lines.push(`  image_url    TEXT,`);
  lines.push(`  product_url  TEXT,`);
  lines.push(`  quantity     INTEGER       NOT NULL CHECK (quantity > 0),`);
  lines.push(`  unit_price   NUMERIC(10,2) NOT NULL,`);
  lines.push(`  total_price  NUMERIC(10,2) NOT NULL,`);
  lines.push(`  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`CREATE INDEX IF NOT EXISTS customer_orders_created_at_idx ON customer_orders (created_at DESC);`);
  lines.push(`CREATE INDEX IF NOT EXISTS customer_orders_status_idx ON customer_orders (status);`);
  lines.push(`CREATE INDEX IF NOT EXISTS customer_order_items_order_id_idx ON customer_order_items (order_id);`);
  lines.push(``);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 3. Row-level security (admin service role bypasses RLS)`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`ALTER TABLE customer_orders      ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE customer_order_items ENABLE ROW LEVEL SECURITY;`);
  lines.push(``);

  // ── Data — orders ────────────────────────────────────────────────────────
  if (orders.length > 0) {
    lines.push(`-- ---------------------------------------------------------------------------`);
    lines.push(`-- 4. Data — customer_orders (${orders.length} rows)`);
    lines.push(`-- ---------------------------------------------------------------------------`);

    for (const o of orders) {
      lines.push(
        `INSERT INTO customer_orders ` +
        `(id, order_number, status, customer_full_name, customer_email, customer_phone, ` +
        `delivery_method_label, delivery_destination, delivery_notes, ` +
        `subtotal, shipping, total, order_created_at, raw_payload, created_at, updated_at) VALUES (` +
        `${esc(o.id)}, ${esc(o.order_number)}, ${esc(o.status)}, ${esc(o.customer_full_name)}, ` +
        `${esc(o.customer_email)}, ${esc(o.customer_phone)}, ` +
        `${esc(o.delivery_method_label)}, ${esc(o.delivery_destination)}, ${esc(o.delivery_notes)}, ` +
        `${esc(o.subtotal)}, ${esc(o.shipping)}, ${esc(o.total)}, ` +
        `${esc(o.order_created_at)}, ${esc(o.raw_payload)}, ${esc(o.created_at)}, ${esc(o.updated_at)}` +
        `) ON CONFLICT (id) DO UPDATE SET ` +
        `status=${esc(o.status)}, order_number=${esc(o.order_number)}, ` +
        `customer_full_name=${esc(o.customer_full_name)}, customer_email=${esc(o.customer_email)}, ` +
        `customer_phone=${esc(o.customer_phone)}, delivery_method_label=${esc(o.delivery_method_label)}, ` +
        `delivery_destination=${esc(o.delivery_destination)}, delivery_notes=${esc(o.delivery_notes)}, ` +
        `subtotal=${esc(o.subtotal)}, shipping=${esc(o.shipping)}, total=${esc(o.total)}, ` +
        `order_created_at=${esc(o.order_created_at)}, raw_payload=${esc(o.raw_payload)}, updated_at=${esc(o.updated_at)};`
      );
    }
    lines.push(``);
  }

  // ── Data — order items ───────────────────────────────────────────────────
  if (items.length > 0) {
    lines.push(`-- ---------------------------------------------------------------------------`);
    lines.push(`-- 5. Data — customer_order_items (${items.length} rows)`);
    lines.push(`-- ---------------------------------------------------------------------------`);

    for (const i of items) {
      lines.push(
        `INSERT INTO customer_order_items ` +
        `(id, order_id, product_id, product_name, packaging, image_url, product_url, quantity, unit_price, total_price, created_at) VALUES (` +
        `${esc(i.id)}, ${esc(i.order_id)}, ${esc(i.product_id)}, ${esc(i.product_name)}, ` +
        `${esc(i.packaging)}, ${esc(i.image_url)}, ${esc(i.product_url)}, ` +
        `${esc(i.quantity)}, ${esc(i.unit_price)}, ${esc(i.total_price)}, ${esc(i.created_at)}` +
        `) ON CONFLICT (id) DO UPDATE SET ` +
        `product_id=${esc(i.product_id)}, product_name=${esc(i.product_name)}, packaging=${esc(i.packaging)}, ` +
        `image_url=${esc(i.image_url)}, product_url=${esc(i.product_url)}, ` +
        `quantity=${esc(i.quantity)}, unit_price=${esc(i.unit_price)}, total_price=${esc(i.total_price)};`
      );
    }
    lines.push(``);
  }

  lines.push(`-- Done.`);

  const outPath = new URL("./migrate-orders-to-production.sql", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`\nWritten to: ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
