import { after, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { recordIntervention, type ControlAction } from "@/lib/agent-chat/interventions";
import { getTaskContext } from "@/lib/agent-chat/tasks";
import { resumeTask } from "@/lib/agent-chat/orchestrator/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

const ACTIONS: ControlAction[] = ["pause", "resume", "stop", "redirect", "retry"];

// Agent controls (Phase 3). pause/stop/redirect are recorded as interventions and
// consumed by the running orchestrator at the next step boundary (cooperative, no
// queue). resume/retry re-enter execution from the succeeded-step checkpoint via
// after(), so the client can poll progress live.
export async function POST(request: Request, { params }: RouteContext) {
  const session = await requireAdminSession();
  const { id: taskId } = await params;
  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; instruction?: unknown }
    | null;

  const action = body?.action as ControlAction | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Невалидно действие." }, { status: 400 });
  }

  const instruction =
    action === "redirect" && typeof body?.instruction === "string"
      ? body.instruction.trim()
      : null;
  if (action === "redirect" && !instruction) {
    return NextResponse.json({ error: "Пренасочването изисква инструкция." }, { status: 400 });
  }

  const ctx = await getTaskContext(taskId);
  if (!ctx) {
    return NextResponse.json({ error: "Задачата не е намерена." }, { status: 404 });
  }

  try {
    await recordIntervention({ taskId, userId: session.id, action, instruction });

    if (action === "resume" || action === "retry") {
      after(async () => {
        await resumeTask(taskId).catch((err) => {
          console.error("[agent-chat resumeTask] error:", err);
        });
      });
    }

    return NextResponse.json({ ok: true, action });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешно действие.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
