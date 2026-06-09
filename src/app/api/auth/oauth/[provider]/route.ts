import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildAuthorizationUrl,
  buildRedirectUri,
  createState,
  getStateCookieOptions,
  isProviderConfigured,
  isSupportedProvider,
  OAUTH_STATE_COOKIE,
  resolveOrigin,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function safeRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }
  return value;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { provider } = await params;

  if (!isSupportedProvider(provider)) {
    return NextResponse.json({ error: "Неподдържан доставчик." }, { status: 400 });
  }

  if (!isProviderConfigured(provider)) {
    return NextResponse.json(
      { error: `Доставчикът ${provider} не е конфигуриран.` },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const redirectTo = safeRedirectTarget(url.searchParams.get("redirect"));
  const origin = resolveOrigin(request);
  const redirectUri = buildRedirectUri(origin, provider);
  const state = createState(provider, redirectTo);

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, getStateCookieOptions());

  const authorizationUrl = buildAuthorizationUrl(provider, redirectUri, state);

  return NextResponse.redirect(authorizationUrl);
}
