/**
 * Upload local blog cover images to Supabase Storage and update blog_posts.cover_image.
 *
 * Usage:
 *   node scripts/upload-blog-images.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnv() {
  const path = resolve(__dirname, "../.env.local");
  const text = readFileSync(path, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = readEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const BUCKET = "blog-images";

const IMAGES = [
  {
    slug: "shafranat-v-kozmetikata",
    localPath: resolve(__dirname, "../src/assets/images/about/saffron.jpg"),
    storageName: "cover-shafranat-v-kozmetikata.jpg",
    contentType: "image/jpeg",
  },
  {
    slug: "shafranat-sila-ot-prirodata",
    localPath: resolve(__dirname, "../src/assets/images/about/garden.jpg"),
    storageName: "cover-shafranat-sila-ot-prirodata.jpg",
    contentType: "image/jpeg",
  },
  {
    slug: "krasota-i-balans-sas-shafran",
    localPath: resolve(__dirname, "../src/assets/images/about/addelaSunny.jpg"),
    storageName: "cover-krasota-i-balans-sas-shafran.jpg",
    contentType: "image/jpeg",
  },
];

async function run() {
  // Ensure bucket exists
  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  });

  for (const img of IMAGES) {
    console.log(`\nProcessing: ${img.slug}`);

    // 1. Read local file
    let buffer;
    try {
      buffer = readFileSync(img.localPath);
    } catch {
      console.error(`  ✗ Cannot read file: ${img.localPath}`);
      continue;
    }

    // 2. Upload to Supabase Storage (upsert — safe to re-run)
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(img.storageName, buffer, {
        contentType: img.contentType,
        upsert: true,
      });

    if (uploadErr) {
      console.error(`  ✗ Upload failed: ${uploadErr.message}`);
      continue;
    }

    // 3. Get public URL
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(img.storageName);
    const publicUrl = data.publicUrl;
    console.log(`  ✓ Uploaded → ${publicUrl}`);

    // 4. Find post by slug
    const { data: post, error: fetchErr } = await supabase
      .from("blog_posts")
      .select("id, cover_image")
      .eq("slug", img.slug)
      .maybeSingle();

    if (fetchErr) {
      console.error(`  ✗ Could not fetch post: ${fetchErr.message}`);
      continue;
    }
    if (!post) {
      console.warn(`  ⚠ No post found for slug "${img.slug}" — skipping DB update`);
      continue;
    }

    if (post.cover_image === publicUrl) {
      console.log(`  — cover_image already set, skipping update`);
      continue;
    }

    // 5. Update cover_image
    const { error: updateErr } = await supabase
      .from("blog_posts")
      .update({ cover_image: publicUrl })
      .eq("id", post.id);

    if (updateErr) {
      console.error(`  ✗ DB update failed: ${updateErr.message}`);
      continue;
    }

    console.log(`  ✓ cover_image updated in DB`);
  }

  console.log("\nDone.");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
