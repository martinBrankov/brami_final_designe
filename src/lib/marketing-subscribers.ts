import "server-only";

import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const MAX_EMAIL_LENGTH = 254;
const MAX_IP_ATTEMPTS_PER_HOUR = 10;
const MAX_EMAIL_ATTEMPTS_PER_HOUR = 4;

export type MarketingSubscriber = {
  id: string;
  email: string;
  source: string;
  userId: string | null;
  subscribedAt: string;
  unsubscribedAt: string | null;
  unsubscribeUrl: string;
  createdAt: string;
  updatedAt: string;
};

type MarketingSubscriberRow = {
  id: string;
  email: string;
  source: string;
  user_id: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeMarketingEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidMarketingEmail(value: string) {
  const email = normalizeMarketingEmail(value);
  return (
    email.length > 0 &&
    email.length <= MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function getMarketingSecret() {
  const secret =
    process.env.MARKETING_UNSUBSCRIBE_SECRET ||
    process.env.USER_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing marketing unsubscribe secret");
  }

  return secret;
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createUnsubscribeToken(email: string) {
  return createHmac("sha256", getMarketingSecret())
    .update(normalizeMarketingEmail(email))
    .digest("base64url");
}

function hashUnsubscribeToken(token: string) {
  return hashValue(token);
}

export function verifyUnsubscribeToken(email: string, token: string) {
  if (!email || !token) {
    return false;
  }

  const expected = Buffer.from(createUnsubscribeToken(email));
  const actual = Buffer.from(token);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const candidate = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return candidate.slice(0, 128);
}

export function hashRequestIdentity(value: string) {
  return hashValue(`${getMarketingSecret()}:${value}`);
}

async function countRecentAttempts({
  column,
  value,
  sinceIso,
}: {
  column: "ip_hash" | "email_hash";
  value: string;
  sinceIso: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("marketing_subscription_attempts")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", sinceIso);

  if (error) {
    throw new Error(`Failed to check subscription attempts: ${error.message}`);
  }

  return count ?? 0;
}

export async function assertMarketingRateLimit({
  email,
  ip,
}: {
  email: string;
  ip: string;
}) {
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const emailHash = hashRequestIdentity(normalizeMarketingEmail(email));
  const ipHash = hashRequestIdentity(ip);

  const [ipAttempts, emailAttempts] = await Promise.all([
    countRecentAttempts({ column: "ip_hash", value: ipHash, sinceIso }),
    countRecentAttempts({ column: "email_hash", value: emailHash, sinceIso }),
  ]);

  if (ipAttempts >= MAX_IP_ATTEMPTS_PER_HOUR || emailAttempts >= MAX_EMAIL_ATTEMPTS_PER_HOUR) {
    return { ok: false as const };
  }

  return { ok: true as const, ipHash, emailHash };
}

export async function recordMarketingAttempt({
  emailHash,
  ipHash,
  action,
}: {
  emailHash: string;
  ipHash: string;
  action: "subscribe" | "unsubscribe";
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("marketing_subscription_attempts").insert({
    email_hash: emailHash,
    ip_hash: ipHash,
    action,
  });

  if (error) {
    throw new Error(`Failed to record subscription attempt: ${error.message}`);
  }
}

export async function subscribeMarketingEmail({
  email,
  source,
  userId = null,
  ipHash = null,
  userAgent = "",
}: {
  email: string;
  source: string;
  userId?: string | null;
  ipHash?: string | null;
  userAgent?: string;
}) {
  const normalizedEmail = normalizeMarketingEmail(email);

  if (!isValidMarketingEmail(normalizedEmail)) {
    throw new Error("Invalid email address.");
  }

  const now = new Date().toISOString();
  const token = createUnsubscribeToken(normalizedEmail);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("marketing_subscribers").upsert(
    {
      email: normalizedEmail,
      source,
      user_id: userId,
      subscribed_at: now,
      unsubscribed_at: null,
      unsubscribe_token_hash: hashUnsubscribeToken(token),
      last_request_ip_hash: ipHash,
      last_user_agent: userAgent.slice(0, 512),
      updated_at: now,
    },
    { onConflict: "email" },
  );

  if (error) {
    throw new Error(`Failed to subscribe email: ${error.message}`);
  }
}

export async function unsubscribeMarketingEmail({
  email,
  userId,
}: {
  email?: string;
  userId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const normalizedEmail = email ? normalizeMarketingEmail(email) : undefined;
  let query = supabase
    .from("marketing_subscribers")
    .update({ unsubscribed_at: now, updated_at: now });

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (normalizedEmail) {
    query = query.eq("email", normalizedEmail);
  } else {
    throw new Error("Missing unsubscribe target.");
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to unsubscribe email: ${error.message}`);
  }

  let profileQuery = supabase
    .from("user_profiles")
    .update({
      marketing_subscription: false,
      updated_at: now,
    });

  if (userId) {
    profileQuery = profileQuery.eq("id", userId);
  } else if (normalizedEmail) {
    profileQuery = profileQuery.ilike("email", normalizedEmail);
  }

  const { error: profileError } = await profileQuery;

  if (profileError) {
    throw new Error(`Failed to update profile marketing status: ${profileError.message}`);
  }
}

export async function syncMarketingSubscriberForProfile({
  userId,
  email,
  enabled,
  source,
}: {
  userId: string;
  email: string;
  enabled: boolean;
  source: string;
}) {
  if (enabled) {
    await subscribeMarketingEmail({ email, userId, source });
    return;
  }

  await unsubscribeMarketingEmail({ email, userId });
}

function mapSubscriber(row: MarketingSubscriberRow, origin: string): MarketingSubscriber {
  const token = createUnsubscribeToken(row.email);
  const url = new URL("/unsubscribe-marketing", origin);
  url.searchParams.set("email", row.email);
  url.searchParams.set("token", token);

  return {
    id: row.id,
    email: row.email,
    source: row.source,
    userId: row.user_id,
    subscribedAt: row.subscribed_at,
    unsubscribedAt: row.unsubscribed_at,
    unsubscribeUrl: url.toString(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMarketingSubscribers(origin: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("marketing_subscribers")
    .select("id, email, source, user_id, subscribed_at, unsubscribed_at, created_at, updated_at")
    .is("unsubscribed_at", null)
    .order("subscribed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch marketing subscribers: ${error.message}`);
  }

  return ((data ?? []) as MarketingSubscriberRow[]).map((row) =>
    mapSubscriber(row, origin),
  );
}

export function createRequestId() {
  return randomUUID();
}
