import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin-shell";
import { AdminOrdersManager } from "@/components/admin-orders-manager";
import { getAdminOrders } from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const t = await getTranslations("AdminPages");
  const [session, orders] = await Promise.all([
    requireAdminSession(),
    getAdminOrders(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/orders"
      title={t("orders.title")}
      description={t("orders.description")}
    >
      <AdminOrdersManager orders={orders} />
    </AdminShell>
  );
}
