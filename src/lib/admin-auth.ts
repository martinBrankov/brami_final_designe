import "server-only";

import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

import { getUserProfile, getUserSession } from "@/lib/user-auth";

const ALLOWED_ADMIN_ROLES = new Set(["admin"]);

export type AdminSession = {
  id: string;
  username: string;
  email: string;
  role: string;
  exp: number;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const userSession = await getUserSession();
  if (!userSession) {
    return null;
  }

  // Always trust the current DB role over a stale cookie role.
  const profile = await getUserProfile(userSession.id).catch(() => null);
  const role = profile?.role ?? userSession.role;

  if (!ALLOWED_ADMIN_ROLES.has(role)) {
    return null;
  }

  return {
    id: userSession.id,
    username: userSession.username,
    email: userSession.email,
    role,
    exp: userSession.exp,
  };
}

/** Sends a visitor without admin rights to the login page in their language. */
async function redirectToAccount(): Promise<never> {
  const locale = await getLocale();
  return redirect({ href: "/account", locale: isAppLocale(locale) ? locale : "bg" });
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    return redirectToAccount();
  }
  return session;
}

export function isFullAdmin(session: AdminSession | null | undefined): boolean {
  return Boolean(session && session.role === "admin");
}

export async function requireFullAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return redirectToAccount();
  }
  return session;
}
