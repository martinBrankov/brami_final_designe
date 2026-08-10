import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { getTaskDetail } from "@/lib/agent-chat/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Task detail for the inspector — plan, runs and event timeline. Polled by the
// client while a task is running.
export async function GET(_request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) {
    return NextResponse.json({ error: "Задачата не е намерена." }, { status: 404 });
  }
  return NextResponse.json({ task });
}
