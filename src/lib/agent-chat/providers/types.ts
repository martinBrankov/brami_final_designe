import "server-only";

import type { Effort } from "@/lib/ai/client";

// Provider Adapter Layer — one interface every AI provider implements so agents
// can run on different models without provider-specific code leaking out.
// Phase 2 needs structured generation + usage; streaming/cancel/image arrive in
// later phases and are optional on the interface.

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type StructuredInput = {
  system: string;
  user: string;
  /** JSON Schema — every object must set additionalProperties:false + required. */
  schema: Record<string, unknown>;
  effort?: Effort;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type StructuredResult<T> = {
  value: T;
  usage: TokenUsage;
  provider: string;
  modelId: string;
};

export interface ModelProviderAdapter {
  readonly provider: string;
  /** A schema-constrained generation, returning the parsed value + token usage. */
  generateStructured<T>(modelId: string, input: StructuredInput): Promise<StructuredResult<T>>;
  /** Optional: providers that support cancellation implement this (Phase 3). */
  cancel?(runId: string): Promise<void>;
}
