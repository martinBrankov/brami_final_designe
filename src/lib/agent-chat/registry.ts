import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { AgentCategory, AgentDefinition, ModelDefinition } from "@/lib/agent-chat/types";

// Agent & Model Registry — the single source of truth for which agents and
// models exist. Both are data (Supabase tables seeded in migration 026), never
// hardcoded in the UI. New providers/agents appear here without a code change.

type AgentRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: AgentCategory;
  capabilities_json: unknown;
  implementation_ref: string | null;
  default_model_config_id: string | null;
  enabled: boolean;
};

type ModelRow = {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  settings_json: { capabilities?: unknown; isFreeTier?: boolean } | null;
  enabled: boolean;
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function mapAgent(row: AgentRow): AgentDefinition {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    category: row.category,
    capabilities: toStringArray(row.capabilities_json),
    implementationRef: row.implementation_ref,
    defaultModelConfigId: row.default_model_config_id,
    enabled: row.enabled,
  };
}

function mapModel(row: ModelRow): ModelDefinition {
  return {
    id: row.id,
    provider: row.provider,
    modelId: row.model_id,
    displayName: row.display_name,
    capabilities: toStringArray(row.settings_json?.capabilities),
    enabled: row.enabled,
    isFreeTier: Boolean(row.settings_json?.isFreeTier),
  };
}

/** All enabled agents, ordered by category then name. */
export async function getAgents(includeDisabled = false): Promise<AgentDefinition[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("agents")
    .select(
      "id, key, name, description, category, capabilities_json, implementation_ref, default_model_config_id, enabled",
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (!includeDisabled) query = query.eq("enabled", true);

  const { data, error } = await query;
  if (error) throw new Error(`Неуспешно зареждане на агенти: ${error.message}`);
  return (data ?? []).map((r) => mapAgent(r as AgentRow));
}

export async function getAgentById(id: string): Promise<AgentDefinition | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select(
      "id, key, name, description, category, capabilities_json, implementation_ref, default_model_config_id, enabled",
    )
    .eq("id", id)
    .maybeSingle<AgentRow>();
  if (error) throw new Error(`Неуспешно зареждане на агент: ${error.message}`);
  return data ? mapAgent(data) : null;
}

/** All model configs (optionally including disabled ones for admin pickers). */
export async function getModels(includeDisabled = false): Promise<ModelDefinition[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("model_configs")
    .select("id, provider, model_id, display_name, settings_json, enabled")
    .order("provider", { ascending: true })
    .order("display_name", { ascending: true });
  if (!includeDisabled) query = query.eq("enabled", true);

  const { data, error } = await query;
  if (error) throw new Error(`Неуспешно зареждане на модели: ${error.message}`);
  return (data ?? []).map((r) => mapModel(r as ModelRow));
}

export async function getModelById(id: string): Promise<ModelDefinition | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("model_configs")
    .select("id, provider, model_id, display_name, settings_json, enabled")
    .eq("id", id)
    .maybeSingle<ModelRow>();
  if (error) throw new Error(`Неуспешно зареждане на модел: ${error.message}`);
  return data ? mapModel(data) : null;
}
