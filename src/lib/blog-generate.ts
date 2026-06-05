import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// ── Slug helper (mirrors admin-blog-editor.tsx) ───────────────────────────────

const BG_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "sht", ъ: "a", ь: "", ю: "yu", я: "ya",
};

export function slugify(str: string) {
  return str
    .toLowerCase()
    .split("")
    .map((c) => BG_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeneratedBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; html: string };

export type GeneratedArticle = {
  title: string;
  slug?: string;
  eyebrow?: string;
  excerpt?: string;
  readTime?: string;
  blocks: GeneratedBlock[];
};

export type GenerateOptions = {
  /** Topic provided by admin (manual). When omitted, AI picks based on plan + history. */
  topic?: string | null;
  /** Whether this is an automatic run — adds "AI чернова (авто)" eyebrow fallback. */
  auto?: boolean;
};

export type RecentArticleSummary = {
  title: string;
  eyebrow: string | null;
  createdAt: string;
  published: boolean;
};

export type GenerateResult = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  model: string;
  pickedTopic: string;
  /** Snapshot of the recent articles passed to the model — useful for emails/audit. */
  recentArticles: RecentArticleSummary[];
};

// ── System prompt — saffron natural cosmetics content strategy ────────────────

const SYSTEM_PROMPT = `Ти си редактор на български блог за марката Brami — натурална козметика на базата на шафран и други натурални съставки. Аудиторията са жени и мъже, които се грижат за кожата, тялото и косата си и търсят натурални алтернативи.

Основни теми на блога:
1. Шафран и неговите ползи за кожата (антиоксиданти, изсветляване, противовъзпалително действие).
2. Натурални съставки и ритуали — масла, билки, етерични масла, екстракти.
3. Рутини за лице, тяло и коса — сезонни препоръки, типове кожа, anti-age.
4. Beauty културата — традиции (персийска, индийска, средиземноморска), история на шафрана.
5. Митове и факти в козметиката, как да разпознаваме истински натурални продукти.
6. Wellness и self-care през деня — комбиниране на грижа + начин на живот.

Стратегия за разнообразие:
- НЕ повтаряй теми вече публикувани (списъкът ще ти бъде даден).
- Редувай категориите — ако последните 3 статии са били за лице, следващата да е за тяло, коса или wellness.
- Заглавията да са конкретни и привлекателни, без кликбейт. Избягвай "Топ 5", "Не вярвай на това", и подобни шаблони.
- Споменавай шафрана естествено — само когато е релевантно за темата, не насила.

Връщай СТРИКТНО валиден JSON със следната схема:

{
  "title": "Заглавие на статията (40-80 символа, без кавички)",
  "eyebrow": "Категория, 1-3 думи (Грижа за лицето, Шафранови ритуали, Натурални съставки и др.)",
  "excerpt": "Анонс 1-2 изречения (под 200 символа)",
  "readTime": "X мин",
  "blocks": [
    { "type": "paragraph", "html": "<p>Уводен абзац...</p>" },
    { "type": "heading", "text": "Подзаглавие" },
    { "type": "paragraph", "html": "<p>Текст...</p><p>Още текст...</p>" },
    { "type": "heading", "text": "Друго подзаглавие" },
    { "type": "paragraph", "html": "<p>Текст...</p><ul><li>точка 1</li><li>точка 2</li></ul>" }
  ]
}

Правила за формата:
- 5-8 секции (heading + paragraph). Първият блок е paragraph (увод без heading).
- В paragraph.html използвай само: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>. Никакви <h1>/<h2>/<h3> там.
- heading.text е само чистият текст без <h2>.
- НЕ включвай "slug" — генерира се автоматично.
- НЕ давай медицински съвети или гаранции — пиши информативно, не лекарски.
- Дължина: общо 600-900 думи.

Връщай САМО JSON обекта — без markdown code fences, без коментари.`;

// ── OpenAI call ───────────────────────────────────────────────────────────────

function isBlock(value: unknown): value is GeneratedBlock {
  if (!value || typeof value !== "object") return false;
  const v = value as { type?: string; text?: unknown; html?: unknown };
  if (v.type === "heading") return typeof v.text === "string";
  if (v.type === "paragraph") return typeof v.html === "string";
  return false;
}

