import "server-only";

import { generateEditorSuggestion } from "@/lib/ai/agents/editor";
import { generateSocialPosts } from "@/lib/ai/agents/influencer";
import { generateMarketingStrategy } from "@/lib/ai/agents/marketing";
import {
  getAgentMembers,
  postMessage,
  setMemberStatus,
} from "@/lib/agent-chat/conversations";
import {
  consumePendingControl,
  getCompletedStepIds,
} from "@/lib/agent-chat/interventions";
import type { ModelChoice } from "@/lib/ai/client";
import { resolveAgentProvider } from "@/lib/agent-chat/providers/config";
import { getAgents, getModelById } from "@/lib/agent-chat/registry";
import {
  emitEvent,
  finishRun,
  getTaskContext,
  savePlan,
  setTaskStatus,
  startRun,
} from "@/lib/agent-chat/tasks";
import { planTask, type PlannableAgent } from "@/lib/agent-chat/orchestrator/planner";
import {
  synthesizePlan,
  synthesizeStepDone,
  synthesizeStepError,
  synthesizeStepStart,
  synthesizeTaskDone,
} from "@/lib/agent-chat/orchestrator/synthesis";
import type { ConversationMember, PlanStep, TaskPlan } from "@/lib/agent-chat/types";

// Conversation Orchestrator (Phase 2 + Phase 3). Plans a task, then executes the
// DAG of specialist steps. Between steps it consumes pending user controls
// (pause/stop/redirect) so a running task is cooperatively controllable without a
// queue. resume/retry re-enter execution from the succeeded-step checkpoint.

type DispatchResult = { detail: string; output: Record<string, unknown> };

async function dispatch(
  agentKey: string,
  instruction: string,
  model?: ModelChoice | null,
): Promise<DispatchResult> {
  switch (agentKey) {
    case "influencer": {
      const posts = await generateSocialPosts(instruction, null, model);
      return {
        detail: `${posts.length} социални поста (чернови).`,
        output: { type: "social_posts", count: posts.length, ids: posts.map((p) => p.id) },
      };
    }
    case "marketing": {
      const strategy = await generateMarketingStrategy(instruction, null, model);
      return {
        detail: `Стратегия „${strategy.title}".`,
        output: { type: "marketing_strategy", id: strategy.id, title: strategy.title },
      };
    }
    case "editor": {
      const suggestion = await generateEditorSuggestion(null, instruction, null, model);
      return {
        detail: `Редакция за „${suggestion.postTitle}".`,
        output: { type: "editor_suggestion", id: suggestion.id, postId: suggestion.postId },
      };
    }
    default:
      throw new Error(`Агент „${agentKey}" не е изпълним като стъпка.`);
  }
}

/** The provider+model chosen for a conversation member (its model_config). */
async function resolveMemberModel(member?: ConversationMember): Promise<ModelChoice | null> {
  if (!member?.modelConfigId) return null;
  const mc = await getModelById(member.modelConfigId);
  return mc ? { provider: mc.provider, modelId: mc.modelId } : null;
}

/** Orders steps so every step runs after its dependencies (topological). */
function topoOrder(steps: PlanStep[]): PlanStep[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const done = new Set<string>();
  const ordered: PlanStep[] = [];
  let guard = 0;
  while (ordered.length < steps.length && guard++ < steps.length * steps.length + 1) {
    for (const s of steps) {
      if (done.has(s.id)) continue;
      if (s.dependsOn.every((d) => done.has(d) || !byId.has(d))) {
        ordered.push(s);
        done.add(s.id);
      }
    }
  }
  for (const s of steps) if (!done.has(s.id)) ordered.push(s);
  return ordered;
}

async function resolvePlannerModel(members: ConversationMember[]): Promise<{
  provider: string;
  modelId: string;
  managerAgentId: string | null;
}> {
  // Prefer the Manager member's chosen model (if the user added Manager); else the
  // configured default (AGENT_PROVIDER / auto).
  const managerMember = members.find((m) => m.agentKey === "manager");
  const managerModel = await resolveMemberModel(managerMember);
  if (managerModel) {
    return { ...managerModel, managerAgentId: managerMember?.agentId ?? null };
  }
  const { provider, modelId } = resolveAgentProvider();
  const agents = await getAgents(true);
  const manager = agents.find((a) => a.key === "manager") ?? null;
  return { provider, modelId, managerAgentId: manager?.id ?? null };
}

