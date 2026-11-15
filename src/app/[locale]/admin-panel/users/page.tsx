import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin-shell";
import { AdminUsersManager } from "@/components/admin-users-manager";
import { isFullAdmin, requireAdminSession } from "@/lib/admin-auth";
import { getAdminUsers } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const t = await getTranslations("AdminPages");
  const [session, users] = await Promise.all([
    requireAdminSession(),
    getAdminUsers(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/users"
      title={t("users.title")}
      description={t("users.description")}
    >
      <AdminUsersManager users={users} canManageMerchant={isFullAdmin(session)} />
    </AdminShell>
  );
}
