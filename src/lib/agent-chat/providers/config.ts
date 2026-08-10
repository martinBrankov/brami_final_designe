import "server-only";

// Which provider/model the agents use by default. Kept dependency-free (no client
// imports) so both src/lib/ai/client.ts and the orchestrator can resolve it
// without an import cycle.
//
// Resolution order:
//   1. AGENT_PROVIDER env ("openai" | "anthropic") — explicit override.
//   2. Auto: OpenAI when an OPENAI_API_KEY is present and no ANTHROPIC_API_KEY is
//      set (e.g. running on the OpenAI key while Anthropic has no API credit).
//   3. Default: Anthropic (claude-opus-4-8).

export type AgentProvider = "anthropic" | "openai";

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-8";

function defaultOpenAIModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function resolveAgentProvider(): { provider: AgentProvider; modelId: string } {
  const explicit = (process.env.AGENT_PROVIDER || "").trim().toLowerCase();
  if (explicit === "openai") return { provider: "openai", modelId: defaultOpenAIModel() };
  if (explicit === "anthropic") return { provider: "anthropic", modelId: DEFAULT_ANTHROPIC_MODEL };

  if (process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return { provider: "openai", modelId: defaultOpenAIModel() };
  }
  return { provider: "anthropic", modelId: DEFAULT_ANTHROPIC_MODEL };
}
