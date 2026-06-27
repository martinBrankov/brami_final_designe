import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { generateMarketingStrategy } from "@/lib/ai/agents/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: Request) {
  await requireAdminSession();

  const body = (await request.json().catch(() => null)) as { instruction?: unknown } | null;
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  if (instruction.length < 5) {
    return NextResponse.json({ error: "Инструкцията трябва да е поне 5 символа." }, { status: 400 });
  }

  try {
    const strategy = await generateMarketingStrategy(instruction);
    return NextResponse.json({ id: strategy.id, title: strategy.title });
  } catch (err) {
    console.error("[ai marketing] error:", err);
    const message = err instanceof Error ? err.message : "Неуспешно генериране.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
