"use client";

import { useState } from "react";

import type { TaskDetail, TaskStatus } from "@/lib/agent-chat/types";

export type TaskControlAction = "pause" | "resume" | "stop" | "redirect" | "retry";

// Right-panel task inspector: status, agent controls (pause/resume/stop/redirect/
// retry), the plan (DAG), runs with token usage, and a compact event timeline. The
// parent polls task data and handles control actions.

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  draft: "Чернова",
  queued: "На опашка",
  planning: "Планира",
  ready: "Готова",
  running: "Работи",
  waiting_for_dependency: "Чака зависимост",
  waiting_for_user: "Чака потребител",
  paused: "Пауза",
  reviewing: "Проверка",
  needs_changes: "Нужни промени",
  ready_for_approval: "За одобрение",
  approved: "Одобрена",
  publishing: "Публикува",
  published: "Публикувана",
  failed: "Провалена",
  cancelled: "Отказана",
};

const ACTIVE_STATUSES: TaskStatus[] = ["queued", "planning", "running"];

function statusStyle(status: TaskStatus): string {
  if (status === "failed" || status === "cancelled") return "bg-[#f7dede] text-[#a23b3b]";
  if (status === "ready_for_approval" || status === "approved" || status === "published")
    return "bg-[#dbe7f7] text-[#2f5c8a]";
  if (ACTIVE_STATUSES.includes(status)) return "bg-[#dcefe4] text-[#2f7d55]";
  return "bg-[#eef2f4] text-[#5f6b76]";
}

const CONTROLLABLE: TaskStatus[] = ["queued", "planning", "running", "paused"];

export function TaskInspector({
  task,
  onControl,
  busy = false,
}: {
  task: TaskDetail | null;
  onControl?: (action: TaskControlAction, instruction?: string) => void;
  busy?: boolean;
}) {
  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e3ddd1] bg-white">
      <div className="border-b border-[#eee7da] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#1d2733]">Инспектор на задача</h2>
      </div>
      {!task ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-[#8a94a0]">
          Стартирай задача, за да видиш плана и работата на агентите тук.
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-2 text-sm font-medium text-[#1d2733]">{task.title}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle(task.status)}`}
              >
                {TASK_STATUS_LABELS[task.status]}
              </span>
            </div>
          </div>

          {onControl && <ControlBar status={task.status} onControl={onControl} busy={busy} />}

          {task.plan && (
            <section>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a6f45]">
                План
              </h3>
              {task.planSummary && (
                <p className="mb-2 text-xs text-[#5f6b76]">{task.planSummary}</p>
              )}
              <ol className="space-y-1">
                {task.plan.steps.map((s) => {
                  const run = task.runs.find(
                    (r) => r.agentKey === s.agentKey && r.status !== "running",
                  );
                  const mark =
                    run?.status === "succeeded"
                      ? "✓"
                      : run?.status === "failed"
                        ? "✗"
                        : task.status === "running"
                          ? "⟳"
                          : "·";
                  return (
                    <li key={s.id} className="flex items-start gap-2 text-xs text-[#3d4752]">
                      <span className="w-3 shrink-0 text-center">{mark}</span>
                      <span>
                        <span className="font-medium">{s.id}</span> — {s.agentKey}
                        {s.dependsOn.length > 0 && (
                          <span className="text-[#8a94a0]"> ← {s.dependsOn.join(", ")}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {task.runs.length > 0 && (
            <section>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a6f45]">
                Runs / usage
              </h3>
              <ul className="space-y-1">
                {task.runs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-xs text-[#3d4752]">
                    <span>{r.agentName ?? r.agentKey ?? "—"}</span>
                    <span className="text-[#8a94a0]">
                      {r.usage
                        ? `${r.usage.inputTokens}/${r.usage.outputTokens} tok`
                        : r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {task.events.filter((e) => e.visibility === "user_summary").length > 0 && (
            <section>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a6f45]">
                Събития
              </h3>
              <ul className="space-y-1">
                {task.events
                  .filter((e) => e.visibility === "user_summary")
                  .map((e) => (
                    <li key={e.id} className="text-[11px] text-[#8a94a0]">
                      {e.eventType}
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}

function ControlBar({
  status,
  onControl,
  busy,
}: {
  status: TaskStatus;
  onControl: (action: TaskControlAction, instruction?: string) => void;
  busy: boolean;
}) {
  const [redirectOpen, setRedirectOpen] = useState(false);
  const [redirectText, setRedirectText] = useState("");

  const active = CONTROLLABLE.includes(status);
  const canPause = status === "queued" || status === "planning" || status === "running";
  const canResume = status === "paused";
  const canStop = active;
  const canRetry = status === "failed" || status === "cancelled" || status === "needs_changes";
  const canRedirect = active;

  if (!active && !canRetry) return null;

  const btn =
    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition disabled:opacity-40";

  return (
    <section className="rounded-xl border border-[#eee7da] bg-[#faf8f3] p-2">
      <div className="flex flex-wrap gap-1.5">
        {canPause && (
          <button
            onClick={() => onControl("pause")}
            disabled={busy}
            className={`${btn} border-[#d9d4ca] text-[#1d2733] hover:bg-white`}
          >
            ⏸ Пауза
          </button>
        )}
        {canResume && (
          <button
            onClick={() => onControl("resume")}
            disabled={busy}
            className={`${btn} border-[#2f7d55] bg-[#dcefe4] text-[#2f7d55] hover:brightness-95`}
          >
            ▶ Продължи
          </button>
        )}
        {canStop && (
          <button
            onClick={() => onControl("stop")}
            disabled={busy}
            className={`${btn} border-[#e0b4b4] text-[#a23b3b] hover:bg-white`}
          >
            ⏹ Стоп
          </button>
        )}
        {canRetry && (
          <button
            onClick={() => onControl("retry")}
            disabled={busy}
            className={`${btn} border-[#d9d4ca] text-[#1d2733] hover:bg-white`}
          >
            ↻ Опитай пак
          </button>
        )}
        {canRedirect && (
          <button
            onClick={() => setRedirectOpen((v) => !v)}
            disabled={busy}
            className={`${btn} border-[#d9d4ca] text-[#1d2733] hover:bg-white`}
          >
            ➦ Пренасочи
          </button>
        )}
      </div>

      {redirectOpen && canRedirect && (
        <div className="mt-2">
          <textarea
            value={redirectText}
            onChange={(e) => setRedirectText(e.target.value)}
            rows={2}
            placeholder="Напр. „Направи текста по-професионален и без прекалено рекламни твърдения.“"
            className="w-full resize-none rounded-lg border border-[#d9d4ca] px-2 py-1 text-xs text-[#1d2733] focus:border-[#8a6f45] focus:outline-none"
          />
          <div className="mt-1 flex justify-end gap-1.5">
            <button
              onClick={() => {
                setRedirectOpen(false);
                setRedirectText("");
              }}
              className="rounded-lg px-2 py-1 text-xs text-[#8a94a0] hover:text-[#1d2733]"
            >
              Отказ
            </button>
            <button
              onClick={() => {
                const text = redirectText.trim();
                if (!text) return;
                onControl("redirect", text);
                setRedirectOpen(false);
                setRedirectText("");
              }}
              disabled={busy || !redirectText.trim()}
              className="rounded-lg bg-[#1d2733] px-3 py-1 text-xs font-medium text-white hover:bg-[#2b3947] disabled:opacity-40"
            >
              Изпрати
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
