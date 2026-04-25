import { type NextRequest, NextResponse } from "next/server";

import { searchOffices } from "@/lib/speedy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { query, officeType } = (await request.json()) as {
      query?: string;
      officeType?: "OFFICE" | "APT";
    };
    const offices = await searchOffices(query ?? "", officeType);
    return NextResponse.json({ offices });
  } catch (err) {
    return NextResponse.json(
      { offices: [], error: String(err) },
      { status: 500 },
    );
  }
}
