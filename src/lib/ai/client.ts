import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { resolveAgentProvider } from "@/lib/agent-chat/providers/config";
import { openaiStructured } from "@/lib/agent-chat/providers/openai";

// New AI agents run on Claude (the existing OpenAI blog generator in
// src/lib/blog-generate.ts is unrelated and stays as-is).
export const AI_MODEL = "claude-opus-4-8";

let cachedClient: Anthropic | null = null;

/**
 * Anthropic client. No apiKey is passed, so the SDK resolves credentials in
 * order (first match wins):
 *   1. ANTHROPIC_API_KEY (env / .env.local)
 *   2. ANTHROPIC_AUTH_TOKEN (env)
 *   3. OAuth profile from `ant auth login` (auto-refreshed via token cache)
 *
 * This lets the app run locally on your Anthropic OAuth login (`ant auth login`)
 * without a separate API key. Note: an OAuth profile lives on this machine only —
 * production (Vercel) still needs ANTHROPIC_API_KEY, since there is no profile on
 * disk there.
 */
export function createAnthropicClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** A per-agent provider+model choice (from the conversation member's model_config). */
export type ModelChoice = { provider: string; modelId: string };

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
  /** Force a specific provider (e.g. per-agent model choice). Falls back to the
   *  configured default (resolveAgentProvider) when omitted. */
  provider?: string;
  modelId?: string;
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
  provider,
  modelId,
}: RunStructuredOptions): Promise<T> {
  // Use the explicit per-agent choice when given; otherwise the configured
  // default (resolveAgentProvider). The OpenAI path lets agents run on an OpenAI
  // key when Anthropic has no credit.
  const resolved =
    provider && modelId ? { provider, modelId } : resolveAgentProvider();

  if (resolved.provider === "openai") {
    const { value } = await openaiStructured<T>(resolved.modelId, { system, user, schema, maxTokens });
    return value;
  }

  const client = createAnthropicClient();

  const message = await client.messages.create({
    model: resolved.modelId || AI_MODEL,
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
