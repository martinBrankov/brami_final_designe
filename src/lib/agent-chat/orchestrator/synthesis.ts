import "server-only";

import type { TaskPlan } from "@/lib/agent-chat/types";

// Activity Synthesis — turns internal plan/step/result data into short, safe
// operational messages for the chat (no chain-of-thought). Template-based for the
// common events so we avoid an extra AI call; an AI summariser can be layered in
// later for complex raw outputs.

const MAX = 240;

function clamp(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= MAX ? t : `${t.slice(0, MAX - 1).trimEnd()}…`;
}

export function synthesizePlan(plan: TaskPlan): string {
  const count = plan.steps.length;
  const names = plan.steps.map((s) => s.id).join(", ");
  return clamp(`Planner: Разделих задачата на ${count} стъпк${count === 1 ? "а" : "и"} (${names}).`);
}

export function synthesizeStepStart(agentName: string, expectedOutput: string): string {
  return clamp(`${agentName}: Започвам — ${expectedOutput || "работя по стъпката"}.`);
}

export function synthesizeStepDone(agentName: string, detail: string): string {
  return clamp(`${agentName}: Готово. ${detail}`);
}

export function synthesizeStepError(agentName: string, message: string): string {
  return clamp(
    `${agentName}: Възникна проблем — ${message}. Можеш да повториш задачата или да смениш модела.`,
  );
}

export function synthesizeTaskDone(okCount: number, total: number): string {
  if (okCount === total) return clamp(`Задачата е готова за преглед (${okCount}/${total} стъпки).`);
  if (okCount === 0) return clamp(`Задачата се провали — нито една стъпка не завърши успешно.`);
  return clamp(`Задачата приключи с ${okCount}/${total} успешни стъпки. Прегледай резултата.`);
}
