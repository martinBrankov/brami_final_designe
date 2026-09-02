import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { FAQ_COLUMNS, buildUniqueFaqSlug, mapFaqEntry } from "@/lib/faq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminSession();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("faq_entries")
    .select(FAQ_COLUMNS)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: (data ?? []).map(mapFaqEntry) });
}

export async function POST(request: Request) {
  await requireAdminSession();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { question, answer, slug, category, status, position } = body as {
    question?: string;
    answer?: string;
    slug?: string;
    category?: string;
    status?: string;
    position?: number;
  };

  const trimmedQuestion = question?.trim() ?? "";
  if (!trimmedQuestion) {
    return NextResponse.json({ error: "Въпросът е задължителен." }, { status: 400 });
  }

  const nextStatus = status === "published" || status === "pending" ? status : "draft";
  const trimmedAnswer = answer?.trim() ?? "";

  if (nextStatus === "published" && !trimmedAnswer) {
    return NextResponse.json(
      { error: "Не можеш да публикуваш въпрос без отговор." },
      { status: 400 },
    );
  }

  const finalSlug = await buildUniqueFaqSlug(slug?.trim() || trimmedQuestion);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("faq_entries")
    .insert({
      question: trimmedQuestion,
      answer: trimmedAnswer || null,
      slug: finalSlug,
      category: category?.trim() || null,
      status: nextStatus,
      source: "admin",
      position: Number.isFinite(position) ? Number(position) : 0,
      published_at: nextStatus === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
