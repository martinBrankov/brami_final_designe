import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { generateAndSaveBlogDraft } from "@/lib/blog-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// AI generation can take 20-40s with longer articles.
export const maxDuration = 60;

export async function POST(request: Request) {
  await requireAdminSession();

  const body = (await request.json().catch(() => null)) as { topic?: unknown } | null;
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  if (!topic || topic.length < 3) {
    return NextResponse.json({ error: "Темата трябва да е поне 3 символа." }, { status: 400 });
  }
  if (topic.length > 500) {
    return NextResponse.json({ error: "Темата е твърде дълга (макс 500 символа)." }, { status: 400 });
  }

  try {
    const result = await generateAndSaveBlogDraft({ topic });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[blog generate] error:", err);
    const message = err instanceof Error ? err.message : "Неуспешно генериране.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
