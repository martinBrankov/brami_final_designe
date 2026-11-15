/**
 * Moves database content in and out of JSON files so it can be translated in
 * the repository (e.g. with Codex) instead of through an API.
 *
 *   export → content-i18n/{products,blog,faq}.json
 *            every record has a read-only "bg" object and an "en" object to fill in
 *   import → writes the non-empty "en" values back to the `translations` columns
 *
 * Usage:
 *   node scripts/i18n-content.mjs export --target=prod
 *   node scripts/i18n-content.mjs import --target=prod            # dry run
 *   node scripts/i18n-content.mjs import --target=prod --apply
 *
 * Requires migration 032_i18n_seo.sql. Product SEO fields are seeded by
 * scripts/seed-product-seo.mjs; this script covers the long texts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../content-i18n");

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

const [command] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [k, ...v] = arg.slice(2).split("=");
      return [k, v.join("=") || "true"];
    }),
);
const env = { ...readEnvFile(), ...process.env };
const target = String(args.target || "dev").toLowerCase();
const apply = args.apply === "true";
const url = target === "prod" ? env.PROD_SUPABASE_URL : env.DEV_SUPABASE_URL;
const key = target === "prod" ? env.PROD_SUPABASE_SERVICE_ROLE_KEY : env.DEV_SUPABASE_SERVICE_ROLE_KEY;

if (!["export", "import"].includes(command)) {
  console.error("Usage: node scripts/i18n-content.mjs <export|import> --target=prod|dev [--apply]");
  process.exit(1);
}
if (!url || !key) {
  console.error(`Missing ${target.toUpperCase()}_SUPABASE_URL / _SERVICE_ROLE_KEY in .env.local`);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const bySort = (a, b) => (a.sort_order ?? a.position ?? 0) - (b.sort_order ?? b.position ?? 0);
const str = (value) => (typeof value === "string" ? value : "");
const slugify = (value) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const filePath = (name) => resolve(OUT_DIR, `${name}.json`);

// ── export ───────────────────────────────────────────────────────────────────

async function exportAll() {
  mkdirSync(OUT_DIR, { recursive: true });

  const { data: products, error: pError } = await supabase
    .from("products")
    .select("id, name, packaging, description, translations, product_highlights(id, text, sort_order, translations)")
    .order("id");
  if (pError) throw pError;
  const productRows = products.map((p) => {
    const en = p.translations?.en ?? {};
    const highlights = [...(p.product_highlights ?? [])].sort(bySort);
    return {
      id: p.id,
      bg: {
        name: p.name,
        packaging: p.packaging ?? "",
        description: p.description ?? "",
        highlights: highlights.map((h) => h.text),
      },
      en: {
        name: str(en.name),
        packaging: str(en.packaging),
        description: str(en.description),
        highlights: highlights.map((h) => str(h.translations?.en?.text)),
      },
    };
  });

  const { data: posts, error: bError } = await supabase
    .from("blog_posts")
    .select("id, title, slug, eyebrow, excerpt, read_time, translations, blog_blocks(id, type, content, position, translations)")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (bError) throw bError;
  const blogRows = posts.map((post) => {
    const en = post.translations?.en ?? {};
    const blocks = [...(post.blog_blocks ?? [])]
      .filter((b) => ["text", "image"].includes(b.type) && typeof b.content === "string" && b.content.trim())
      .sort(bySort);
    return {
      id: post.id,
      bg: {
        title: post.title,
        slug: post.slug,
        eyebrow: post.eyebrow ?? "",
        excerpt: post.excerpt ?? "",
        read_time: post.read_time ?? "",
        blocks: blocks.map((b) => ({ id: b.id, content: b.content })),
      },
      en: {
        title: str(en.title),
        slug: str(en.slug),
        eyebrow: str(en.eyebrow),
        excerpt: str(en.excerpt),
        read_time: str(en.read_time),
        blocks: blocks.map((b) => ({ id: b.id, content: str(b.translations?.en?.content) })),
      },
    };
  });

  const { data: faq, error: fError } = await supabase
    .from("faq_entries")
    .select("id, question, answer, slug, category, translations")
    .eq("status", "published")
    .order("position");
  if (fError) throw fError;
  const faqRows = faq.map((entry) => {
    const en = entry.translations?.en ?? {};
    return {
      id: entry.id,
      bg: { question: entry.question, answer: entry.answer ?? "", category: entry.category ?? "", slug: entry.slug ?? "" },
      en: { question: str(en.question), answer: str(en.answer), category: str(en.category), slug: str(en.slug) },
    };
  });

  for (const [name, rows] of [["products", productRows], ["blog", blogRows], ["faq", faqRows]]) {
    writeFileSync(filePath(name), JSON.stringify(rows, null, 2) + "\n");
    console.log(`wrote content-i18n/${name}.json (${rows.length} records)`);
  }
}

// ── import ───────────────────────────────────────────────────────────────────

function readFile(name) {
  if (!existsSync(filePath(name))) return [];
  return JSON.parse(readFileSync(filePath(name), "utf-8"));
}

async function update(table, id, values) {
  if (!apply) return;
  const { error } = await supabase.from(table).update(values).eq("id", id);
  if (error) throw new Error(`${table} ${id}: ${error.message}`);
}

/** Merges the non-empty fields of `fields` into translations.en. */
function mergeEn(translations, fields) {
  const filled = Object.fromEntries(Object.entries(fields).filter(([, v]) => typeof v === "string" && v.trim()));
  return { ...(translations ?? {}), en: { ...(translations?.en ?? {}), ...filled } };
}

