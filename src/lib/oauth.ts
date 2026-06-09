import "server-only";

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { UserSession } from "@/lib/user-auth";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export const OAUTH_STATE_COOKIE = "brami-oauth-state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export type OAuthProviderId = "google" | "facebook";

type ProviderConfig = {
  id: OAuthProviderId;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  extractIdentity: (profile: unknown) => OAuthIdentity | null;
};

export type OAuthIdentity = {
  providerId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

const providers: Record<OAuthProviderId, ProviderConfig> = {
  google: {
    id: "google",
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extractIdentity(raw) {
      const profile = raw as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      } | null;

      if (!profile?.sub) {
        return null;
      }

      return {
        providerId: profile.sub,
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.picture ?? null,
      };
    },
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    userInfoUrl:
      "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)",
    scope: "email,public_profile",
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
    extractIdentity(raw) {
      const profile = raw as {
        id?: string;
        email?: string;
        name?: string;
        picture?: { data?: { url?: string } };
      } | null;

      if (!profile?.id) {
        return null;
      }

      return {
        providerId: profile.id,
        email: profile.email ?? null,
        name: profile.name ?? null,
        avatarUrl: profile.picture?.data?.url ?? null,
      };
    },
  },
};

export function isSupportedProvider(value: string): value is OAuthProviderId {
  return value === "google" || value === "facebook";
}

export function getProviderConfig(provider: OAuthProviderId) {
  return providers[provider];
}

export function isProviderConfigured(provider: OAuthProviderId) {
  const config = providers[provider];
  return Boolean(
    process.env[config.clientIdEnv] && process.env[config.clientSecretEnv],
  );
}

export function listConfiguredProviders(): OAuthProviderId[] {
  return (Object.keys(providers) as OAuthProviderId[]).filter(
    isProviderConfigured,
  );
}

function getStateSecret() {
  const secret =
    process.env.USER_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "Missing USER_SESSION_SECRET, ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return secret;
}

function signState(value: string) {
  return createHmac("sha256", getStateSecret()).update(value).digest("base64url");
}

export type OAuthStatePayload = {
  nonce: string;
  provider: OAuthProviderId;
  redirectTo: string;
  exp: number;
};

export function createState(provider: OAuthProviderId, redirectTo: string) {
  const payload: OAuthStatePayload = {
    nonce: randomBytes(16).toString("base64url"),
    provider,
    redirectTo,
    exp: Date.now() + OAUTH_STATE_MAX_AGE_SECONDS * 1000,
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signState(encoded);

  return `${encoded}.${signature}`;
}

export function parseState(value: string): OAuthStatePayload | null {
  const [encoded, signature] = value.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = signState(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as OAuthStatePayload;

    if (!payload?.nonce || !payload.provider || !payload.exp) {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  };
}

export function buildAuthorizationUrl(
  provider: OAuthProviderId,
  redirectUri: string,
  state: string,
) {
  const config = providers[provider];
  const clientId = process.env[config.clientIdEnv];

  if (!clientId) {
    throw new Error(`Missing ${config.clientIdEnv}`);
  }

  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);

  if (provider === "google") {
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
  }

  return url.toString();
}

export async function exchangeCodeForToken(
  provider: OAuthProviderId,
  code: string,
  redirectUri: string,
): Promise<string> {
  const config = providers[provider];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing ${config.clientIdEnv} or ${config.clientSecretEnv}`);
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("Token response missing access_token");
  }

  return data.access_token;
}

export async function fetchIdentity(
  provider: OAuthProviderId,
  accessToken: string,
): Promise<OAuthIdentity> {
  const config = providers[provider];

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`User info fetch failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const identity = config.extractIdentity(json);

  if (!identity) {
    throw new Error("Could not extract identity from provider response");
  }

  return identity;
}

function sanitizeUsernameBase(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 24);
}

async function findAvailableUsername(base: string): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const fallback = base && base.length >= 3 ? base : "user";

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate =
      attempt === 0 ? fallback : `${fallback}${randomBytes(2).toString("hex")}`;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check username availability: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }
  }

  return `${fallback}${randomBytes(4).toString("hex")}`;
}

type UserProfileRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  auth_provider: string | null;
  provider_id: string | null;
};

export async function findOrCreateOAuthUser(
  provider: OAuthProviderId,
  identity: OAuthIdentity,
): Promise<UserSession> {
  if (!identity.email) {
    throw new Error("Доставчикът не върна имейл адрес.");
  }

  const supabase = createSupabaseAdminClient();
  const email = identity.email.trim().toLowerCase();

  const { data: byProvider, error: byProviderError } = await supabase
    .from("user_profiles")
    .select("id, username, email, role, auth_provider, provider_id")
    .eq("auth_provider", provider)
    .eq("provider_id", identity.providerId)
    .maybeSingle<UserProfileRow>();

  if (byProviderError) {
    throw new Error(`Failed to look up OAuth profile: ${byProviderError.message}`);
  }

  if (byProvider) {
    return {
      id: byProvider.id,
      username: byProvider.username,
      email: byProvider.email,
      role: byProvider.role,
      exp: Date.now() + SESSION_DURATION_MS,
    };
  }

  const { data: byEmail, error: byEmailError } = await supabase
    .from("user_profiles")
    .select("id, username, email, role, auth_provider, provider_id")
    .eq("email", email)
    .maybeSingle<UserProfileRow>();

  if (byEmailError) {
    throw new Error(`Failed to look up profile by email: ${byEmailError.message}`);
  }

  if (byEmail) {
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        auth_provider: provider,
        provider_id: identity.providerId,
        avatar_url: identity.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", byEmail.id);

    if (updateError) {
      throw new Error(`Failed to link OAuth identity: ${updateError.message}`);
    }

    return {
      id: byEmail.id,
      username: byEmail.username,
      email: byEmail.email,
      role: byEmail.role,
      exp: Date.now() + SESSION_DURATION_MS,
    };
  }

  const usernameBase =
    sanitizeUsernameBase(email.split("@")[0] ?? "") ||
    sanitizeUsernameBase(identity.name ?? "") ||
    "user";
  const username = await findAvailableUsername(usernameBase);
  const id = randomUUID();

  const { data: inserted, error: insertError } = await supabase
    .from("user_profiles")
    .insert({
      id,
      username,
      email,
      password_hash: null,
      role: "user",
      auth_provider: provider,
      provider_id: identity.providerId,
      avatar_url: identity.avatarUrl,
    })
    .select("id, username, email, role")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create profile: ${insertError?.message || "unknown"}`);
  }

  return {
    id: inserted.id,
    username: inserted.username,
    email: inserted.email,
    role: inserted.role,
    exp: Date.now() + SESSION_DURATION_MS,
  };
}

export function resolveOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || url.host;

  const protocol =
    forwardedProto ||
    (host.includes("localhost") || host.startsWith("192.168.") ? "http" : "https");

  return `${protocol}://${host}`;
}

export function buildRedirectUri(origin: string, provider: OAuthProviderId) {
  return `${origin}/api/auth/oauth/${provider}/callback`;
}
