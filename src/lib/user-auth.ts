import "server-only";

import bcrypt from "bcryptjs";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { syncMarketingSubscriberForProfile } from "@/lib/marketing-subscribers";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const USER_SESSION_COOKIE = "brami-user-session";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const BCRYPT_ROUNDS = 10;

type UserProfileRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  password_hash: string | null;
};

export type UserSession = {
  id: string;
  username: string;
  email: string;
  role: string;
  exp: number;
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  role: string;
};

function getSessionSecret() {
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

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function serializeSession(session: UserSession) {
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function parseSessionValue(value: string): UserSession | null {
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
    const parsed = JSON.parse(decodeBase64Url(payload)) as UserSession;

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

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function verifyUserCredentials(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, email, role, password_hash")
    .or(`username.eq.${normalizedIdentifier},email.eq.${normalizedIdentifier}`)
    .limit(1)
    .maybeSingle<UserProfileRow>();

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  if (!data || !data.password_hash) {
    return { ok: false as const, reason: "invalid_credentials" };
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
    } satisfies UserSession,
  };
}

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
};

export type RegisterResult =
  | { ok: true; session: UserSession }
  | { ok: false; reason: "username_taken" | "email_taken" | "invalid_input"; message: string };

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!username || username.length < 3 || username.length > 32) {
    return { ok: false, reason: "invalid_input", message: "Потребителското име трябва да е между 3 и 32 символа." };
  }

  if (!/^[a-z0-9_.-]+$/.test(username)) {
    return {
      ok: false,
      reason: "invalid_input",
      message: "Потребителското име може да съдържа само латински букви, цифри и . _ -",
    };
  }

  if (!isEmail(email)) {
    return { ok: false, reason: "invalid_input", message: "Невалиден имейл адрес." };
  }

  if (!password || password.length < 8) {
    return { ok: false, reason: "invalid_input", message: "Паролата трябва да е поне 8 символа." };
  }

  const supabase = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("user_profiles")
    .select("id, username, email")
    .or(`username.eq.${username},email.eq.${email}`);

  if (existingError) {
    throw new Error(`Failed to check existing profiles: ${existingError.message}`);
  }

  if (existing && existing.length > 0) {
    const usernameTaken = existing.some((row) => row.username === username);
    const emailTaken = existing.some((row) => row.email === email);

    if (usernameTaken) {
      return { ok: false, reason: "username_taken", message: "Това потребителско име вече е заето." };
    }

    if (emailTaken) {
      return { ok: false, reason: "email_taken", message: "Този имейл вече е регистриран." };
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = randomUUID();

  const { data: inserted, error: insertError } = await supabase
    .from("user_profiles")
    .insert({
      id,
      username,
      email,
      password_hash: passwordHash,
      role: "user",
    })
    .select("id, username, email, role")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create profile: ${insertError?.message || "unknown error"}`);
  }

  return {
    ok: true,
    session: {
      id: inserted.id,
      username: inserted.username,
      email: inserted.email,
      role: inserted.role,
      exp: Date.now() + SESSION_DURATION_MS,
    },
  };
}

export async function getUserSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(USER_SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  return parseSessionValue(value);
}

export function getUserSessionCookieValue(session: UserSession) {
  return serializeSession(session);
}

export function getUserSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  };
}

export function toPublicUser(session: UserSession): PublicUser {
  return {
    id: session.id,
    username: session.username,
    email: session.email,
    role: session.role,
  };
}

export type SpeedyOfficeSnapshot = {
  id: number;
  name: string;
  type?: "OFFICE" | "APT";
  address: {
    fullAddressString?: string;
    siteName?: string;
    postCode?: string;
  };
};

export type PreferredSpeedyLocation = {
  id: string;
  data: SpeedyOfficeSnapshot;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  role: string;
  fullName: string;
  phone: string;
  city: string;
  postalCode: string;
  address: string;
  marketingSubscription: boolean;
  preferredOffice: PreferredSpeedyLocation | null;
  preferredLocker: PreferredSpeedyLocation | null;
  hasPassword: boolean;
  merchantDiscountPercent: number;
};

type UserProfileFullRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  marketing_subscription: boolean | null;
  preferred_office_id: string | null;
  preferred_office_data: SpeedyOfficeSnapshot | null;
  preferred_locker_id: string | null;
  preferred_locker_data: SpeedyOfficeSnapshot | null;
  password_hash: string | null;
  merchant_discount_percent: number | string | null;
};

const PROFILE_SELECT =
  "id, username, email, role, full_name, phone, city, postal_code, address, marketing_subscription, preferred_office_id, preferred_office_data, preferred_locker_id, preferred_locker_data, password_hash, merchant_discount_percent";

function mapLocation(
  id: string | null,
  data: SpeedyOfficeSnapshot | null,
): PreferredSpeedyLocation | null {
  if (!id || !data) {
    return null;
  }
  return { id, data };
}

function mapProfile(row: UserProfileFullRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    fullName: row.full_name ?? "",
    phone: row.phone ?? "",
    city: row.city ?? "",
    postalCode: row.postal_code ?? "",
    address: row.address ?? "",
    marketingSubscription: Boolean(row.marketing_subscription),
    preferredOffice: mapLocation(row.preferred_office_id, row.preferred_office_data),
    preferredLocker: mapLocation(row.preferred_locker_id, row.preferred_locker_data),
    hasPassword: Boolean(row.password_hash),
    merchantDiscountPercent: Number(row.merchant_discount_percent ?? 0),
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle<UserProfileFullRow>();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapProfile(data);
}

export type UpdateUserProfileInput = {
  fullName: string;
  phone: string;
  city: string;
  postalCode: string;
  address: string;
  marketingSubscription: boolean;
  preferredOffice?: PreferredSpeedyLocation | null;
  preferredLocker?: PreferredSpeedyLocation | null;
};

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput,
): Promise<UserProfile> {
  const supabase = createSupabaseAdminClient();

  const updates: Record<string, unknown> = {
    full_name: input.fullName.trim().slice(0, 128),
    phone: input.phone.trim().slice(0, 32),
    city: input.city.trim().slice(0, 64),
    postal_code: input.postalCode.trim().slice(0, 16),
    address: input.address.trim().slice(0, 256),
    marketing_subscription: input.marketingSubscription,
    updated_at: new Date().toISOString(),
  };

  if (input.preferredOffice !== undefined) {
    if (input.preferredOffice === null) {
      updates.preferred_office_id = null;
      updates.preferred_office_data = null;
    } else {
      updates.preferred_office_id = input.preferredOffice.id;
      updates.preferred_office_data = input.preferredOffice.data;
    }
  }

  if (input.preferredLocker !== undefined) {
    if (input.preferredLocker === null) {
      updates.preferred_locker_id = null;
      updates.preferred_locker_data = null;
    } else {
      updates.preferred_locker_id = input.preferredLocker.id;
      updates.preferred_locker_data = input.preferredLocker.data;
    }
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .single<UserProfileFullRow>();

  if (error || !data) {
    throw new Error(`Failed to update profile: ${error?.message || "unknown"}`);
  }

  await syncMarketingSubscriberForProfile({
    userId,
    email: data.email,
    enabled: input.marketingSubscription,
    source: "account-profile",
  });

  return mapProfile(data);
}

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateStrongPassword(password: string): PasswordValidationResult {
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, message: "Паролата трябва да е поне 8 символа." };
  }
  if (password.length > 128) {
    return { ok: false, message: "Паролата е твърде дълга." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "Паролата трябва да съдържа малка буква." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "Паролата трябва да съдържа главна буква." };
  }
  if (!/\d/.test(password)) {
    return { ok: false, message: "Паролата трябва да съдържа цифра." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      ok: false,
      message: "Паролата трябва да съдържа специален символ (напр. ! @ # $ % &).",
    };
  }
  return { ok: true };
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
  const validation = validateStrongPassword(password);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("user_profiles")
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to set password: ${error.message}`);
  }
}
