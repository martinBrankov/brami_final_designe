import { NextResponse } from "next/server";

import { submitFaqQuestion } from "@/lib/faq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Невалидна заявка." }, { status: 400 });
  }

  try {
    const result = await submitFaqQuestion(request, {
      question: body.question,
      name: body.name,
      email: body.email,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("Failed to store FAQ question", error);
    return NextResponse.json(
      { error: "Не успяхме да запишем въпроса. Опитай отново след малко." },
      { status: 500 },
    );
  }
}
