import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { getArtifact, publishArtifact, resolveApproval } from "@/lib/agent-chat/artifacts";
import { postMessage } from "@/lib/agent-chat/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type Action = "approve" | "reject" | "request_changes" | "publish";
const ACTIONS: Action[] = ["approve", "reject", "request_changes", "publish"];

// Approval + publishing for an artifact. Publishing is a separate permissioned
// step (never automatic): approve first, then publish.
export async function POST(request: Request, { params }: RouteContext) {
  const session = await requireAdminSession();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; comment?: unknown }
    | null;
  const action = body?.action as Action | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Невалидно действие." }, { status: 400 });
  }
  const comment = typeof body?.comment === "string" ? body.comment.trim() : null;

  const artifact = await getArtifact(id);
  if (!artifact) {
    return NextResponse.json({ error: "Artifact не е намерен." }, { status: 404 });
  }

  try {
    if (action === "publish") {
      const { publishedUrl } = await publishArtifact(id);
      if (artifact.conversationId) {
        await postMessage({
          conversationId: artifact.conversationId,
          senderType: "system",
          senderId: null,
          messageType: "text",
          content: `Публикувано: ${publishedUrl}`,
          metadata: { artifactId: id, publishedUrl },
        });
      }
      return NextResponse.json({ ok: true, publishedUrl });
    }

    await resolveApproval({ artifactId: id, userId: session.id, action, comment });
    if (artifact.conversationId) {
      const label =
        action === "approve"
          ? "Одобрено."
          : action === "reject"
            ? "Отхвърлено."
            : `Поискани промени${comment ? `: ${comment}` : "."}`;
      await postMessage({
        conversationId: artifact.conversationId,
        senderType: "system",
        senderId: null,
        messageType: "approval",
        content: `„${artifact.name}" — ${label}`,
        metadata: { artifactId: id, action },
      });
    }
    return NextResponse.json({ ok: true, action });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешно действие.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
