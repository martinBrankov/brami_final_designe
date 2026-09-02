import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { FAQ_COLUMNS, buildUniqueFaqSlug, mapFaqEntry } from "@/lib/faq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("faq_entries")
    .select(FAQ_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ entry: mapFaqEntry(data) });
}

export async function PUT(request: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
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

  const supabase = createSupabaseAdminClient();
  const { data: current, error: loadErr } = await supabase
    .from("faq_entries")
    .select("status, published_at")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextStatus =
    status === "published" || status === "pending" || status === "draft" ? status : "draft";
  const trimmedAnswer = answer?.trim() ?? "";

  if (nextStatus === "published" && !trimmedAnswer) {
    return NextResponse.json(
      { error: "Не можеш да публикуваш въпрос без отговор." },
      { status: 400 },
    );
  }

  const finalSlug = await buildUniqueFaqSlug(slug?.trim() || trimmedQuestion, id);

  const { error } = await supabase
    .from("faq_entries")
    .update({
      question: trimmedQuestion,
      answer: trimmedAnswer || null,
      slug: finalSlug,
      category: category?.trim() || null,
      status: nextStatus,
      position: Number.isFinite(position) ? Number(position) : 0,
      published_at:
        nextStatus === "published"
          ? (current.published_at ?? new Date().toISOString())
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[faq PUT] update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Quick toggles from the list view — publish / unpublish and reordering. */
export async function PATCH(request: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ("status" in body) {
    const nextStatus = body.status;
    if (nextStatus !== "pending" && nextStatus !== "draft" && nextStatus !== "published") {
      return NextResponse.json({ error: "Невалиден статус." }, { status: 400 });
    }

    const { data: current, error: loadErr } = await supabase
      .from("faq_entries")
      .select("answer, slug, question, published_at")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (nextStatus === "published") {
      if (!current.answer?.trim()) {
        return NextResponse.json(
          { error: "Добави отговор преди да публикуваш въпроса." },
          { status: 400 },
        );
      }
      updates.slug = current.slug ?? (await buildUniqueFaqSlug(current.question, id));
      updates.published_at = current.published_at ?? new Date().toISOString();
    } else {
      updates.published_at = null;
    }

    updates.status = nextStatus;
  }

  if ("position" in body) {
    updates.position = Number(body.position) || 0;
  }

  const { error } = await supabase.from("faq_entries").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  await requireAdminSession();

  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("faq_entries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
