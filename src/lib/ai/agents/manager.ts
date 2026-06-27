import "server-only";

import { runStructured } from "@/lib/ai/client";
import { BRAND_CONTEXT, getProductContext } from "@/lib/ai/brand";
import { generateEditorSuggestion } from "@/lib/ai/agents/editor";
import { generateSocialPosts } from "@/lib/ai/agents/influencer";
import { generateMarketingStrategy } from "@/lib/ai/agents/marketing";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type AgentName = "influencer" | "editor" | "marketing";

export type CampaignTask = {
  agent: AgentName;
  instruction: string;
  targetRef: string;
};

type CampaignPlan = { rationale: string; tasks: CampaignTask[] };

export type CampaignResult = {
  campaignId: string;
  goal: string;
  rationale: string;
  outcomes: { agent: AgentName; ok: boolean; detail: string }[];
};

const SYSTEM_PROMPT = `${BRAND_CONTEXT}

Ти си маркетинг мениджър на Brami и координираш екип от три AI агента:
- "influencer" — създава постове за Facebook/Instagram (популяризира продукти, марката или сайта).
- "editor" — подобрява съществуваща блог статия (targetRef може да е празен — тогава се избира последната).
- "marketing" — изготвя обща маркетинг стратегия.

За дадена цел изготви кратък план: подбери кои агенти да ангажираш и дай на всеки ясна, конкретна инструкция (на български). Обикновено 2-4 задачи. Не дублирай един и същ агент без причина.
- rationale: 1-3 изречения защо този план постига целта.
- tasks: всяка задача има agent, instruction и targetRef (празен низ ако не е приложим).`;

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["rationale", "tasks"],
  properties: {
    rationale: { type: "string" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["agent", "instruction", "targetRef"],
        properties: {
          agent: { type: "string", enum: ["influencer", "editor", "marketing"] },
          instruction: { type: "string" },
          targetRef: { type: "string" },
        },
      },
    },
  },
};

async function dispatch(task: CampaignTask, campaignId: string): Promise<string> {
  switch (task.agent) {
    case "influencer": {
      const posts = await generateSocialPosts(task.instruction, campaignId);
      return `${posts.length} социални поста (чернови)`;
    }
    case "marketing": {
      const strategy = await generateMarketingStrategy(task.instruction, campaignId);
      return `Стратегия: ${strategy.title}`;
    }
    case "editor": {
      const postId = task.targetRef.trim() || null;
      const suggestion = await generateEditorSuggestion(postId, task.instruction, campaignId);
      return `Редакция за "${suggestion.postTitle}"`;
    }
    default:
      return "Неизвестен агент — пропуснат";
  }
}

/**
 * Manager run: plan a campaign, then fan out to the specialist agents. All
 * produced items are drafts/suggestions linked to the campaign for review.
 */
export async function generateCampaign(
  goal: string,
  options: { source?: "manual" | "cron"; createdBy?: string | null } = {},
): Promise<CampaignResult> {
  const catalog = await getProductContext();

  const plan = await runStructured<CampaignPlan>({
    system: SYSTEM_PROMPT,
    user: `Каталог (контекст):\n${catalog}\n\nЦел на кампанията: ${goal}\n\nИзготви плана според схемата.`,
    schema: SCHEMA,
    effort: "high",
  });

  const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  const supabase = createSupabaseAdminClient();

  const { data: campaign, error: campaignErr } = await supabase
    .from("ai_campaigns")
    .insert({
      goal,
      rationale: plan.rationale || null,
      plan: tasks,
      status: "planning",
      source: options.source === "cron" ? "cron" : "manual",
      created_by: options.createdBy ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (campaignErr || !campaign) {
    throw new Error(`Неуспешно създаване на кампания: ${campaignErr?.message ?? "unknown"}`);
  }

  const outcomes: CampaignResult["outcomes"] = [];
  for (const task of tasks) {
    try {
      const detail = await dispatch(task, campaign.id);
      outcomes.push({ agent: task.agent, ok: true, detail });
    } catch (err) {
      outcomes.push({
        agent: task.agent,
        ok: false,
        detail: err instanceof Error ? err.message : "грешка",
      });
    }
  }

  const allFailed = outcomes.length > 0 && outcomes.every((o) => !o.ok);
  await supabase
    .from("ai_campaigns")
    .update({ status: allFailed ? "failed" : "completed" })
    .eq("id", campaign.id);

  return {
    campaignId: campaign.id,
    goal,
    rationale: plan.rationale ?? "",
    outcomes,
  };
}
