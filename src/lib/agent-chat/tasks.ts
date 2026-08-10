import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type {
  TaskDetail,
  TaskEventView,
  TaskPlan,
  TaskRunView,
  TaskStatus,
} from "@/lib/agent-chat/types";

// Task lifecycle data-access: create tasks, record plans/runs/events and read
// back a task detail for the inspector. Each write commits immediately so a
// concurrent reader (the polling UI) sees progress while the run is in flight.

const nowIso = () => new Date().toISOString();

export async function createTask(input: {
  conversationId: string;
  instruction: string;
  createdBy: string | null;
  taskType?: string;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const title = input.instruction.trim().slice(0, 120);
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      conversation_id: input.conversationId,
      task_type: input.taskType ?? "generic",
      title,
      description: input.instruction,
      status: "queued",
      input_json: { instruction: input.instruction },
      created_by: input.createdBy,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    throw new Error(`Неуспешно създаване на задача: ${error?.message ?? "unknown"}`);
  }
  return data.id;
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const updates: Record<string, unknown> = { status, updated_at: nowIso(), ...extra };
  if (status === "running" && !("started_at" in extra)) updates.started_at = nowIso();
  if (["published", "failed", "cancelled", "ready_for_approval"].includes(status)) {
    updates.completed_at = nowIso();
  }
  const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
  if (error) throw new Error(`Неуспешна промяна на статус: ${error.message}`);
}

export async function savePlan(input: {
  taskId: string;
  plan: TaskPlan;
  summary: string;
  agentId: string | null;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("task_plans")
    .insert({
      task_id: input.taskId,
      version: 1,
      plan_json: input.plan,
      summary: input.summary,
      created_by_agent_id: input.agentId,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    throw new Error(`Неуспешен запис на план: ${error?.message ?? "unknown"}`);
  }
  await supabase.from("tasks").update({ plan_id: data.id, updated_at: nowIso() }).eq("id", input.taskId);
  return data.id;
}

export async function startRun(input: {
  taskId: string;
  agentId: string | null;
  modelConfigId: string | null;
  inputSnapshot: Record<string, unknown>;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("task_runs")
    .insert({
      task_id: input.taskId,
      agent_id: input.agentId,
      model_config_id: input.modelConfigId,
      status: "running",
      input_snapshot_json: input.inputSnapshot,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    throw new Error(`Неуспешно стартиране на run: ${error?.message ?? "unknown"}`);
  }
  await supabase
    .from("tasks")
    .update({ current_run_id: data.id, updated_at: nowIso() })
    .eq("id", input.taskId);
  return data.id;
}

export async function finishRun(
  runId: string,
  result: {
    status: "succeeded" | "failed" | "cancelled";
    output?: Record<string, unknown> | null;
    usage?: { inputTokens: number; outputTokens: number } | null;
    error?: string | null;
  },
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("task_runs")
    .update({
      status: result.status,
      output_snapshot_json: result.output ?? null,
      usage_json: result.usage ?? null,
      error_json: result.error ? { message: result.error } : null,
      ended_at: nowIso(),
    })
    .eq("id", runId);
  if (error) throw new Error(`Неуспешно приключване на run: ${error.message}`);
}

export async function emitEvent(input: {
  taskId: string;
  runId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
  visibility?: "internal" | "user_summary" | "debug";
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("task_events").insert({
    task_id: input.taskId,
    run_id: input.runId ?? null,
    event_type: input.eventType,
    payload_json: input.payload ?? {},
    visibility: input.visibility ?? "internal",
  });
}

type TaskRow = {
  id: string;
  conversation_id: string;
  status: TaskStatus;
  title: string;
  plan_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export async function getTaskDetail(taskId: string): Promise<TaskDetail | null> {
  const supabase = createSupabaseAdminClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, conversation_id, status, title, plan_id, created_at, started_at, completed_at")
    .eq("id", taskId)
    .maybeSingle<TaskRow>();
  if (error) throw new Error(`Неуспешно зареждане на задача: ${error.message}`);
  if (!task) return null;

  const [planRes, runsRes, eventsRes] = await Promise.all([
    task.plan_id
      ? supabase.from("task_plans").select("plan_json, summary").eq("id", task.plan_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("task_runs")
      .select("id, status, usage_json, error_json, started_at, ended_at, agents(key, name)")
      .eq("task_id", taskId)
      .order("started_at", { ascending: true }),
    supabase
      .from("task_events")
      .select("id, event_type, payload_json, visibility, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
  ]);

  const planData = planRes.data as { plan_json: TaskPlan; summary: string | null } | null;

  const runs: TaskRunView[] = (runsRes.data ?? []).map((r) => {
    const agentRaw = (
      r as { agents: { key: string; name: string } | { key: string; name: string }[] | null }
    ).agents;
    const agent = Array.isArray(agentRaw) ? (agentRaw[0] ?? null) : agentRaw;
    const usage = r.usage_json as { inputTokens?: number; outputTokens?: number } | null;
    const err = r.error_json as { message?: string } | null;
    return {
      id: r.id,
      agentKey: agent?.key ?? null,
      agentName: agent?.name ?? null,
      status: r.status,
      usage: usage ? { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 } : null,
      error: err?.message ?? null,
      startedAt: r.started_at,
      endedAt: r.ended_at,
    };
  });

  const events: TaskEventView[] = (eventsRes.data ?? []).map((e) => ({
    id: e.id,
    eventType: e.event_type,
    payload: (e.payload_json as Record<string, unknown>) ?? {},
    visibility: e.visibility,
    createdAt: e.created_at,
  }));

  return {
    id: task.id,
    conversationId: task.conversation_id,
    status: task.status,
    title: task.title,
    plan: planData?.plan_json ?? null,
    planSummary: planData?.summary ?? null,
    runs,
    events,
    createdAt: task.created_at,
    startedAt: task.started_at,
    completedAt: task.completed_at,
  };
}

/** Minimal task context for resume/retry: goal, conversation, and saved plan. */
export async function getTaskContext(taskId: string): Promise<{
  conversationId: string;
  instruction: string;
  status: TaskStatus;
  plan: TaskPlan | null;
} | null> {
  const supabase = createSupabaseAdminClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select("conversation_id, description, input_json, status, plan_id")
    .eq("id", taskId)
    .maybeSingle<{
      conversation_id: string;
      description: string | null;
      input_json: { instruction?: string } | null;
      status: TaskStatus;
      plan_id: string | null;
    }>();
  if (error) throw new Error(`Неуспешно зареждане на задача: ${error.message}`);
  if (!task) return null;

  let plan: TaskPlan | null = null;
  if (task.plan_id) {
    const { data: planRow } = await supabase
      .from("task_plans")
      .select("plan_json")
      .eq("id", task.plan_id)
      .maybeSingle<{ plan_json: TaskPlan }>();
    plan = planRow?.plan_json ?? null;
  }

  return {
    conversationId: task.conversation_id,
    instruction: task.input_json?.instruction ?? task.description ?? "",
    status: task.status,
    plan,
  };
}

/** The most recent task for a conversation (the inspector shows this one). */
export async function getLatestTaskId(conversationId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("tasks")
    .select("id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}
