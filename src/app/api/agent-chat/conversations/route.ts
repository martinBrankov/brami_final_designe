import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createConversation, listConversations } from "@/lib/agent-chat/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminSession();
  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : undefined;

  try {
    const conversation = await createConversation({ title, createdBy: session.id });
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неуспешно създаване на чат.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