/**
 * Executes the plan's steps in topological order, skipping any already in
 * `completed` (resume checkpoint). Consumes pending controls between steps.
 */
async function executeSteps(input: {
  taskId: string;
  conversationId: string;
  plan: TaskPlan;
  members: ConversationMember[];
  completed: Set<string>;
}): Promise<void> {
  const { taskId, conversationId, plan, members } = input;
  const memberByKey = new Map<string, ConversationMember>();
  for (const m of members) if (m.agentKey) memberByKey.set(m.agentKey, m);

  await setTaskStatus(taskId, "running");

  const ordered = topoOrder(plan.steps);
  const succeeded = new Set<string>(input.completed);
  let okCount = input.completed.size;
  let redirectSuffix = "";

  for (const step of ordered) {
    if (succeeded.has(step.id)) continue; // resumed — already done

    // ── Cooperative control checkpoint ──────────────────────────────────
    const control = await consumePendingControl(taskId);
    if (control.stop) {
      await setTaskStatus(taskId, "cancelled", { output_json: { okCount, total: ordered.length } });
      await postMessage({
        conversationId,
        senderType: "system",
        senderId: null,
        messageType: "text",
        content: "Задачата е спряна. Частичният резултат е запазен.",
        metadata: { taskId },
      });
      for (const m of members) if (m.status !== "failed") await setMemberStatus(m.id, "idle");
      return;
    }
    if (control.pause) {
      await setTaskStatus(taskId, "paused");
      await postMessage({
        conversationId,
        senderType: "system",
        senderId: null,
        messageType: "text",
        content: "Задачата е на пауза. Можеш да продължиш или да пренасочиш агентите.",
        metadata: { taskId },
      });
      for (const m of members) if (m.status !== "failed") await setMemberStatus(m.id, "idle");
      return;
    }
    if (control.redirect) {
      redirectSuffix = redirectSuffix
        ? `${redirectSuffix} ${control.redirect}`
        : control.redirect;
      await postMessage({
        conversationId,
        senderType: "system",
        senderId: null,
        messageType: "text",
        content: `Инструкцията е добавена към активната задача: ${control.redirect}`,
        metadata: { taskId },
      });
    }

    const member = memberByKey.get(step.agentKey);
    const depsOk = step.dependsOn.every((d) => succeeded.has(d));
    if (!depsOk) {
      await emitEvent({
        taskId,
        eventType: "step_skipped",
        payload: { step: step.id, reason: "dependency_failed" },
        visibility: "user_summary",
      });
      continue;
    }

    const agentName = member?.agentName ?? step.agentKey;
    const effectiveInstruction = redirectSuffix
      ? `${step.instruction}\n\nДопълнителна инструкция от потребителя: ${redirectSuffix}`
      : step.instruction;

    if (member) await setMemberStatus(member.id, "working");
    await emitEvent({ taskId, eventType: "step_start", payload: { step: step.id, agentKey: step.agentKey } });
    await postMessage({
      conversationId,
      senderType: "agent",
      senderId: step.agentKey,
      messageType: "activity",
      content: synthesizeStepStart(agentName, step.expectedOutput),
      metadata: { taskId, step: step.id },
    });

    const runId = await startRun({
      taskId,
      agentId: member?.agentId ?? null,
      modelConfigId: member?.modelConfigId ?? null,
      inputSnapshot: { instruction: effectiveInstruction, step: step.id },
    });

    try {
      const stepModel = await resolveMemberModel(member);
      const result = await dispatch(step.agentKey, effectiveInstruction, stepModel);
      await finishRun(runId, { status: "succeeded", output: result.output });
      await emitEvent({
        taskId,
        runId,
        eventType: "step_done",
        payload: { step: step.id, ...result.output },
        visibility: "user_summary",
      });
      await postMessage({
        conversationId,
        senderType: "agent",
        senderId: step.agentKey,
        messageType: "activity",
        content: synthesizeStepDone(agentName, result.detail),
        metadata: { taskId, step: step.id, output: result.output },
      });
      if (member) await setMemberStatus(member.id, "completed");
      succeeded.add(step.id);
      okCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "неизвестна грешка";
      await finishRun(runId, { status: "failed", error: message });
      await emitEvent({
        taskId,
        runId,
        eventType: "step_failed",
        payload: { step: step.id, error: message },
        visibility: "user_summary",
      });
      await postMessage({
        conversationId,
        senderType: "agent",
        senderId: step.agentKey,
        messageType: "error",
        content: synthesizeStepError(agentName, message),
        metadata: { taskId, step: step.id },
      });
      if (member) await setMemberStatus(member.id, "failed");
    }
  }

  const total = ordered.length;
  if (okCount === 0) {
    await setTaskStatus(taskId, "failed", { error_json: { message: "Всички стъпки се провалиха." } });
  } else {
    await setTaskStatus(taskId, "ready_for_approval", { output_json: { okCount, total } });
  }
  await postMessage({
    conversationId,
    senderType: "system",
    senderId: null,
    messageType: "text",
    content: synthesizeTaskDone(okCount, total),
    metadata: { taskId },
  });
  for (const m of members) if (m.status !== "failed") await setMemberStatus(m.id, "idle");
}

