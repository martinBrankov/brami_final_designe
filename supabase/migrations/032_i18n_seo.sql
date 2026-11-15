-- i18n + SEO/GEO fields.
--
-- Bulgarian (the default locale) stays in the existing columns. Every other
-- locale lives in a `translations` JSONB keyed by locale code, e.g.
--   products.translations = { "en": { "name": "...", "slug": "...", ... } }
-- Missing keys fall back to the Bulgarian value at read time.
--
-- All statements are idempotent, so the file is safe to re-run.

-- ── Products ────────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug             TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_slugs        TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title        TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS focus_keyword    TEXT;
-- 2–3 sentence "answer first" summary shown under the H1 (cited by AI search).
ALTER TABLE products ADD COLUMN IF NOT EXISTS summary          TEXT;
-- [{ "question": "...", "answer": "..." }]
ALTER TABLE products ADD COLUMN IF NOT EXISTS faq              JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin             TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS translations     JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON products (slug) WHERE slug IS NOT NULL;

ALTER TABLE product_highlights ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}';

ALTER TABLE product_images ADD COLUMN IF NOT EXISTS alt          TEXT;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}';

-- ── Blog ────────────────────────────────────────────────────────────────────
-- blog_posts.translations  = { "en": { "title", "slug", "eyebrow", "excerpt", "read_time" } }
-- blog_blocks.translations = { "en": { "content" } }
ALTER TABLE blog_posts  ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}';
ALTER TABLE blog_posts  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE blog_blocks ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}';

-- ── FAQ ─────────────────────────────────────────────────────────────────────
-- faq_entries.translations = { "en": { "question", "answer", "slug", "category" } }
ALTER TABLE faq_entries ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}';
