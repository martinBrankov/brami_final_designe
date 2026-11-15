import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin-shell";
import { AdminStats } from "@/components/admin-stats";
import {
  getAdminOrders,
  getAdminUsers,
  getAdminProducts,
  getAdminVisits,
  getAdminVisitors,
} from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const t = await getTranslations("AdminPages");
  const [session, orders, users, products, visits, visitors] = await Promise.all([
    requireAdminSession(),
    getAdminOrders(),
    getAdminUsers(),
    getAdminProducts(),
    getAdminVisits(),
    getAdminVisitors(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/stats"
      title={t("stats.title")}
      description={t("stats.description")}
    >
      <AdminStats
        orders={orders}
        users={users}
        products={products}
        visits={visits}
        visitors={visitors}
      />
    </AdminShell>
  );
}
