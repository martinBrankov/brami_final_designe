import { after, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { postMessage } from "@/lib/agent-chat/conversations";
import { createTask } from "@/lib/agent-chat/tasks";
import { runTask } from "@/lib/agent-chat/orchestrator/orchestrator";
import { runArticleTask } from "@/lib/agent-chat/orchestrator/article";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

// Starts a task from an instruction: records the user's message, creates the task
// and kicks off the orchestrator in the background (after the response is sent)
// so the client can poll task status live. Durable queueing lands in Phase 3.
export async function POST(request: Request, { params }: RouteContext) {
  const session = await requireAdminSession();
  const { id: conversationId } = await params;
  const body = (await request.json().catch(() => null)) as
    | { instruction?: unknown; taskType?: unknown }
    | null;
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  const isArticle = body?.taskType === "article";

  if (!instruction) {
    return NextResponse.json({ error: "Инструкцията е празна." }, { status: 400 });
  }
  if (instruction.length > 4000) {
    return NextResponse.json({ error: "Инструкцията е твърде дълга (макс 4000)." }, { status: 400 });
  }

  try {
    await postMessage({
      conversationId,
      senderType: "user",
      senderId: session.id,
      messageType: "text",
      content: instruction,
    });
    const taskId = await createTask({
      conversationId,
      instruction,
      createdBy: session.id,
      taskType: isArticle ? "article" : "generic",
    });

    after(async () => {
      const run = isArticle
        ? runArticleTask({ taskId, conversationId, instruction })
        : runTask({ taskId, conversationId, instruction });
      await run.catch((err) => {
        console.error("[agent-chat task] error:", err);
      });
    });

    return NextResponse.json({ taskId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешно стартиране на задача.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
