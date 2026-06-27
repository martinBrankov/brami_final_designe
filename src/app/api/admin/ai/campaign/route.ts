import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { generateCampaign } from "@/lib/ai/agents/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: Request) {
  const session = await requireAdminSession();

  const body = (await request.json().catch(() => null)) as { goal?: unknown } | null;
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";
  if (goal.length < 5) {
    return NextResponse.json({ error: "Целта трябва да е поне 5 символа." }, { status: 400 });
  }
  if (goal.length > 1000) {
    return NextResponse.json({ error: "Целта е твърде дълга (макс 1000 символа)." }, { status: 400 });
  }

  try {
    const result = await generateCampaign(goal, { source: "manual", createdBy: session.id });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai campaign] error:", err);
    const message = err instanceof Error ? err.message : "Неуспешна кампания.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
