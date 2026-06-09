import { AdminShell } from "@/components/admin-shell";
import { AdminUsersManager } from "@/components/admin-users-manager";
import { isFullAdmin, requireAdminSession } from "@/lib/admin-auth";
import { getAdminUsers } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([
    requireAdminSession(),
    getAdminUsers(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/users"
      title="Потребители"
      description="Базово управление на user_profiles. Тук можеш да редактираш контактните данни, адреса, ролята и marketing subscription статуса."
    >
      <AdminUsersManager users={users} canManageMerchant={isFullAdmin(session)} />
    </AdminShell>
  );
}
