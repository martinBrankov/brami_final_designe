import { headers } from "next/headers";

import { AdminMarketingSubscribersManager } from "@/components/admin-marketing-subscribers-manager";
import { AdminShell } from "@/components/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth";
import { getMarketingSubscribers } from "@/lib/marketing-subscribers";

export const dynamic = "force-dynamic";

async function resolveOrigin() {
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");

  if (host) {
    const protocol =
      forwardedProto || (host.includes("localhost") || host.startsWith("192.168.") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "https://brami.shop";
}

export default async function AdminMarketingPage() {
  const [session, origin] = await Promise.all([requireAdminSession(), resolveOrigin()]);
  const subscribers = await getMarketingSubscribers(origin);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/marketing"
      title="Маркетинг имейли"
      description="Активна колекция от абонати за рекламни и маркетинг имейл кампании."
    >
      <AdminMarketingSubscribersManager subscribers={subscribers} />
    </AdminShell>
  );
}
