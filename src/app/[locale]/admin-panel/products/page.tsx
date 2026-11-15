import { getTranslations } from "next-intl/server";
import { AdminProductsManager } from "@/components/admin-products-manager";
import { AdminShell } from "@/components/admin-shell";
import { getAdminProducts } from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const t = await getTranslations("AdminPages");
  const [session, products] = await Promise.all([
    requireAdminSession(),
    getAdminProducts(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/products"
      title={t("products.title")}
      description={t("products.description")}
    >
      <AdminProductsManager products={products} />
    </AdminShell>
  );
}
