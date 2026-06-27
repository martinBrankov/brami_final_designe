import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { generateEditorSuggestion } from "@/lib/ai/agents/editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: Request) {
  await requireAdminSession();

  const body = (await request.json().catch(() => null)) as
    | { postId?: unknown; instruction?: unknown }
    | null;
  const postId = typeof body?.postId === "string" && body.postId.trim() ? body.postId.trim() : null;
  const instruction =
    typeof body?.instruction === "string" && body.instruction.trim()
      ? body.instruction.trim()
      : "Подобри четимостта, структурата и стила.";

  try {
    const suggestion = await generateEditorSuggestion(postId, instruction);
    return NextResponse.json(suggestion);
  } catch (err) {
    console.error("[ai editor] error:", err);
    const message = err instanceof Error ? err.message : "Неуспешно генериране.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