function parseArticle(raw: unknown): GeneratedArticle | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string" || !obj.title.trim()) return null;
  if (!Array.isArray(obj.blocks)) return null;
  const blocks = obj.blocks.filter(isBlock);
  if (blocks.length === 0) return null;

  return {
    title: obj.title.trim(),
    slug: typeof obj.slug === "string" ? obj.slug : undefined,
    eyebrow: typeof obj.eyebrow === "string" ? obj.eyebrow : undefined,
    excerpt: typeof obj.excerpt === "string" ? obj.excerpt : undefined,
    readTime: typeof obj.readTime === "string" ? obj.readTime : undefined,
    blocks,
  };
}

async function callOpenAI(userMessage: string, model: string, apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  const article = parseArticle(parsed);
  if (!article) throw new Error("OpenAI response did not match expected schema");
  return article;
}

// ── Slug uniqueness ───────────────────────────────────────────────────────────

async function uniqueSlug(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  base: string,
) {
  const cleanBase = (base || "ai-statia").slice(0, 80);
  let candidate = cleanBase;
  let suffix = 1;
  while (suffix < 25) {
    const { data } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${cleanBase}-${suffix}`;
  }
  return `${cleanBase}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Recent titles for content-plan continuity ─────────────────────────────────

async function getRecentTitles(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  limit = 30,
): Promise<RecentArticleSummary[]> {
  const { data } = await supabase
    .from("blog_posts")
    .select("title, eyebrow, created_at, published")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    title: row.title,
    eyebrow: row.eyebrow,
    createdAt: row.created_at,
    published: Boolean(row.published),
  }));
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function generateAndSaveBlogDraft(
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY не е конфигуриран в .env.local");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const supabase = createSupabaseAdminClient();

  // Always pull recent titles — the AI uses them either to avoid duplicates
  // (manual topic) or to pick a fresh angle (autonomous run).
  const recent = await getRecentTitles(supabase);
  const recentList = recent.length
    ? recent.map((r, i) => `${i + 1}. ${r.title}${r.eyebrow ? ` [${r.eyebrow}]` : ""}`).join("\n")
    : "(няма публикувани статии все още)";

  const userMessage = opts.topic
    ? `Темата за днешната статия е: "${opts.topic}".

Списък на последните публикувани статии (НЕ повтаряй темата им):
${recentList}

Генерирай пълна статия по тази тема.`
    : `Избери свежа тема за днешната статия — нещо различно от вече публикуваните.

Списък на последните публикувани статии (НЕ повтаряй темата им):
${recentList}

Избери конкретен ъгъл (напр. сезонна рутина, конкретна съставка, типов проблем на кожата, традиция, мит/факт), който допълва добре блога — и напиши пълната статия по него.`;

  const article = await callOpenAI(userMessage, model, apiKey);

  const baseSlug = slugify(article.slug || article.title);
  const slug = await uniqueSlug(supabase, baseSlug || "ai-statia");

  const eyebrowFallback = opts.auto ? "AI чернова (авто)" : "AI чернова";

  const { data: post, error: insertErr } = await supabase
    .from("blog_posts")
    .insert({
      title: article.title,
      slug,
      eyebrow: article.eyebrow || eyebrowFallback,
      excerpt: article.excerpt || null,
      cover_image: null,
      read_time: article.readTime || null,
      published_at: null,
      is_featured: false,
      published: false, // Always a draft — admin reviews before publishing.
      show_in_list: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !post) {
    throw new Error(insertErr?.message || "Failed to create draft");
  }

  const rows = article.blocks.map((block, i) => ({
    post_id: post.id,
    type: block.type === "heading" ? "heading" : "paragraph",
    content: block.type === "heading" ? `<h2>${block.text}</h2>` : block.html,
    position: i + 1,
  }));

  const { error: blocksErr } = await supabase.from("blog_blocks").insert(rows);
  if (blocksErr) {
    await supabase.from("blog_posts").delete().eq("id", post.id);
    throw new Error(blocksErr.message);
  }

  return {
    id: post.id,
    slug,
    title: article.title,
    excerpt: article.excerpt ?? null,
    model,
    pickedTopic: opts.topic ?? article.title,
    recentArticles: recent,
  };
}
