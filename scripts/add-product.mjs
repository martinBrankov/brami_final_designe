/**
 * Add or update a single product in Supabase.
 *
 * Usage:
 *   node scripts/add-product.mjs
 *
 * Edit the PRODUCT object below, then run the script.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Edit this object to add/update a product ───────────────────────────────

/** @type {import('../entryData/products.json')[0]} */
const PRODUCT = {
  id: 20, // нов id (или съществуващ за update)
  name: "Нов продукт",
  brand: "brami", // "brami" | "Voditsa" | "other"
  badge: "new",   // "bestseller" | "sale" | "new" | "favorite" | "featured" | "none"
  // discountPercent: 10,  // само при badge: "sale"
  price: "€10.00/19.56лв.",
  packaging: "100мл.",
  weight: 0.120,
  rating: 5,
  category: ["body"], // "face" | "body" | "hair"  — масив
  audience: ["unisex"], // "women" | "men" | "unisex" — масив
  imageSrc: ["id01"], // ключ от productImages в products.ts
  checkboxInfo: [
    "Натурален продукт",
    "Дълбока хидратация",
  ],
  comments: [
    // { name: "Иван", comment: "Страхотен!", rating: 5, data: "2026-05-01" }
  ],
  relatedProductIds: [1, 2, 3],
  description: "Описание на продукта.",
};

// ────────────────────────────────────────────────────────────────────────────

const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return i > -1 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null;
    })
    .filter(Boolean),
);

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function parsePrice(priceStr) {
  const match = priceStr.match(/€([\d.]+)\/([\d.]+)лв\./);
  if (!match) throw new Error(`Invalid price format: "${priceStr}"\nExpected: "€10.00/19.56лв."`);
  return { eur: parseFloat(match[1]), bgn: parseFloat(match[2]) };
}

async function assertOk(result, ctx) {
  if (result.error) throw new Error(`[${ctx}] ${result.error.message}`);
  return result;
}

async function upsertProduct(p) {
  const { eur, bgn } = parsePrice(p.price);

  // 1. Fetch lookup tables
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const { data: auds } = await supabase.from("audiences").select("id, slug");
  const catMap = Object.fromEntries(cats.map((r) => [r.slug, r.id]));
  const audMap = Object.fromEntries(auds.map((r) => [r.slug, r.id]));

  // 2. Upsert main product row
  await assertOk(
    await supabase.from("products").upsert({
      id: p.id,
      name: p.name,
      brand: p.brand,
      badge: p.badge,
      discount_percent: p.discountPercent ?? null,
      price_eur: eur,
      price_bgn: bgn,
      packaging: p.packaging,
      weight: p.weight ?? 0.2,
      rating: p.rating ?? 5,
      description: p.description ?? "",
    }),
    "products",
  );

  // 3. Categories — delete old, insert new
  await supabase.from("product_categories").delete().eq("product_id", p.id);
  if (p.category?.length) {
    await assertOk(
      await supabase.from("product_categories").insert(
        p.category.map((slug) => {
          if (!catMap[slug]) throw new Error(`Unknown category: "${slug}". Valid: ${Object.keys(catMap).join(", ")}`);
          return { product_id: p.id, category_id: catMap[slug] };
        }),
      ),
      "product_categories",
    );
  }

  // 4. Audiences — delete old, insert new
  await supabase.from("product_audiences").delete().eq("product_id", p.id);
  const audiences = p.audience?.length ? p.audience : ["unisex"];
  await assertOk(
    await supabase.from("product_audiences").insert(
      audiences.map((slug) => {
        if (!audMap[slug]) throw new Error(`Unknown audience: "${slug}". Valid: ${Object.keys(audMap).join(", ")}`);
        return { product_id: p.id, audience_id: audMap[slug] };
      }),
    ),
    "product_audiences",
  );

  // 5. Images — delete old, insert new
  await supabase.from("product_images").delete().eq("product_id", p.id);
  if (p.imageSrc?.length) {
    await assertOk(
      await supabase.from("product_images").insert(
        p.imageSrc.map((src, i) => ({ product_id: p.id, image_src: src, sort_order: i })),
      ),
      "product_images",
    );
  }

  // 6. Highlights (checkboxInfo) — delete old, insert new
  await supabase.from("product_highlights").delete().eq("product_id", p.id);
  if (p.checkboxInfo?.length) {
    await assertOk(
      await supabase.from("product_highlights").insert(
        p.checkboxInfo.map((text, i) => ({ product_id: p.id, text, sort_order: i })),
      ),
      "product_highlights",
    );
  }

  // 7. Comments — delete old, insert new
  await supabase.from("product_comments").delete().eq("product_id", p.id);
  if (p.comments?.length) {
    await assertOk(
      await supabase.from("product_comments").insert(
        p.comments.map((c) => ({
          product_id: p.id,
          author_name: c.name,
          comment: c.comment,
          rating: c.rating ?? null,
          comment_date: c.data, // ISO формат: "2026-05-01"
        })),
      ),
      "product_comments",
    );
  }

  // 8. Related products — delete old, insert new
  await supabase.from("related_products").delete().eq("product_id", p.id);
  if (p.relatedProductIds?.length) {
    await assertOk(
      await supabase.from("related_products").insert(
        p.relatedProductIds.map((relId) => ({
          product_id: p.id,
          related_product_id: relId,
        })),
      ),
      "related_products",
    );
  }

  console.log(`✓ Product ${p.id} "${p.name}" saved successfully.`);
}

upsertProduct(PRODUCT).catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
