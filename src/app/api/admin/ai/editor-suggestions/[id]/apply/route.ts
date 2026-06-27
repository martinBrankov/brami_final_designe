import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { type GeneratedBlock } from "@/lib/blog-generate";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type SuggestionRow = {
  id: string;
  post_id: string;
  suggested_blocks: GeneratedBlock[];
  excerpt: string | null;
  status: string;
};

// Apply an editor suggestion: replace the post's blocks with the suggested ones.
// The post itself stays a draft until the admin publishes it from the blog panel.
export async function POST(_request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: suggestion, error } = await supabase
    .from("ai_editor_suggestions")
    .select("id, post_id, suggested_blocks, excerpt, status")
    .eq("id", id)
    .maybeSingle<SuggestionRow>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!suggestion) return NextResponse.json({ error: "Предложението не е намерено." }, { status: 404 });
  if (suggestion.status === "applied") {
    return NextResponse.json({ error: "Вече е приложено." }, { status: 400 });
  }

  const blocks = Array.isArray(suggestion.suggested_blocks) ? suggestion.suggested_blocks : [];
  if (blocks.length === 0) {
    return NextResponse.json({ error: "Празно предложение." }, { status: 400 });
  }

  // blog_blocks.type allows only 'text'/'image'; headings encode as <h2>…</h2>
  // (same convention as src/lib/blog-generate.ts).
  const rows = blocks.map((block, i) => ({
    post_id: suggestion.post_id,
    type: "text",
    content: block.type === "heading" ? `<h2>${block.text}</h2>` : block.html,
    position: i + 1,
  }));

  const { data: existing } = await supabase
    .from("blog_blocks")
    .select("id")
    .eq("post_id", suggestion.post_id);
  const existingIds = (existing ?? []).map((b: { id: string }) => b.id);

  const { error: insertErr } = await supabase.from("blog_blocks").insert(rows);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  if (existingIds.length > 0) {
    await supabase.from("blog_blocks").delete().in("id", existingIds);
  }

  if (suggestion.excerpt) {
    await supabase
      .from("blog_posts")
      .update({ excerpt: suggestion.excerpt })
      .eq("id", suggestion.post_id);
  }

  await supabase
    .from("ai_editor_suggestions")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