async function importAll() {
  console.log(`Target: ${target}${apply ? "" : " (dry run — pass --apply to write)"}\n`);

  for (const row of readFile("products")) {
    const { data: current } = await supabase
      .from("products")
      .select("translations, product_highlights(id, sort_order, translations)")
      .eq("id", row.id)
      .maybeSingle();
    if (!current) continue;
    const { highlights = [], ...fields } = row.en;
    const filledCount = Object.values(fields).filter((v) => str(v).trim()).length + highlights.filter((h) => str(h).trim()).length;
    if (!filledCount) continue;
    console.log(`product #${row.id}: ${filledCount} fields`);
    await update("products", row.id, { translations: mergeEn(current.translations, fields) });
    const rows = [...(current.product_highlights ?? [])].sort(bySort);
    for (const [index, highlight] of rows.entries()) {
      const text = str(highlights[index]).trim();
      if (text) await update("product_highlights", highlight.id, { translations: mergeEn(highlight.translations, { text }) });
    }
  }

  const usedBlogSlugs = new Set();
  for (const row of readFile("blog")) {
    const { blocks = [], ...fields } = row.en;
    if (!str(fields.title).trim() && !blocks.some((b) => str(b.content).trim())) continue;
    const { data: current } = await supabase.from("blog_posts").select("translations").eq("id", row.id).maybeSingle();
    if (!current) continue;
    let slug = slugify(str(fields.slug) || str(fields.title));
    while (slug && usedBlogSlugs.has(slug)) slug = `${slug}-2`;
    if (slug) usedBlogSlugs.add(slug);
    console.log(`post "${row.bg.title.slice(0, 60)}": /en/beauty-care/${slug || "(bg slug)"}`);
    await update("blog_posts", row.id, { translations: mergeEn(current.translations, { ...fields, slug }) });
    for (const block of blocks) {
      const content = str(block.content).trim();
      if (!content) continue;
      const { data: currentBlock } = await supabase.from("blog_blocks").select("translations").eq("id", block.id).maybeSingle();
      await update("blog_blocks", block.id, { translations: mergeEn(currentBlock?.translations, { content }) });
    }
  }

  for (const row of readFile("faq")) {
    if (!str(row.en.question).trim()) continue;
    const { data: current } = await supabase.from("faq_entries").select("translations").eq("id", row.id).maybeSingle();
    if (!current) continue;
    const slug = slugify(str(row.en.slug) || str(row.en.question));
    console.log(`faq "${row.en.question.slice(0, 60)}": /en/faq/${slug}`);
    await update("faq_entries", row.id, { translations: mergeEn(current.translations, { ...row.en, slug }) });
  }

  console.log(apply ? "\nDone." : "\nDry run finished.");
}

(command === "export" ? exportAll() : importAll()).catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
