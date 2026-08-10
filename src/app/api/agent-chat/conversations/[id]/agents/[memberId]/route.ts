import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { removeMember, updateMemberModel } from "@/lib/agent-chat/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; memberId: string }> };

// Change the model an agent member uses for future tasks.
export async function PATCH(request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id, memberId } = await params;
  const body = (await request.json().catch(() => null)) as { modelConfigId?: unknown } | null;
  const modelConfigId = typeof body?.modelConfigId === "string" ? body.modelConfigId : "";

  if (!modelConfigId) {
    return NextResponse.json({ error: "Липсва modelConfigId." }, { status: 400 });
  }

  try {
    await updateMemberModel(id, memberId, modelConfigId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешна смяна на модел.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Remove an (idle) agent member from the conversation.
export async function DELETE(_request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id, memberId } = await params;
  try {
    await removeMember(id, memberId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешно премахване.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
