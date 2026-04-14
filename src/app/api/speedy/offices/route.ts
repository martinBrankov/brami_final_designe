import { type NextRequest, NextResponse } from "next/server";

import { searchOffices } from "@/lib/speedy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { query } = (await request.json()) as { query?: string };
    const offices = await searchOffices(query ?? "");
    return NextResponse.json({ offices });
  } catch (err) {
    return NextResponse.json(
      { offices: [], error: String(err) },
      { status: 500 },
    );
  }
}
