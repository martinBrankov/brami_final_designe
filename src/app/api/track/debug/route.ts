import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import {
  geoFromVercelHeaders,
  getClientIp,
  isPrivateOrInvalidIp,
  resolveGeo,
} from "@/lib/visit-geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKED_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-vercel-forwarded-for",
  "x-vercel-ip-country",
  "x-vercel-ip-country-region",
  "x-vercel-ip-city",
  "x-vercel-ip-latitude",
  "x-vercel-ip-longitude",
  "fly-client-ip",
  "x-real-ip",
  "x-client-ip",
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-forwarded-host",
  "host",
  "user-agent",
];

export async function GET(request: Request) {
  // Gate behind admin session — output exposes IP and could be sensitive.
  await requireAdminSession();

  const { ip, source: ipSource } = getClientIp(request.headers);
  const isPrivate = isPrivateOrInvalidIp(ip);
  const vercelGeo = geoFromVercelHeaders(request.headers);
  const resolvedGeo = await resolveGeo(request.headers, ip);

  const seenHeaders: Record<string, string | null> = {};
  for (const name of TRACKED_HEADERS) {
    seenHeaders[name] = request.headers.get(name);
  }

  return NextResponse.json(
    {
      detectedIp: ip,
      ipSource,
      isPrivateOrInvalid: isPrivate,
      vercelGeoFromHeaders: vercelGeo,
      resolvedGeo,
      headers: seenHeaders,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
