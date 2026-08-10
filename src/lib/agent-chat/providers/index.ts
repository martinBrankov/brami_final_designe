import "server-only";

import { anthropicAdapter } from "@/lib/agent-chat/providers/anthropic";
import { openaiAdapter } from "@/lib/agent-chat/providers/openai";
import type { ModelProviderAdapter } from "@/lib/agent-chat/providers/types";

// Registry of provider adapters. Callers resolve by provider name.
const ADAPTERS: Record<string, ModelProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
};

export function getAdapter(provider: string): ModelProviderAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new Error(`Няма adapter за provider "${provider}".`);
  }
  return adapter;
}

export function hasAdapter(provider: string): boolean {
  return provider in ADAPTERS;
}
