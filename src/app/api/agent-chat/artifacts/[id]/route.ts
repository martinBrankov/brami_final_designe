import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { getArtifact } from "@/lib/agent-chat/artifacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  await requireAdminSession();
  const { id } = await params;
  const artifact = await getArtifact(id);
  if (!artifact) {
    return NextResponse.json({ error: "Artifact не е намерен." }, { status: 404 });
  }
  return NextResponse.json({ artifact });
}
