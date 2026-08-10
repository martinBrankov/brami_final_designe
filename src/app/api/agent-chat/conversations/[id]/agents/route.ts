import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { addAgentToConversation } from "@/lib/agent-chat/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Adds an agent (with an optional chosen model config) to the conversation.
export async function POST(request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { agentId?: unknown; modelConfigId?: unknown }
    | null;

  const agentId = typeof body?.agentId === "string" ? body.agentId : "";
  const modelConfigId =
    typeof body?.modelConfigId === "string" && body.modelConfigId ? body.modelConfigId : null;

  if (!agentId) {
    return NextResponse.json({ error: "Липсва agentId." }, { status: 400 });
  }

  try {
    const member = await addAgentToConversation(id, agentId, modelConfigId);
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешно добавяне на агент.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
