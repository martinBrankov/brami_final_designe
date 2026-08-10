import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Agent controls (Phase 3) — cooperative, no queue infrastructure. The user's
// pause/stop/redirect requests are recorded as agent_interventions rows; the
// orchestrator polls (consumes) them at step boundaries. resume/retry re-trigger
// the orchestrator from a checkpoint (the set of already-succeeded steps).

export type ControlAction = "pause" | "resume" | "stop" | "redirect" | "retry";

export type PendingControl = {
  stop: boolean;
  pause: boolean;
  /** Concatenated redirect instructions consumed this check (empty if none). */
  redirect: string | null;
};

const nowIso = () => new Date().toISOString();

export async function recordIntervention(input: {
  taskId: string;
  userId: string | null;
  action: ControlAction;
  instruction?: string | null;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_interventions")
    .insert({
      task_id: input.taskId,
      user_id: input.userId,
      action_type: input.action,
      instruction: input.instruction ?? null,
      // resume/retry are acted on immediately by the route; mark them processed
      // so the orchestrator's boundary check doesn't re-consume them.
      processed_at: input.action === "resume" || input.action === "retry" ? nowIso() : null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    throw new Error(`Неуспешно записване на intervention: ${error?.message ?? "unknown"}`);
  }
  return data.id;
}

type InterventionRow = {
  id: string;
  action_type: "pause" | "stop" | "redirect";
  instruction: string | null;
};

/**
 * Reads and marks-processed the pending pause/stop/redirect interventions for a
 * task, returning an aggregate. Called by the orchestrator between steps.
 */
export async function consumePendingControl(taskId: string): Promise<PendingControl> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_interventions")
    .select("id, action_type, instruction")
    .eq("task_id", taskId)
    .is("processed_at", null)
    .in("action_type", ["pause", "stop", "redirect"])
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Неуспешно четене на interventions: ${error.message}`);

  const rows = (data ?? []) as InterventionRow[];
  if (rows.length === 0) return { stop: false, pause: false, redirect: null };

  const stop = rows.some((r) => r.action_type === "stop");
  const pause = rows.some((r) => r.action_type === "pause");
  const redirects = rows
    .filter((r) => r.action_type === "redirect" && r.instruction)
    .map((r) => r.instruction as string);

  await supabase
    .from("agent_interventions")
    .update({ processed_at: nowIso() })
    .in(
      "id",
      rows.map((r) => r.id),
    );

  return { stop, pause, redirect: redirects.length ? redirects.join(" ") : null };
}

/** Step ids of steps that already ran successfully — the resume checkpoint. */
export async function getCompletedStepIds(taskId: string): Promise<string[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("task_runs")
    .select("input_snapshot_json, status")
    .eq("task_id", taskId)
    .eq("status", "succeeded");
  if (error) throw new Error(`Неуспешно четене на runs: ${error.message}`);

  const ids: string[] = [];
  for (const row of data ?? []) {
    const snap = row.input_snapshot_json as { step?: unknown } | null;
    if (snap && typeof snap.step === "string") ids.push(snap.step);
  }
  return ids;
}
