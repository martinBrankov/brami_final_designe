import "server-only";

import { runStructured, type ModelChoice } from "@/lib/ai/client";
import { BRAND_CONTEXT } from "@/lib/ai/brand";

// QA agent — reviews an article draft against structure, grammar, brand tone and
// metadata. Returns a short report; does not block, just flags.

export type QaReport = {
  ok: boolean;
  issues: string[];
  summary: string;
};

const SYSTEM = `${BRAND_CONTEXT}

Ти си QA редактор на Brami. Проверяваш готова статия за: структура и четимост, правопис/граматика,
бранд тон (топъл, експертен, без агресивна продажба, без медицински обещания), както и дали няма
измислени факти/цени. Върни кратък доклад.
- ok: true ако статията е готова за преглед без сериозни проблеми; false ако има блокиращи.
- issues: списък с конкретни забележки (може празен).
- summary: 1-2 изречения обобщение.`;

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "issues", "summary"],
  properties: {
    ok: { type: "boolean" },
    issues: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
};

export async function reviewArticle(
  input: { title: string; body: string },
  model?: ModelChoice | null,
): Promise<QaReport> {
  const user = `Заглавие: ${input.title}

Съдържание:
${input.body.slice(0, 6000)}

Направи проверката и върни доклада според схемата.`;

  return runStructured<QaReport>({
    system: SYSTEM,
    user,
    schema: SCHEMA,
    effort: "medium",
    provider: model?.provider,
    modelId: model?.modelId,
  });
}
