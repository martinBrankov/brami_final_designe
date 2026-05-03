/**
 * Seed script: loads products.json into Supabase.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (bypasses RLS).
 * Find it in: Supabase Dashboard → Settings → API → service_role
 *
 * Usage:
 *   node scripts/seed-supabase.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) return null;
      return [line.slice(0, eqIdx).trim(), line.slice(eqIdx + 1).trim()];
    })
    .filter(Boolean),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local\n" +
      "Find it in: Supabase Dashboard → Settings → API → service_role",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const products = JSON.parse(
  readFileSync(resolve(__dirname, "../entryData/products.json"), "utf-8"),
);

function parsePrice(priceStr) {
  const match = priceStr.match(/€([\d.]+)\/([\d.]+)лв\./);
  if (!match) throw new Error(`Invalid price: ${priceStr}`);
  return { eur: parseFloat(match[1]), bgn: parseFloat(match[2]) };
}

async function assertNoError(result, context) {
  if (result.error) throw new Error(`[${context}] ${result.error.message}`);
}

async function seed() {
  console.log("Clearing existing data...");

  // Clear in FK-safe order
  for (const table of [
    "related_products",
    "product_comments",
    "product_highlights",
    "product_images",
    "product_audiences",
    "product_categories",
    "products",
    "audiences",
    "categories",
  ]) {
    await assertNoError(
      await supabase.from(table).delete().not("id", "is", null).catch(() =>
        // join tables without serial id
        supabase.from(table).delete().not("product_id", "is", null),
      ),
      `clear ${table}`,
    );
  }

  // categories
  await assertNoError(
    await supabase
      .from("categories")
      .upsert([{ slug: "face" }, { slug: "body" }, { slug: "hair" }], {
        onConflict: "slug",
      }),
    "categories",
  );

  // audiences
  await assertNoError(
    await supabase
      .from("audiences")
      .upsert([{ slug: "women" }, { slug: "men" }, { slug: "unisex" }], {
        onConflict: "slug",
      }),
    "audiences",
  );

  const { data: catRows } = await supabase.from("categories").select("id, slug");
  const { data: audRows } = await supabase.from("audiences").select("id, slug");
  const catMap = Object.fromEntries(catRows.map((r) => [r.slug, r.id]));
  const audMap = Object.fromEntries(audRows.map((r) => [r.slug, r.id]));

  for (const product of products) {
    const { eur, bgn } = parsePrice(product.price);

    await assertNoError(
      await supabase.from("products").upsert({
        id: product.id,
        name: product.name,
        brand: product.brand,
        badge: product.badge,
        discount_percent: product.discountPercent ?? null,
        price_eur: eur,
        price_bgn: bgn,
        packaging: product.packaging,
        weight: product.weight ?? 0.2,
        rating: product.rating,
        description: product.description ?? "",
      }),
      `product ${product.id}`,
    );

    // categories
    if (product.category?.length) {
      await assertNoError(
        await supabase.from("product_categories").upsert(
          product.category.map((slug) => ({
            product_id: product.id,
            category_id: catMap[slug],
          })),
          { onConflict: "product_id,category_id" },
        ),
        `product_categories ${product.id}`,
      );
    }

    // audiences
    const audiences = product.audience ?? ["unisex"];
    if (audiences.length) {
      await assertNoError(
        await supabase.from("product_audiences").upsert(
          audiences.map((slug) => ({
            product_id: product.id,
            audience_id: audMap[slug],
          })),
          { onConflict: "product_id,audience_id" },
        ),
        `product_audiences ${product.id}`,
      );
    }

    // images
    if (product.imageSrc?.length) {
      await assertNoError(
        await supabase.from("product_images").upsert(
          product.imageSrc.map((src, i) => ({
            product_id: product.id,
            image_src: src,
            sort_order: i,
          })),
          { onConflict: "product_id,sort_order" },
        ),
        `product_images ${product.id}`,
      );
    }

    // highlights (checkboxInfo)
    if (product.checkboxInfo?.length) {
      await assertNoError(
        await supabase.from("product_highlights").upsert(
          product.checkboxInfo.map((text, i) => ({
            product_id: product.id,
            text,
            sort_order: i,
          })),
          { onConflict: "product_id,sort_order" },
        ),
        `product_highlights ${product.id}`,
      );
    }

    // comments
    if (product.comments?.length) {
      await assertNoError(
        await supabase.from("product_comments").upsert(
          product.comments.map((c, i) => ({
            product_id: product.id,
            author_name: c.name,
            comment: c.comment,
            rating: c.rating ?? null,
            comment_date: c.data,
            sort_order: i,
          })),
          { onConflict: "product_id,sort_order" },
        ),
        `product_comments ${product.id}`,
      );
    }

    // related products
    if (product.relatedProductIds?.length) {
      await assertNoError(
        await supabase.from("related_products").upsert(
          product.relatedProductIds.map((relId, i) => ({
            product_id: product.id,
            related_product_id: relId,
            sort_order: i,
          })),
          { onConflict: "product_id,related_product_id" },
        ),
        `related_products ${product.id}`,
      );
    }

    console.log(`  ✓ Product ${product.id}: ${product.name}`);
  }

  console.log("\nSeeding complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
