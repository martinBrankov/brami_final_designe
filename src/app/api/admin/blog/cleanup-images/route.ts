import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "blog-images";

export async function POST() {
  await requireAdminSession();

  const supabase = createSupabaseAdminClient();

  // 1. List all files in the bucket
  const { data: storageFiles, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const allFiles = (storageFiles ?? []).map((f) => f.name).filter(Boolean);
  if (allFiles.length === 0) return NextResponse.json({ deleted: 0 });

  // 2. Collect all referenced filenames
  const referenced = new Set<string>();

  const extractFilename = (url: string | null) => {
    if (!url) return;
    const parts = url.split("/");
    const name = parts[parts.length - 1];
    if (name) referenced.add(name);
  };

  // Cover images
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("cover_image");

  for (const p of posts ?? []) extractFilename(p.cover_image);

  // Image blocks
  const { data: blocks } = await supabase
    .from("blog_blocks")
    .select("content")
    .eq("type", "image");

  for (const b of blocks ?? []) {
    try {
      const parsed = JSON.parse(b.content ?? "{}") as { url?: string };
      extractFilename(parsed.url ?? null);
    } catch { /* skip malformed */ }
  }

  // 3. Delete unreferenced files
  const toDelete = allFiles.filter((name) => !referenced.has(name));

  if (toDelete.length === 0) return NextResponse.json({ deleted: 0 });

  const { error: delErr } = await supabase.storage.from(BUCKET).remove(toDelete);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ deleted: toDelete.length });
}
