import "server-only";

import { runStructured } from "@/lib/ai/client";
import { BRAND_CONTEXT } from "@/lib/ai/brand";
import { type GeneratedBlock } from "@/lib/blog-generate";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const SYSTEM_PROMPT = `${BRAND_CONTEXT}

Ти си редактор на блога на Brami. Получаваш съществуваща статия и я подобряваш: по-ясна структура, по-добра четимост, по-силен увод, граматика и стил — без да измисляш факти.

Връщай подобрената статия като блокове:
- Първият блок е paragraph (увод без heading).
- Редувай heading и paragraph; 5-8 секции общо.
- В paragraph.html ползвай само: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>. Без <h1>/<h2>/<h3> вътре.
- heading.text е само чист текст без <h2>.
- excerpt: кратък анонс (под 200 символа).
- notes: 1-3 изречения какво си подобрил (на български).`;

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["blocks", "excerpt", "notes"],
  properties: {
    excerpt: { type: "string" },
    notes: { type: "string" },
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "text", "html"],
        properties: {
          type: { type: "string", enum: ["heading", "paragraph"] },
          // Both fields are always present (structured outputs require it);
          // the unused one is an empty string.
          text: { type: "string" },
          html: { type: "string" },
        },
      },
    },
  },
};

type RawEditorBlock = { type: "heading" | "paragraph"; text: string; html: string };
type EditorResult = { blocks: RawEditorBlock[]; excerpt: string; notes: string };

function toGeneratedBlocks(raw: RawEditorBlock[]): GeneratedBlock[] {
  return raw
    .map((b): GeneratedBlock | null => {
      if (b.type === "heading" && b.text.trim()) {
        return { type: "heading", text: b.text.trim() };
      }
      if (b.type === "paragraph" && b.html.trim()) {
        return { type: "paragraph", html: b.html };
      }
      return null;
    })
    .filter((b): b is GeneratedBlock => b !== null);
}

export type SavedSuggestion = {
  id: string;
  postId: string;
  postTitle: string;
  excerpt: string;
  notes: string;
};

/** Picks the post to edit: explicit id, else the most recently created one. */
async function resolvePost(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  postId: string | null,
) {
  const query = supabase
    .from("blog_posts")
    .select("id, title, blog_blocks(content, type, position)")
    .order("created_at", { ascending: false })
    .limit(1);

  const { data, error } = postId
    ? await query.eq("id", postId).maybeSingle()
    : await query.maybeSingle();

  if (error) throw new Error(`Неуспешно зареждане на статия: ${error.message}`);
  return data as
    | { id: string; title: string; blog_blocks: { content: string; type: string; position: number }[] }
    | null;
}

export async function generateEditorSuggestion(
  postId: string | null,
  instruction: string,
  campaignId: string | null = null,
): Promise<SavedSuggestion> {
  const supabase = createSupabaseAdminClient();
  const post = await resolvePost(supabase, postId);
  if (!post) {
    throw new Error("Няма блог статия за редактиране.");
  }

  const existing = [...(post.blog_blocks ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((b) => b.content)
    .join("\n");

  const user = `Заглавие: ${post.title}

Текущо съдържание (HTML блокове):
${existing || "(няма съдържание)"}

Насока за редакцията: ${instruction}

Върни подобрената версия според схемата.`;

  const result = await runStructured<EditorResult>({
    system: SYSTEM_PROMPT,
    user,
    schema: SCHEMA,
    effort: "high",
  });

  const blocks = toGeneratedBlocks(Array.isArray(result.blocks) ? result.blocks : []);
  if (blocks.length === 0) {
    throw new Error("Редакторът не върна валидно съдържание.");
  }

  const { data, error } = await supabase
    .from("ai_editor_suggestions")
    .insert({
      post_id: post.id,
      suggested_blocks: blocks,
      excerpt: result.excerpt || null,
      notes: result.notes || null,
      status: "pending",
      campaign_id: campaignId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Неуспешен запис на предложение: ${error?.message ?? "unknown"}`);
  }

  return {
    id: data.id,
    postId: post.id,
    postTitle: post.title,
    excerpt: result.excerpt ?? "",
    notes: result.notes ?? "",
  };
}
