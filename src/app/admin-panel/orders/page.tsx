import { AdminShell } from "@/components/admin-shell";
import { AdminOrdersManager } from "@/components/admin-orders-manager";
import { getAdminOrders } from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const [session, orders] = await Promise.all([
    requireAdminSession(),
    getAdminOrders(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/orders"
      title="Поръчки"
      description="Списък за следене и смяна на статус. Пълните данни са в детайлната страница на всяка поръчка."
    >
      <AdminOrdersManager orders={orders} />
    </AdminShell>
  );
}
