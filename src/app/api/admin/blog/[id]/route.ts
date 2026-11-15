import { localizeApiError } from "@/lib/api-i18n";
import { NextResponse } from "next/server";
import { getBlogPostUrls, notifyIndexNow } from "@/lib/indexnow";
import { asTranslations, assertUniqueEnglishSlug, toEnglishSlug, withEnglish } from "@/lib/admin-translations";

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

  if (error) return NextResponse.json({ error: await localizeApiError(error.message) }, { status: 500 });
  if (!data) return NextResponse.json({ error: await localizeApiError("Not found") }, { status: 404 });

  return NextResponse.json({ post: data });
}

export async function PUT(request: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const urlsBefore = await getBlogPostUrls(id);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: await localizeApiError("Invalid body") }, { status: 400 });

  const { title, slug, eyebrow, excerpt, coverImage, readTime, publishedAt, isFeatured, published, showInList, blocks, english, blockEnglish } = body as {
    /** English version of the post (translations.en); omitted = unchanged. */
    english?: { title?: string; slug?: string; eyebrow?: string; excerpt?: string; readTime?: string };
    /** English HTML per existing block id; "" = no translation. */
    blockEnglish?: Record<string, string>;
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
    blocks?: Array<{ id?: string; type?: string; content: string }>;
  };

  const supabase = createSupabaseAdminClient();

  if (blocks !== undefined && (!Array.isArray(blocks) || blocks.some((block) =>
    !block || typeof block.content !== "string" ||
    (block.type !== undefined && !["text", "image"].includes(block.type))
  ))) {
    return NextResponse.json({ error: await localizeApiError("Invalid body") }, { status: 400 });
  }
  let postTranslations: ReturnType<typeof withEnglish> | undefined;
  if (english) {
    const { data: currentPost } = await supabase.from("blog_posts").select("translations").eq("id", id).maybeSingle();
    const enSlug = toEnglishSlug(english.slug?.trim() || english.title?.trim() || "");
    try {
      await assertUniqueEnglishSlug("blog_posts", enSlug, id);
    } catch (error) {
      return NextResponse.json({ error: await localizeApiError(error instanceof Error ? error.message : "Invalid body") }, { status: 400 });
    }
    postTranslations = withEnglish(currentPost?.translations, {
      title: english.title?.trim(),
      slug: enSlug,
      eyebrow: english.eyebrow?.trim(),
      excerpt: english.excerpt?.trim(),
      read_time: english.readTime?.trim(),
    });
  }

  const { data: existingBlocks, error: blocksError } = await supabase
    .from("blog_blocks").select("id, translations").eq("post_id", id);
  if (blocksError) return NextResponse.json({ error: await localizeApiError(blocksError.message) }, { status: 500 });
  const existingById = new Map((existingBlocks ?? []).map((block) => [block.id, block]));
  const suppliedIds = (blocks ?? []).flatMap((block) => block.id ? [block.id] : []);
  if (new Set(suppliedIds).size !== suppliedIds.length || suppliedIds.some((blockId) => !existingById.has(blockId))) {
    return NextResponse.json({ error: await localizeApiError("Invalid body") }, { status: 400 });
  }

  if (isFeatured) {
    await supabase.from("blog_posts").update({ is_featured: false }).neq("id", id);
  }

  const { error: updateErr } = await supabase
    .from("blog_posts")
    .update({
      title,
      slug,
      updated_at: new Date().toISOString(),
      ...(postTranslations ? { translations: postTranslations } : {}),
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
    return NextResponse.json({ error: await localizeApiError(updateErr.message) }, { status: 500 });
  }

  if (Array.isArray(blocks)) {
    const rows = blocks.map((block, i) => ({
      id: block.id ?? crypto.randomUUID(),
      post_id: id,
      type: block.type ?? "text",
      content: block.content,
      position: i + 1,
      translations: !block.id
        ? {}
        : blockEnglish && block.id in blockEnglish
          ? withEnglish(existingById.get(block.id)!.translations, { content: blockEnglish[block.id]?.trim() })
          : asTranslations(existingById.get(block.id)!.translations),
    }));
    if (rows.length) {
      const { error } = await supabase.from("blog_blocks").upsert(rows);
      if (error) return NextResponse.json({ error: await localizeApiError(error.message) }, { status: 500 });
    }
    const retainedIds = new Set(rows.map((block) => block.id));
    const removedIds = [...existingById.keys()].filter((blockId) => !retainedIds.has(blockId));
    if (removedIds.length) {
      const { error } = await supabase.from("blog_blocks").delete().eq("post_id", id).in("id", removedIds);
      if (error) return NextResponse.json({ error: await localizeApiError(error.message) }, { status: 500 });
    }
  }

  notifyIndexNow(async () => [...urlsBefore, ...(await getBlogPostUrls(id))]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const urlsBefore = await getBlogPostUrls(id);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: await localizeApiError("Invalid body") }, { status: 400 });

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
    if (error) return NextResponse.json({ error: await localizeApiError(error.message) }, { status: 500 });
  }

  if ("published" in body) {
    const { error } = await supabase
      .from("blog_posts")
      .update({ published: Boolean(body.published) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: await localizeApiError(error.message) }, { status: 500 });
  }

  if ("showInList" in body) {
    const { error } = await supabase
      .from("blog_posts")
      .update({ show_in_list: Boolean(body.showInList) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: await localizeApiError(error.message) }, { status: 500 });
  }

  notifyIndexNow(async () => [...urlsBefore, ...(await getBlogPostUrls(id))]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const urlsBefore = await getBlogPostUrls(id);
  const supabase = createSupabaseAdminClient();

  await supabase.from("blog_blocks").delete().eq("post_id", id);

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: await localizeApiError(error.message) }, { status: 500 });

  notifyIndexNow(() => urlsBefore);
  return NextResponse.json({ ok: true });
}
