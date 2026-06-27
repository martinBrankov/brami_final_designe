import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type AdminSocialPost = {
  id: string;
  platform: "facebook" | "instagram";
  caption: string;
  hashtags: string[];
  imagePrompt: string | null;
  imageUrl: string | null;
  callToAction: string | null;
  targetType: string;
  targetRef: string | null;
  status: string;
  externalPostId: string | null;
  publishError: string | null;
  createdAt: string;
};

export type AdminStrategy = {
  id: string;
  title: string;
  content: unknown;
  status: string;
  createdAt: string;
};

export type AdminSuggestion = {
  id: string;
  postId: string;
  postTitle: string;
  excerpt: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

export type AdminCampaign = {
  id: string;
  goal: string;
  rationale: string | null;
  status: string;
  source: string;
  createdAt: string;
};

export async function getSocialPosts(): Promise<AdminSocialPost[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("social_posts")
    .select(
      "id, platform, caption, hashtags, image_prompt, image_url, call_to_action, target_type, target_ref, status, external_post_id, publish_error, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((r) => ({
    id: r.id,
    platform: r.platform,
    caption: r.caption,
    hashtags: r.hashtags ?? [],
    imagePrompt: r.image_prompt,
    imageUrl: r.image_url,
    callToAction: r.call_to_action,
    targetType: r.target_type,
    targetRef: r.target_ref,
    status: r.status,
    externalPostId: r.external_post_id,
    publishError: r.publish_error,
    createdAt: r.created_at,
  }));
}

export async function getMarketingStrategies(): Promise<AdminStrategy[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("marketing_strategies")
    .select("id, title, content, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function getEditorSuggestions(): Promise<AdminSuggestion[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("ai_editor_suggestions")
    .select("id, post_id, excerpt, notes, status, created_at, blog_posts(title)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => {
    const joined = r.blog_posts as { title?: string } | { title?: string }[] | null;
    const postTitle = Array.isArray(joined) ? joined[0]?.title : joined?.title;
    return {
      id: r.id,
      postId: r.post_id,
      postTitle: postTitle ?? "(статия)",
      excerpt: r.excerpt,
      notes: r.notes,
      status: r.status,
      createdAt: r.created_at,
    };
  });
}

export async function getCampaigns(): Promise<AdminCampaign[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("ai_campaigns")
    .select("id, goal, rationale, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  return (data ?? []).map((r) => ({
    id: r.id,
    goal: r.goal,
    rationale: r.rationale,
    status: r.status,
    source: r.source,
    createdAt: r.created_at,
  }));
}
