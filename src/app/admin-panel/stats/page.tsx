import { AdminShell } from "@/components/admin-shell";
import { AdminStats } from "@/components/admin-stats";
import { getAdminOrders, getAdminUsers, getAdminProducts } from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const [session, orders, users, products] = await Promise.all([
    requireAdminSession(),
    getAdminOrders(),
    getAdminUsers(),
    getAdminProducts(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/stats"
      title="Статистики"
      description="Обобщен преглед на приходи, поръчки, потребители и продукти."
    >
      <AdminStats orders={orders} users={users} products={products} />
    </AdminShell>
  );
}
