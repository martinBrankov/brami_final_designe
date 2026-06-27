import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Reject (or otherwise update the status of) an editor suggestion.
export async function PATCH(request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = typeof body?.status === "string" ? body.status : "";
  if (!["pending", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Невалиден статус." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("ai_editor_suggestions")
    .update({ status })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("ai_editor_suggestions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
