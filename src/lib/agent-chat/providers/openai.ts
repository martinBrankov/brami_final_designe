import "server-only";

import type {
  ModelProviderAdapter,
  StructuredInput,
  StructuredResult,
} from "@/lib/agent-chat/providers/types";

// OpenAI adapter — structured JSON generation via the Chat Completions API (raw
// fetch, matching src/lib/blog-generate.ts; no openai npm dependency). Uses
// OpenAI Structured Outputs (json_schema, strict) so the same JSON schemas the
// Anthropic path uses are honored. Lets the agents run on an OpenAI key when no
// Anthropic API credit is available.

type OpenAIResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

/** One structured OpenAI call → parsed value + token usage. */
export async function openaiStructured<T>(
  modelId: string,
  input: StructuredInput,
): Promise<StructuredResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY не е конфигуриран в .env.local");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    signal: input.signal,
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "result", strict: true, schema: input.schema },
      },
      max_tokens: input.maxTokens ?? 16000,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as OpenAIResponse;
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${json.error?.message ?? "unknown"}`);
  }

  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI върна празен отговор.");

  let value: T;
  try {
    value = JSON.parse(text) as T;
  } catch {
    throw new Error("OpenAI върна невалиден JSON.");
  }

  return {
    value,
    usage: {
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    },
    provider: "openai",
    modelId,
  };
}

export const openaiAdapter: ModelProviderAdapter = {
  provider: "openai",
  generateStructured<T>(modelId: string, input: StructuredInput) {
    return openaiStructured<T>(modelId, input);
  },
};
