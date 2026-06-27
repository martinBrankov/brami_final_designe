import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { buildCaption, publishFacebookPost, publishInstagramPost } from "@/lib/social/meta";
import { SITE_URL } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type SocialPostRow = {
  id: string;
  platform: "facebook" | "instagram";
  caption: string;
  hashtags: string[] | null;
  image_url: string | null;
  status: string;
};

// Edit fields and/or change status (approve / reject / back to draft).
export async function PATCH(request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.caption === "string") updates.caption = body.caption;
  if (Array.isArray(body.hashtags)) updates.hashtags = body.hashtags.map(String);
  if (typeof body.imageUrl === "string") updates.image_url = body.imageUrl.trim() || null;
  if (typeof body.status === "string" && ["draft", "approved", "failed"].includes(body.status)) {
    updates.status = body.status;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("social_posts").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Publish to Facebook / Instagram via the Meta Graph API.
export async function POST(_request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: post, error } = await supabase
    .from("social_posts")
    .select("id, platform, caption, hashtags, image_url, status")
    .eq("id", id)
    .maybeSingle<SocialPostRow>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "Постът не е намерен." }, { status: 404 });
  if (post.status === "published") {
    return NextResponse.json({ error: "Постът вече е публикуван." }, { status: 400 });
  }

  const caption = buildCaption(post.caption, post.hashtags ?? []);

  try {
    const result =
      post.platform === "instagram"
        ? await publishInstagramPost({ caption, imageUrl: post.image_url })
        : await publishFacebookPost({ message: caption, link: SITE_URL, imageUrl: post.image_url });

    await supabase
      .from("social_posts")
      .update({
        status: "published",
        external_post_id: result.externalPostId,
        publish_error: null,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, externalPostId: result.externalPostId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешно публикуване.";
    await supabase
      .from("social_posts")
      .update({ status: "failed", publish_error: message, updated_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("social_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
