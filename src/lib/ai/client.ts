import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// New AI agents run on Claude (the existing OpenAI blog generator in
// src/lib/blog-generate.ts is unrelated and stays as-is).
export const AI_MODEL = "claude-opus-4-8";

let cachedClient: Anthropic | null = null;

export function createAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY не е конфигуриран в .env.local");
  }
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

type RunStructuredOptions = {
  system: string;
  user: string;
  /**
   * A JSON Schema. Structured outputs require every object to set
   * `additionalProperties: false` and list all of its keys in `required`.
   */
  schema: Record<string, unknown>;
  effort?: Effort;
  maxTokens?: number;
};

/**
 * Single structured Claude call: adaptive thinking + a JSON-schema-constrained
 * response, parsed and returned. Mirrors the validate-and-throw style of
 * blog-generate.ts so callers get either a typed object or a thrown error.
 */
export async function runStructured<T>({
  system,
  user,
  schema,
  effort = "high",
  maxTokens = 16000,
}: RunStructuredOptions): Promise<T> {
  const client = createAnthropicClient();

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    output_config: {
      effort,
      format: { type: "json_schema", schema },
    },
    system,
    messages: [{ role: "user", content: user }],
  });

  if (message.stop_reason === "refusal") {
    throw new Error("Claude отказа да изпълни заявката (refusal).");
  }

  // Structured outputs put the schema-valid JSON in the text block.
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Claude върна празен отговор.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Claude върна невалиден JSON.");
  }
}
