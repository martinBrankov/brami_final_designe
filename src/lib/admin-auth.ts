import "server-only";

import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const ADMIN_SESSION_COOKIE = "brami-admin-session";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;
const allowedAdminRoles = new Set(["admin", "super_user"]);

type AdminProfileRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  password_hash: string;
};

export type AdminSession = {
  id: string;
  username: string;
  email: string;
  role: string;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY");
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function serializeSession(session: AdminSession) {
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function parseSessionValue(value: string): AdminSession | null {
  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as AdminSession;

    if (!parsed?.id || !parsed.username || !parsed.email || !parsed.role || !parsed.exp) {
      return null;
    }

    if (parsed.exp <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isValidBcryptHash(hash: string) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

export async function verifyAdminCredentials(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, email, role, password_hash")
    .or(`username.eq.${normalizedIdentifier},email.eq.${normalizedIdentifier}`)
    .limit(1)
    .maybeSingle<AdminProfileRow>();

  if (error) {
    throw new Error(`Failed to fetch admin profile: ${error.message}`);
  }

  if (!data || !allowedAdminRoles.has(data.role)) {
    return { ok: false as const, reason: "invalid_credentials" };
  }

  if (!isValidBcryptHash(data.password_hash)) {
    return { ok: false as const, reason: "invalid_hash" };
  }

  const passwordMatches = await bcrypt.compare(password, data.password_hash);

  if (!passwordMatches) {
    return { ok: false as const, reason: "invalid_credentials" };
  }

  return {
    ok: true as const,
    session: {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role,
      exp: Date.now() + SESSION_DURATION_MS,
    } satisfies AdminSession,
  };
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  return parseSessionValue(value);
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session || !allowedAdminRoles.has(session.role)) {
    redirect("/admin-panel");
  }

  return session;
}

export function getAdminSessionCookieValue(session: AdminSession) {
  return serializeSession(session);
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  };
}
