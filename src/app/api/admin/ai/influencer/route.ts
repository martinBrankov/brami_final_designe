import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { generateSocialPosts } from "@/lib/ai/agents/influencer";

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
    const posts = await generateSocialPosts(instruction);
    return NextResponse.json({ count: posts.length, posts });
  } catch (err) {
    console.error("[ai influencer] error:", err);
    const message = err instanceof Error ? err.message : "Неуспешно генериране.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
