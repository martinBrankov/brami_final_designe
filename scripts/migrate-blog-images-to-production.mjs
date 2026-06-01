/**
 * Copies all files from the DEV blog-images bucket to the PRODUCTION bucket,
 * then regenerates migrate-blog-to-production.sql with production URLs.
 *
 * Usage:
 *   node scripts/migrate-blog-images-to-production.mjs
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";
try { loadEnvFile(".env.local"); } catch {}

// ── Dev ─────────────────────────────────────────────────────────────────────
const DEV_URL  = process.env.DEV_SUPABASE_URL;
const DEV_KEY  = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

// ── Production ───────────────────────────────────────────────────────────────
const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DEV_URL || !DEV_KEY || !PROD_URL || !PROD_KEY) {
  console.error("Missing env vars. Add DEV_SUPABASE_URL, DEV_SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const BUCKET = "blog-images";

const dev  = createClient(DEV_URL,  DEV_KEY);
const prod = createClient(PROD_URL, PROD_KEY);

function esc(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function listAllFiles(client, bucket, folder = "") {
  const { data, error } = await client.storage.from(bucket).list(folder, { limit: 1000 });
  if (error) throw new Error(`list(${folder}): ${error.message}`);

  const files = [];
  for (const item of data ?? []) {
    if (item.metadata) {
      // It's a file
      files.push(folder ? `${folder}/${item.name}` : item.name);
    } else {
      // It's a folder — recurse
      const sub = await listAllFiles(client, bucket, folder ? `${folder}/${item.name}` : item.name);
      files.push(...sub);
    }
  }
  return files;
}

async function main() {
  // ── Ensure prod bucket exists ───────────────────────────────────────────
  await prod.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg","image/png","image/webp","image/gif","image/avif"],
  });

  // ── List dev files ──────────────────────────────────────────────────────
  console.log("Listing dev blog-images...");
  const files = await listAllFiles(dev, BUCKET);
  console.log(`  → ${files.length} files`);

  // ── Copy each file ──────────────────────────────────────────────────────
  let copied = 0, skipped = 0, failed = 0;

  for (const path of files) {
    process.stdout.write(`  [${copied + skipped + failed + 1}/${files.length}] ${path} ... `);

    // Download from dev
    const { data: blob, error: dlErr } = await dev.storage.from(BUCKET).download(path);
    if (dlErr) {
      console.log(`DOWNLOAD ERROR: ${dlErr.message}`);
      failed++;
      continue;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const contentType = blob.type || "image/jpeg";

    // Upload to prod (skip if already exists)
    const { error: upErr } = await prod.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: false,
    });

    if (upErr) {
      if (upErr.message?.includes("already exists") || upErr.statusCode === "409") {
        console.log("already exists, skipped");
        skipped++;
      } else {
        console.log(`UPLOAD ERROR: ${upErr.message}`);
        failed++;
      }
      continue;
    }

    console.log("OK");
    copied++;
  }

  console.log(`\nDone: ${copied} copied, ${skipped} skipped, ${failed} failed`);

  // ── Fetch blog data ─────────────────────────────────────────────────────
  console.log("\nFetching blog data from dev...");
  const { data: posts } = await dev.from("blog_posts").select("*").order("created_at", { ascending: true });
  const { data: blocks } = await dev.from("blog_blocks").select("*").order("post_id, position", { ascending: true });
  console.log(`  → ${posts.length} posts, ${blocks.length} blocks`);

  // ── Rewrite URLs: dev → prod ────────────────────────────────────────────
  const devBase  = `${DEV_URL}/storage/v1/object/public/${BUCKET}`;
  const prodBase = `${PROD_URL}/storage/v1/object/public/${BUCKET}`;

  function rewrite(val) {
    if (typeof val === "string") return val.replace(new RegExp(devBase.replace(/\./g, "\\."), "g"), prodBase);
    return val;
  }

  const patchedPosts  = posts.map(p  => ({ ...p,  cover_image: rewrite(p.cover_image) }));
  const patchedBlocks = blocks.map(b => ({ ...b,  content:     rewrite(b.content) }));

  // ── Generate SQL ────────────────────────────────────────────────────────
  const lines = [];

  lines.push(`-- =============================================================================`);
  lines.push(`-- Blog migration for production (schema + data + production image URLs)`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Posts: ${patchedPosts.length}  |  Blocks: ${patchedBlocks.length}  |  Images: ${files.length}`);
  lines.push(`-- Safe to run multiple times (fully idempotent).`);
  lines.push(`-- Does NOT touch: products, user_profiles, customer_orders or any other table.`);
  lines.push(`-- =============================================================================`);
  lines.push(``);

  // Schema
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
  lines.push(`CREATE INDEX IF NOT EXISTS blog_blocks_post_id_idx ON blog_blocks(post_id);`);
  lines.push(`DO $$ DECLARE r RECORD; BEGIN FOR r IN (`);
  lines.push(`  SELECT conname FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid`);
  lines.push(`  WHERE t.relname = 'blog_blocks' AND c.contype = 'c' AND pg_get_constraintdef(c.oid) ILIKE '%type%'`);
  lines.push(`) LOOP EXECUTE format('ALTER TABLE blog_blocks DROP CONSTRAINT %I', r.conname); END LOOP; END; $$;`);
  lines.push(`ALTER TABLE blog_blocks ADD CONSTRAINT blog_blocks_type_check CHECK (type IN ('text', 'image'));`);
  lines.push(``);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 3. Row-level security`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`ALTER TABLE blog_posts  ENABLE ROW LEVEL SECURITY;`);
  lines.push(`ALTER TABLE blog_blocks ENABLE ROW LEVEL SECURITY;`);
  lines.push(`DO $$ BEGIN CREATE POLICY "public read published posts" ON blog_posts FOR SELECT USING (published = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  lines.push(`DO $$ BEGIN CREATE POLICY "public read blocks of published posts" ON blog_blocks FOR SELECT USING (EXISTS (SELECT 1 FROM blog_posts p WHERE p.id = blog_blocks.post_id AND p.published = true)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  lines.push(``);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 4. blog-images storage bucket`);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('blog-images', 'blog-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`DO $$ BEGIN CREATE POLICY "blog-images public read" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  lines.push(``);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 5. Data — blog_posts (${patchedPosts.length} rows, production URLs)`);
  lines.push(`-- ---------------------------------------------------------------------------`);

  for (const p of patchedPosts) {
    lines.push(
      `INSERT INTO blog_posts (id, title, slug, eyebrow, excerpt, cover_image, read_time, published_at, is_featured, published, show_in_list, created_at)` +
      ` VALUES (${esc(p.id)}, ${esc(p.title)}, ${esc(p.slug)}, ${esc(p.eyebrow)}, ${esc(p.excerpt)}, ${esc(p.cover_image)}, ${esc(p.read_time)}, ${esc(p.published_at)}, ${esc(p.is_featured)}, ${esc(p.published)}, ${esc(p.show_in_list ?? true)}, ${esc(p.created_at)})` +
      ` ON CONFLICT (id) DO UPDATE SET title=${esc(p.title)}, slug=${esc(p.slug)}, eyebrow=${esc(p.eyebrow)}, excerpt=${esc(p.excerpt)}, cover_image=${esc(p.cover_image)}, read_time=${esc(p.read_time)}, published_at=${esc(p.published_at)}, is_featured=${esc(p.is_featured)}, published=${esc(p.published)}, show_in_list=${esc(p.show_in_list ?? true)};`
    );
  }

  lines.push(``);
  lines.push(`-- ---------------------------------------------------------------------------`);
  lines.push(`-- 6. Data — blog_blocks (${patchedBlocks.length} rows, production URLs)`);
  lines.push(`-- ---------------------------------------------------------------------------`);

  for (const b of patchedBlocks) {
    lines.push(
      `INSERT INTO blog_blocks (id, post_id, type, content, position)` +
      ` VALUES (${esc(b.id)}, ${esc(b.post_id)}, ${esc(b.type)}, ${esc(b.content)}, ${esc(b.position)})` +
      ` ON CONFLICT (id) DO UPDATE SET type=${esc(b.type)}, content=${esc(b.content)}, position=${esc(b.position)};`
    );
  }

  lines.push(``);
  lines.push(`-- Done.`);

  const outPath = new URL("./migrate-blog-to-production.sql", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`\nSQL written to: ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