function toPlannable(members: ConversationMember[]): PlannableAgent[] {
  return members
    .filter((m) => m.agentKey && m.agentCategory !== "orchestration")
    .map((m) => ({
      key: m.agentKey as string,
      name: m.agentName as string,
      description: null,
      category: m.agentCategory as string,
    }));
}

/** Fresh run: plan, then execute the whole DAG. */
export async function runTask(input: {
  taskId: string;
  conversationId: string;
  instruction: string;
}): Promise<void> {
  const { taskId, conversationId, instruction } = input;
  const members = await getAgentMembers(conversationId);

  try {
    const plannable = toPlannable(members);
    if (plannable.length === 0) {
      throw new Error("Няма изпълними агенти в чата. Добави напр. influencer, editor или marketing.");
    }

    await setTaskStatus(taskId, "planning");
    const { provider, modelId, managerAgentId } = await resolvePlannerModel(members);
    const planRunId = await startRun({
      taskId,
      agentId: managerAgentId,
      modelConfigId: null,
      inputSnapshot: { instruction },
    });
    const { plan, usage } = await planTask({ instruction, agents: plannable, provider, modelId });
    await finishRun(planRunId, { status: "succeeded", output: { steps: plan.steps.length }, usage });
    await savePlan({ taskId, plan, summary: plan.rationale, agentId: managerAgentId });
    await emitEvent({ taskId, eventType: "plan_ready", payload: { steps: plan.steps.length }, visibility: "user_summary" });
    await postMessage({
      conversationId,
      senderType: "agent",
      senderId: "manager",
      messageType: "activity",
      content: synthesizePlan(plan),
      metadata: { taskId, plan },
    });

    await executeSteps({ taskId, conversationId, plan, members, completed: new Set() });
  } catch (err) {
    await failTask(taskId, conversationId, members, err);
  }
}

/** Resume a paused/cancelled task from its succeeded-step checkpoint. */
export async function resumeTask(taskId: string): Promise<void> {
  const ctx = await getTaskContext(taskId);
  if (!ctx || !ctx.plan) throw new Error("Няма план за продължаване.");
  const members = await getAgentMembers(ctx.conversationId);
  try {
    const completed = new Set(await getCompletedStepIds(taskId));
    await executeSteps({
      taskId,
      conversationId: ctx.conversationId,
      plan: ctx.plan,
      members,
      completed,
    });
  } catch (err) {
    await failTask(taskId, ctx.conversationId, members, err);
  }
}

async function failTask(
  taskId: string,
  conversationId: string,
  members: ConversationMember[],
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : "неизвестна грешка";
  await setTaskStatus(taskId, "failed", { error_json: { message } });
  await emitEvent({ taskId, eventType: "task_failed", payload: { error: message }, visibility: "user_summary" });
  await postMessage({
    conversationId,
    senderType: "system",
    senderId: null,
    messageType: "error",
    content: `Задачата се провали: ${message}`,
    metadata: { taskId },
  });
  for (const m of members) await setMemberStatus(m.id, "idle");
}
