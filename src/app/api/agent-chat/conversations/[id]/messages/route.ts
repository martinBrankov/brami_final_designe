import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { postMessage } from "@/lib/agent-chat/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Posts a human message into the conversation. Agent/system messages are written
// server-side by the orchestrator (Phase 2), never through this endpoint.
export async function POST(request: Request, { params }: RouteContext) {
  const session = await requireAdminSession();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Съобщението е празно." }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Съобщението е твърде дълго (макс 4000)." }, { status: 400 });
  }

  try {
    const message = await postMessage({
      conversationId: id,
      senderType: "user",
      senderId: session.id,
      messageType: "text",
      content,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешно изпращане.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
