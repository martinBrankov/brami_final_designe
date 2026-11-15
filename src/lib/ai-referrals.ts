// Recognises visits that come from AI assistants (ChatGPT, Perplexity, …),
// from the referrer or from the utm_source they add to links.
// Shared by server and client code.

export type AiSource = {
  key: string;
  label: string;
  hosts: string[];
  utm: string[];
};

export const AI_SOURCES: AiSource[] = [
  { key: "chatgpt", label: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"], utm: ["chatgpt.com", "chatgpt", "openai"] },
  { key: "perplexity", label: "Perplexity", hosts: ["perplexity.ai"], utm: ["perplexity", "perplexity.ai"] },
  { key: "gemini", label: "Gemini", hosts: ["gemini.google.com", "bard.google.com"], utm: ["gemini"] },
  { key: "copilot", label: "Copilot", hosts: ["copilot.microsoft.com", "copilot.cloud.microsoft"], utm: ["copilot"] },
  { key: "claude", label: "Claude", hosts: ["claude.ai"], utm: ["claude", "claude.ai"] },
  { key: "deepseek", label: "DeepSeek", hosts: ["chat.deepseek.com", "deepseek.com"], utm: ["deepseek"] },
  { key: "grok", label: "Grok", hosts: ["grok.com", "x.ai"], utm: ["grok"] },
  { key: "meta", label: "Meta AI", hosts: ["meta.ai"], utm: ["meta.ai"] },
  { key: "mistral", label: "Mistral", hosts: ["chat.mistral.ai"], utm: ["mistral"] },
];

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

/** The AI assistant a visit came from, or null. */
export function detectAiSource(referrer: string | null, landingPath: string | null): AiSource | null {
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase();
      const byHost = AI_SOURCES.find((source) => source.hosts.some((domain) => hostMatches(host, domain)));
      if (byHost) return byHost;
    } catch {
      // not a URL
    }
  }
  if (landingPath?.includes("utm_source=")) {
    try {
      const utm = new URL(landingPath, "https://brami.shop").searchParams.get("utm_source")?.toLowerCase();
      if (utm) return AI_SOURCES.find((source) => source.utm.includes(utm)) ?? null;
    } catch {
      // ignore malformed paths
    }
  }
  return null;
}
