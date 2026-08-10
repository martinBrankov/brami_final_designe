import "server-only";

import { BRAND_CONTEXT, getProductContext } from "@/lib/ai/brand";
import { getAdapter } from "@/lib/agent-chat/providers";
import type { TokenUsage } from "@/lib/agent-chat/providers/types";
import type { PlanStep, TaskPlan } from "@/lib/agent-chat/types";

// Detailed Planning Agent — turns a goal into a small DAG of steps, each assigned
// to one of the available specialist agents with explicit dependsOn edges. The
// output is structured (not free text) so the orchestrator can execute it.

export type PlannableAgent = {
  key: string;
  name: string;
  description: string | null;
  category: string;
};

function buildSchema(agentKeys: string[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["goal", "rationale", "steps"],
    properties: {
      goal: { type: "string" },
      rationale: { type: "string" },
      steps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "agentKey", "instruction", "dependsOn", "expectedOutput"],
          properties: {
            id: { type: "string" },
            agentKey: { type: "string", enum: agentKeys },
            instruction: { type: "string" },
            dependsOn: { type: "array", items: { type: "string" } },
            expectedOutput: { type: "string" },
          },
        },
      },
    },
  };
}

const SYSTEM = `${BRAND_CONTEXT}

Ти си планиращ агент на Brami. Разбиваш маркетинг цел на кратък, изпълним план от стъпки.
Правила:
- Ползвай САМО подадените агенти (по техния key). Не измисляй агенти.
- Обикновено 1-4 стъпки. Не дублирай агент без причина.
- Всяка стъпка има уникален id (кратък, напр. "write", "image"), agentKey, ясна конкретна instruction (на български), dependsOn (id-та на предходни стъпки или празен масив) и expectedOutput (кратко описание).
- dependsOn изразява реални зависимости (напр. проверка зависи от писане). Без цикли.
- rationale: 1-2 изречения защо планът постига целта.`;

export async function planTask(input: {
  instruction: string;
  agents: PlannableAgent[];
  provider: string;
  modelId: string;
}): Promise<{ plan: TaskPlan; usage: TokenUsage }> {
  if (input.agents.length === 0) {
    throw new Error("Няма налични агенти за планиране — добави поне един агент към чата.");
  }

  const catalog = await getProductContext();
  const roster = input.agents
    .map((a) => `- ${a.key} (${a.category}): ${a.name}${a.description ? ` — ${a.description}` : ""}`)
    .join("\n");

  const adapter = getAdapter(input.provider);
  const { value, usage } = await adapter.generateStructured<TaskPlan>(input.modelId, {
    system: SYSTEM,
    user: `Каталог (контекст):\n${catalog}\n\nНалични агенти:\n${roster}\n\nЦел: ${input.instruction}\n\nИзготви плана според схемата.`,
    schema: buildSchema(input.agents.map((a) => a.key)),
    effort: "high",
  });

  // Defensive normalisation: keep only steps whose agentKey is available and
  // whose dependsOn point at real step ids.
  const steps = Array.isArray(value.steps) ? value.steps : [];
  const validKeys = new Set(input.agents.map((a) => a.key));
  const stepIds = new Set(steps.map((s) => s.id));
  const cleaned: PlanStep[] = steps
    .filter((s) => validKeys.has(s.agentKey))
    .map((s) => ({
      id: s.id,
      agentKey: s.agentKey,
      instruction: s.instruction,
      expectedOutput: s.expectedOutput,
      dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn.filter((d) => stepIds.has(d)) : [],
    }));

  if (cleaned.length === 0) {
    throw new Error("Планиращият агент не върна валидни стъпки.");
  }

  return {
    plan: { goal: value.goal || input.instruction, rationale: value.rationale || "", steps: cleaned },
    usage,
  };
}
