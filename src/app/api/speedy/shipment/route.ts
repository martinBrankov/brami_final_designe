import { type NextRequest, NextResponse } from "next/server";

import { createShipment, type SpeedyShipmentInput } from "@/lib/speedy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as SpeedyShipmentInput;
    const result = await createShipment(input);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { waybill: null, error: String(err) },
      { status: 500 },
    );
  }
}
