import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { getConversation } from "@/lib/agent-chat/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: "Чатът не е намерен." }, { status: 404 });
  }
  return NextResponse.json({ conversation });
}
