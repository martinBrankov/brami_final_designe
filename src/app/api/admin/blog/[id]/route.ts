import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, blog_blocks(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ post: data });
}

export async function PUT(request: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
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

  const supabase = createSupabaseAdminClient();

  if (isFeatured) {
    await supabase.from("blog_posts").update({ is_featured: false }).neq("id", id);
  }

  const { error: updateErr } = await supabase
    .from("blog_posts")
    .update({
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
    .eq("id", id);

  if (updateErr) {
    console.error("[blog PUT] post update error:", updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const { data: existingBlocks } = await supabase
    .from("blog_blocks").select("id").eq("post_id", id);
  const existingIds = (existingBlocks ?? []).map((b: { id: string }) => b.id);

  if (Array.isArray(blocks) && blocks.length > 0) {
    const rows = blocks.map((b, i) => ({
      post_id: id,
      type: b.type ?? "text",
      content: b.content,
      position: i + 1,
    }));
    const { error: insertErr } = await supabase.from("blog_blocks").insert(rows);
    if (insertErr) {
      console.error("[blog PUT] blocks insert error:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  if (existingIds.length > 0) {
    await supabase.from("blog_blocks").delete().in("id", existingIds);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  if ("isFeatured" in body) {
    const val = Boolean(body.isFeatured);
    if (val) {
      const { data: thisPost } = await supabase
        .from("blog_posts").select("published").eq("id", id).single();
      if (thisPost?.published) {
        await supabase.from("blog_posts").update({ is_featured: false }).neq("id", id);
      }
    }
    const { error } = await supabase.from("blog_posts").update({ is_featured: val }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ("published" in body) {
    const { error } = await supabase
      .from("blog_posts")
      .update({ published: Boolean(body.published) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ("showInList" in body) {
    const { error } = await supabase
      .from("blog_posts")
      .update({ show_in_list: Boolean(body.showInList) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  await supabase.from("blog_blocks").delete().eq("post_id", id);

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
