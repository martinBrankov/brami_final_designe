/**
 * Reads blog_posts and blog_blocks from the DEV Supabase database
 * and generates a complete SQL migration file (schema + data) ready
 * to be pasted into the PRODUCTION Supabase SQL Editor.
 *
 * Usage:
 *   node scripts/export-blog-to-production.mjs
 *
 * Output:
 *   scripts/migrate-blog-to-production.sql  (overwritten)
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";
try { loadEnvFile(".env.local"); } catch {}

const DEV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DEV_URL || !DEV_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(DEV_URL, DEV_KEY);

function esc(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  // Escape single quotes for SQL
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  console.log("Fetching blog_posts from dev...");
  const { data: posts, error: postsErr } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: true });

  if (postsErr) throw new Error(`blog_posts: ${postsErr.message}`);
  console.log(`  → ${posts.length} posts`);

  console.log("Fetching blog_blocks from dev...");
  const { data: blocks, error: blocksErr } = await supabase
    .from("blog_blocks")
    .select("*")
    .order("post_id, position", { ascending: true });

  if (blocksErr) throw new Error(`blog_blocks: ${blocksErr.message}`);
  console.log(`  → ${blocks.length} blocks`);

  const lines = [];

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------
  lines.push(`-- =============================================================================`);
  lines.push(`-- Blog migration for production`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Posts: ${posts.length}  |  Blocks: ${blocks.length}`);
  lines.push(`-- Safe to run multiple times (fully idempotent).`);
  lines.push(`-- Does NOT touch: products, user_profiles, customer_orders or any other table.`);
  lines.push(`-- =============================================================================`);
  lines.push(``);

  // -------------------------------------------------------------------------
  // 1. Schema
  // -------------------------------------------------------------------------
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 1. blog_posts table`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`CREATE TABLE IF NOT EXISTS blog_posts (`);
  lines.push(`  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  title         text        NOT NULL,`);
  lines.push(`  slug          text        NOT NULL UNIQUE,`);
  lines.push(`  eyebrow       text,`);
  lines.push(`  excerpt       text,`);
  lines.push(`  cover_image   text,`);
  lines.push(`  read_time     text,`);
  lines.push(`  published_at  date,`);
  lines.push(`  is_featured   boolean     NOT NULL DEFAULT false,`);
  lines.push(`  published     boolean     NOT NULL DEFAULT false,`);
  lines.push(`  show_in_list  boolean     NOT NULL DEFAULT true,`);
  lines.push(`  created_at    timestamptz NOT NULL DEFAULT now()`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`-- Add show_in_list if the table already existed without it`);
  lines.push(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS show_in_list boolean NOT NULL DEFAULT true;`);
  lines.push(``);

  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 2. blog_blocks table`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`CREATE TABLE IF NOT EXISTS blog_blocks (`);
  lines.push(`  id        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  post_id   uuid    NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,`);
  lines.push(`  type      text    NOT NULL DEFAULT 'text',`);
  lines.push(`  content   text,`);
  lines.push(`  position  integer NOT NULL DEFAULT 1`);
  lines.push(`);`);
  lines.push(``);
  lines.push(`CREATE INDEX IF NOT EXISTS blog_blocks_post_id_idx ON blog_blocks(post_id);`);
  lines.push(``);
  lines.push(`-- Update type check constraint to allow both 'text' and 'image'`);
  lines.push(`DO $$`);
  lines.push(`DECLARE r RECORD;`);
  lines.push(`BEGIN`);
  lines.push(`  FOR r IN (`);
  lines.push(`    SELECT conname FROM pg_constraint c`);
  lines.push(`    JOIN pg_class t ON c.conrelid = t.oid`);
  lines.push(`    WHERE t.relname = 'blog_blocks' AND c.contype = 'c'`);
  lines.push(`      AND pg_get_constraintdef(c.oid) ILIKE '%type%'`);
  lines.push(`  ) LOOP`);
  lines.push(`    EXECUTE format('ALTER TABLE blog_blocks DROP CONSTRAINT %I', r.conname);`);
  lines.push(`  END LOOP;`);
  lines.push(`END;`);
  lines.push(`$$;`);
  lines.push(`ALTER TABLE blog_blocks ADD CONSTRAINT blog_blocks_type_check CHECK (type IN ('text', 'image'));`);
  lines.push(``);

  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 3. Row-level security`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`ALTER TABLE blog_posts  ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE blog_blocks ENABLE ROW LEVEL SECURITY;`);
  lines.push(``);
  lines.push(`DO $$ BEGIN`);
  lines.push(`  CREATE POLICY "public read published posts"`);
  lines.push(`    ON blog_posts FOR SELECT USING (published = true);`);
  lines.push(`EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  lines.push(``);
  lines.push(`DO $$ BEGIN`);
  lines.push(`  CREATE POLICY "public read blocks of published posts"`);
  lines.push(`    ON blog_blocks FOR SELECT`);
  lines.push(`    USING (EXISTS (`);
  lines.push(`      SELECT 1 FROM blog_posts p`);
  lines.push(`      WHERE p.id = blog_blocks.post_id AND p.published = true`);
  lines.push(`    ));`);
  lines.push(`EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  lines.push(``);

  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 4. blog-images storage bucket`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)`);
  lines.push(`VALUES (`);
  lines.push(`  'blog-images', 'blog-images', true, 5242880,`);
  lines.push(`  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']`);
  lines.push(`)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);
  lines.push(`DO $$ BEGIN`);
  lines.push(`  CREATE POLICY "blog-images public read"`);
  lines.push(`    ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');`);
  lines.push(`EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  lines.push(``);

  // -------------------------------------------------------------------------
  // 5. Data — blog_posts
  // -------------------------------------------------------------------------
  if (posts.length > 0) {
    lines.push(`-- ---------------------------------------------------------------------------`);
    lines.push(`-- 5. Data — blog_posts (${posts.length} rows)`);
    lines.push(`-- ---------------------------------------------------------------------------`);

    for (const p of posts) {
      lines.push(
        `INSERT INTO blog_posts (id, title, slug, eyebrow, excerpt, cover_image, read_time, published_at, is_featured, published, show_in_list, created_at)` +
        ` VALUES (${esc(p.id)}, ${esc(p.title)}, ${esc(p.slug)}, ${esc(p.eyebrow)}, ${esc(p.excerpt)}, ${esc(p.cover_image)}, ${esc(p.read_time)}, ${esc(p.published_at)}, ${esc(p.is_featured)}, ${esc(p.published)}, ${esc(p.show_in_list ?? true)}, ${esc(p.created_at)})` +
        ` ON CONFLICT (id) DO UPDATE SET title=${esc(p.title)}, slug=${esc(p.slug)}, eyebrow=${esc(p.eyebrow)}, excerpt=${esc(p.excerpt)}, cover_image=${esc(p.cover_image)}, read_time=${esc(p.read_time)}, published_at=${esc(p.published_at)}, is_featured=${esc(p.is_featured)}, published=${esc(p.published)}, show_in_list=${esc(p.show_in_list ?? true)};`
      );
    }
    lines.push(``);
  }

  // -------------------------------------------------------------------------
  // 6. Data — blog_blocks
  // -------------------------------------------------------------------------
  if (blocks.length > 0) {
    lines.push(`-- ---------------------------------------------------------------------------`);
    lines.push(`-- 6. Data — blog_blocks (${blocks.length} rows)`);
    lines.push(`-- ---------------------------------------------------------------------------`);

    for (const b of blocks) {
      lines.push(
        `INSERT INTO blog_blocks (id, post_id, type, content, position)` +
        ` VALUES (${esc(b.id)}, ${esc(b.post_id)}, ${esc(b.type)}, ${esc(b.content)}, ${esc(b.position)})` +
        ` ON CONFLICT (id) DO UPDATE SET type=${esc(b.type)}, content=${esc(b.content)}, position=${esc(b.position)};`
      );
    }
    lines.push(``);
  }

  lines.push(`-- Done.`);

  const output = lines.join("\n");
  const outPath = new URL("./migrate-blog-to-production.sql", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  writeFileSync(outPath, output, "utf8");
  console.log(`\nWritten to: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
