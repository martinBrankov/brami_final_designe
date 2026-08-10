import "server-only";

import { runStructured, type ModelChoice } from "@/lib/ai/client";
import { BRAND_CONTEXT } from "@/lib/ai/brand";

// Metadata agent — SEO/social metadata for an article: meta title/description,
// excerpt, hero image alt text, social preview text. Stored on the artifact.

export type ArticleMetadata = {
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  heroImageAlt: string;
  socialPreview: string;
};

const SYSTEM = `${BRAND_CONTEXT}

Ти си SEO/metadata специалист на Brami. За подадена статия генерираш метаданни на български.
Изисквания:
- metaTitle: до ~60 символа, ясен и привлекателен.
- metaDescription: до ~155 символа, подканящ, без кликбейт.
- excerpt: кратък анонс (под 200 символа).
- heroImageAlt: описателен alt текст за водещото изображение.
- socialPreview: 1 изречение за социална мрежа.`;

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["metaTitle", "metaDescription", "excerpt", "heroImageAlt", "socialPreview"],
  properties: {
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    excerpt: { type: "string" },
    heroImageAlt: { type: "string" },
    socialPreview: { type: "string" },
  },
};

export async function generateMetadata(
  input: { title: string; excerpt: string | null; body?: string },
  model?: ModelChoice | null,
): Promise<ArticleMetadata> {
  const user = `Заглавие: ${input.title}
Съществуващ анонс: ${input.excerpt ?? "(няма)"}
${input.body ? `Извадка от съдържанието:\n${input.body.slice(0, 1500)}` : ""}

Генерирай метаданните според схемата.`;

  return runStructured<ArticleMetadata>({
    system: SYSTEM,
    user,
    schema: SCHEMA,
    effort: "medium",
    provider: model?.provider,
    modelId: model?.modelId,
  });
}
