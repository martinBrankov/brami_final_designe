import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { createAnthropicClient } from "@/lib/ai/client";
import type {
  ModelProviderAdapter,
  StructuredInput,
  StructuredResult,
} from "@/lib/agent-chat/providers/types";

// Anthropic adapter — mirrors src/lib/ai/client.ts#runStructured (adaptive
// thinking + json_schema output) but returns token usage so the orchestrator can
// record cost/usage on each task run.

export const anthropicAdapter: ModelProviderAdapter = {
  provider: "anthropic",

  async generateStructured<T>(
    modelId: string,
    input: StructuredInput,
  ): Promise<StructuredResult<T>> {
    const client = createAnthropicClient();

    const message = await client.messages.create(
      {
        model: modelId,
        max_tokens: input.maxTokens ?? 16000,
        thinking: { type: "adaptive" },
        output_config: {
          effort: input.effort ?? "high",
          format: { type: "json_schema", schema: input.schema },
        },
        system: input.system,
        messages: [{ role: "user", content: input.user }],
      } as Anthropic.MessageCreateParamsNonStreaming,
      input.signal ? { signal: input.signal } : undefined,
    );

    if (message.stop_reason === "refusal") {
      throw new Error("Claude отказа да изпълни заявката (refusal).");
    }

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) throw new Error("Claude върна празен отговор.");

    let value: T;
    try {
      value = JSON.parse(text) as T;
    } catch {
      throw new Error("Claude върна невалиден JSON.");
    }

    return {
      value,
      usage: {
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
      },
      provider: "anthropic",
      modelId,
    };
  },
};
