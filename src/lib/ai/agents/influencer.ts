import "server-only";

import { runStructured } from "@/lib/ai/client";
import { BRAND_CONTEXT, getProductContext } from "@/lib/ai/brand";
import { SITE_URL } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type GeneratedSocialPost = {
  platform: "facebook" | "instagram";
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  callToAction: string;
  targetType: "product" | "brand" | "site";
  targetRef: string;
};

type InfluencerResult = { posts: GeneratedSocialPost[] };

const SYSTEM_PROMPT = `${BRAND_CONTEXT}

Ти си инфлуенсър/social media агент на Brami. Създаваш кратки, ангажиращи постове за Facebook и Instagram, които популяризират конкретни продукти, марката или сайта brami.shop.

Правила за постовете:
- caption: 1-3 изречения на български, без кавички в началото/края, естествен тон.
- hashtags: 4-8 релевантни хаштага (на латиница и/или кирилица), без # повтаряне.
- imagePrompt: кратко описание на подходящо изображение (на български) — то ще се ползва от дизайнер/инструмент.
- callToAction: ясна подкана (напр. "Поръчай в brami.shop").
- targetType: 'product' (за конкретен продукт — targetRef е неговото #id), 'brand' (targetRef е името на марката) или 'site' (targetRef = "brami.shop").
- За Instagram постовете заложи повече на визуалното описание.`;

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["posts"],
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "platform",
          "caption",
          "hashtags",
          "imagePrompt",
          "callToAction",
          "targetType",
          "targetRef",
        ],
        properties: {
          platform: { type: "string", enum: ["facebook", "instagram"] },
          caption: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          imagePrompt: { type: "string" },
          callToAction: { type: "string" },
          targetType: { type: "string", enum: ["product", "brand", "site"] },
          targetRef: { type: "string" },
        },
      },
    },
  },
};

export type SavedSocialPost = { id: string } & GeneratedSocialPost;

/**
 * Generates social posts and saves them as drafts. Admin reviews + publishes.
 * `instruction` is the brief (manual or from the manager); `campaignId` links
 * the drafts to a campaign when invoked through the manager.
 */
export async function generateSocialPosts(
  instruction: string,
  campaignId: string | null = null,
): Promise<SavedSocialPost[]> {
  const catalog = await getProductContext();

  const user = `Каталог на продуктите (ползвай реалните #id за targetType 'product'):
${catalog}

Сайт за подкана: ${SITE_URL}

Задача: ${instruction}

Генерирай постовете според схемата.`;

  const result = await runStructured<InfluencerResult>({
    system: SYSTEM_PROMPT,
    user,
    schema: SCHEMA,
    effort: "medium",
  });

  const posts = Array.isArray(result.posts) ? result.posts : [];
  if (posts.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const rows = posts.map((p) => ({
    platform: p.platform === "instagram" ? "instagram" : "facebook",
    caption: p.caption,
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    image_prompt: p.imagePrompt || null,
    call_to_action: p.callToAction || null,
    target_type: ["product", "brand", "site"].includes(p.targetType)
      ? p.targetType
      : "site",
    target_ref: p.targetRef || null,
    status: "draft",
    campaign_id: campaignId,
  }));

  const { data, error } = await supabase
    .from("social_posts")
    .insert(rows)
    .select("id");

  if (error) throw new Error(`Неуспешен запис на постове: ${error.message}`);

  return (data ?? []).map((row: { id: string }, i) => ({
    id: row.id,
    ...posts[i],
  }));
}
