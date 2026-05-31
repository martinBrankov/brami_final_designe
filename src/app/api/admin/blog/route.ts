import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminSession();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, eyebrow, published, is_featured, show_in_list, published_at, read_time, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: Request) {
  await requireAdminSession();

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { title, slug, eyebrow, excerpt, coverImage, readTime, publishedAt, isFeatured, published, showInList, blocks } = body as {
    title?: string;
    slug?: string;
    eyebrow?: string;
    excerpt?: string;
    coverImage?: string;
    readTime?: string;
    publishedAt?: string;
    isFeatured?: boolean;
    published?: boolean;
    showInList?: boolean;
    blocks?: Array<{ type?: string; content: string }>;
  };

  if (!title || !slug) {
    return NextResponse.json({ error: "title and slug are required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (isFeatured) {
    await supabase.from("blog_posts").update({ is_featured: false }).eq("is_featured", true);
  }

  const { data: post, error: insertErr } = await supabase
    .from("blog_posts")
    .insert({
      title,
      slug,
      eyebrow: eyebrow || null,
      excerpt: excerpt || null,
      cover_image: coverImage || null,
      read_time: readTime || null,
      published_at: publishedAt || null,
      is_featured: Boolean(isFeatured),
      published: Boolean(published),
      show_in_list: showInList !== undefined ? Boolean(showInList) : true,
    })
    .select("id")
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  if (Array.isArray(blocks) && blocks.length > 0) {
    const rows = blocks.map((b, i) => ({
      post_id: post.id,
      type: b.type ?? "text",
      content: b.content,
      position: i + 1,
    }));
    const { error: blocksErr } = await supabase.from("blog_blocks").insert(rows);
    if (blocksErr) return NextResponse.json({ error: blocksErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: post.id });
}
