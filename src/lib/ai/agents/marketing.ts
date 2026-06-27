import "server-only";

import { runStructured } from "@/lib/ai/client";
import { BRAND_CONTEXT, getProductContext } from "@/lib/ai/brand";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type MarketingStrategy = {
  title: string;
  summary: string;
  audienceInsights: string[];
  channels: { name: string; tactics: string[] }[];
  contentCalendar: { period: string; theme: string; ideas: string[] }[];
  kpis: string[];
};

const SYSTEM_PROMPT = `${BRAND_CONTEXT}

Ти си маркетинг специалист на Brami. Изготвяш конкретна, изпълнима стратегия за популяризиране на сайта и продуктите.

Изисквания:
- summary: кратко резюме на стратегията (2-4 изречения).
- audienceInsights: 3-5 наблюдения за целевата аудитория.
- channels: канали (напр. Facebook, Instagram, имейл, блог, инфлуенсъри) с по 2-4 конкретни тактики всеки.
- contentCalendar: 3-6 периода (напр. "Седмица 1", "Юли") с тема и 2-4 идеи за съдържание.
- kpis: 3-5 измерими показателя за успех.
Всичко на български, без общи приказки — конкретно и приложимо за малък онлайн магазин за натурална козметика.`;

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "audienceInsights", "channels", "contentCalendar", "kpis"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    audienceInsights: { type: "array", items: { type: "string" } },
    channels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "tactics"],
        properties: {
          name: { type: "string" },
          tactics: { type: "array", items: { type: "string" } },
        },
      },
    },
    contentCalendar: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["period", "theme", "ideas"],
        properties: {
          period: { type: "string" },
          theme: { type: "string" },
          ideas: { type: "array", items: { type: "string" } },
        },
      },
    },
    kpis: { type: "array", items: { type: "string" } },
  },
};

export type SavedStrategy = { id: string } & MarketingStrategy;

export async function generateMarketingStrategy(
  instruction: string,
  campaignId: string | null = null,
): Promise<SavedStrategy> {
  const catalog = await getProductContext();

  const user = `Каталог на продуктите (контекст):
${catalog}

Задача: ${instruction}

Изготви стратегията според схемата.`;

  const strategy = await runStructured<MarketingStrategy>({
    system: SYSTEM_PROMPT,
    user,
    schema: SCHEMA,
    effort: "high",
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("marketing_strategies")
    .insert({
      title: strategy.title || "Маркетинг стратегия",
      content: strategy,
      status: "draft",
      campaign_id: campaignId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(`Неуспешен запис на стратегия: ${error?.message ?? "unknown"}`);
  }

  return { id: data.id, ...strategy };
}
