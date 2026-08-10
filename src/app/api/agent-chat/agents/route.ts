import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { getAgents, getModels } from "@/lib/agent-chat/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Registry read: the agents and models available to add to a conversation.
export async function GET() {
  await requireAdminSession();
  const [agents, models] = await Promise.all([getAgents(), getModels()]);
  return NextResponse.json({ agents, models });
}
