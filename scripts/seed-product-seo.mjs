/**
 * Writes the per-product SEO content from scripts/data/product-seo.json:
 *   products.slug / seo_title / meta_description / focus_keyword / summary / faq (Bulgarian)
 *   products.translations.en (name, slug, SEO fields, summary, faq, packaging)
 *   product_highlights.translations.en.text, product_images.alt (+ translations.en.alt)
 *
 * Requires migration 032_i18n_seo.sql. Existing English descriptions in
 * products.translations.en are kept.
 *
 * Usage:
 *   node scripts/seed-product-seo.mjs --target=prod            # dry run
 *   node scripts/seed-product-seo.mjs --target=prod --apply    # write
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvFile() {
  try {
    return Object.fromEntries(
      readFileSync(resolve(__dirname, "../.env.local"), "utf-8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
    );
  } catch {
    return {};
  }
}

function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith("--"))
      .map((arg) => {
        const [key, ...value] = arg.slice(2).split("=");
        return [key, value.join("=") || "true"];
      }),
  );
}

const env = { ...readEnvFile(), ...process.env };
const args = parseArgs(process.argv.slice(2));
const target = String(args.target || "dev").toLowerCase();
const apply = args.apply === "true";
const url = target === "prod" ? env.PROD_SUPABASE_URL : env.DEV_SUPABASE_URL;
const key = target === "prod" ? env.PROD_SUPABASE_SERVICE_ROLE_KEY : env.DEV_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(`Missing ${target.toUpperCase()}_SUPABASE_URL / ${target.toUpperCase()}_SUPABASE_SERVICE_ROLE_KEY in .env.local`);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const data = JSON.parse(readFileSync(resolve(__dirname, "data/product-seo.json"), "utf-8"));

async function run() {
  console.log(`Target: ${target}${apply ? "" : " (dry run — pass --apply to write)"}\n`);

  for (const [id, { bg, en }] of Object.entries(data)) {
    const productId = Number(id);
    const { data: product, error } = await supabase
      .from("products")
      .select("id, name, translations, product_highlights(*), product_images(*)")
      .eq("id", productId)
      .maybeSingle();

    if (error) throw new Error(`Product ${id}: ${error.message}`);
    if (!product) {
      console.warn(`- #${id}: not found, skipped`);
      continue;
    }

    const translations = product.translations ?? {};
    const { highlights: enHighlights, alt: enAlt, ...enFields } = en;
    const nextTranslations = { ...translations, en: { ...(translations.en ?? {}), ...enFields } };

    console.log(`#${id} ${product.name} → /produkti/${bg.slug} | /en/products/${en.slug}`);
    if (!apply) continue;

    const { error: updateError } = await supabase
      .from("products")
      .update({
        slug: bg.slug,
        seo_title: bg.seo_title,
        meta_description: bg.meta_description,
        focus_keyword: bg.focus_keyword,
        summary: bg.summary,
        faq: bg.faq,
        translations: nextTranslations,
      })
      .eq("id", productId);
    if (updateError) throw new Error(`Product ${id}: ${updateError.message}`);

    const highlights = [...(product.product_highlights ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    for (const [index, highlight] of highlights.entries()) {
      const text = enHighlights?.[index];
      if (!text) continue;
      const { error: hError } = await supabase
        .from("product_highlights")
        .update({ translations: { ...(highlight.translations ?? {}), en: { text } } })
        .eq("id", highlight.id);
      if (hError) throw new Error(`Highlight ${highlight.id}: ${hError.message}`);
    }

    const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    for (const image of images) {
      const { error: iError } = await supabase
        .from("product_images")
        .update({
          alt: bg.alt,
          translations: { ...(image.translations ?? {}), en: { alt: enAlt } },
        })
        .eq("id", image.id);
      if (iError) throw new Error(`Image ${image.id}: ${iError.message}`);
    }
  }

  console.log(apply ? "\nDone." : "\nDry run finished.");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
