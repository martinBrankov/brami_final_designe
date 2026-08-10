import "server-only";

import { generateAndSaveBlogDraft } from "@/lib/blog-generate";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Writer agent — wraps the existing blog generator (OpenAI) to produce a full
// article draft saved to blog_posts (published: false). The article workflow then
// enriches it with metadata + QA and wraps it in an artifact for approval.

export type WrittenArticle = {
  postId: string;
  slug: string;
  title: string;
  excerpt: string | null;
};

export async function generateArticle(instruction: string): Promise<WrittenArticle> {
  const result = await generateAndSaveBlogDraft({ topic: instruction });
  return {
    postId: result.id,
    slug: result.slug,
    title: result.title,
    excerpt: result.excerpt,
  };
}

/** The saved article's text (blog_blocks joined) — for metadata + QA. */
export async function getArticleBody(postId: string): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("blog_blocks")
    .select("content, position")
    .eq("post_id", postId)
    .order("position", { ascending: true });
  return (data ?? []).map((b: { content: string }) => b.content).join("\n");
}
