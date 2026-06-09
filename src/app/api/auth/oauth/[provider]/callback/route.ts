import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildRedirectUri,
  exchangeCodeForToken,
  fetchIdentity,
  findOrCreateOAuthUser,
  getProviderConfig,
  isSupportedProvider,
  OAUTH_STATE_COOKIE,
  parseState,
  resolveOrigin,
} from "@/lib/oauth";
import {
  getUserSessionCookieOptions,
  getUserSessionCookieValue,
  USER_SESSION_COOKIE,
} from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function errorRedirect(origin: string, code: string, detail?: string) {
  const target = new URL("/account", origin);
  target.searchParams.set("auth_error", code);
  if (detail) {
    target.searchParams.set("auth_detail", detail.slice(0, 300));
  }
  return NextResponse.redirect(target);
}

export async function GET(request: Request, { params }: RouteContext) {
  const { provider } = await params;
  const origin = resolveOrigin(request);

  if (!isSupportedProvider(provider)) {
    return errorRedirect(origin, "unsupported_provider");
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  if (error) {
    return errorRedirect(origin, error);
  }

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  if (!code || !stateParam) {
    return errorRedirect(origin, "missing_params");
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!storedState || storedState !== stateParam) {
    return errorRedirect(origin, "invalid_state");
  }

  const statePayload = parseState(stateParam);

  if (!statePayload || statePayload.provider !== provider) {
    return errorRedirect(origin, "invalid_state");
  }

  try {
    getProviderConfig(provider);
    const redirectUri = buildRedirectUri(origin, provider);
    const accessToken = await exchangeCodeForToken(provider, code, redirectUri);
    const identity = await fetchIdentity(provider, accessToken);
    const session = await findOrCreateOAuthUser(provider, identity);

    cookieStore.set(
      USER_SESSION_COOKIE,
      getUserSessionCookieValue(session),
      getUserSessionCookieOptions(),
    );

    const target = new URL(statePayload.redirectTo || "/account", origin);
    return NextResponse.redirect(target);
  } catch (err) {
    console.error("OAuth callback failed", err);
    const detail = err instanceof Error ? err.message : String(err);
    return errorRedirect(origin, "oauth_failed", detail);
  }
}
