import { AdminProductsManager } from "@/components/admin-products-manager";
import { AdminShell } from "@/components/admin-shell";
import { getAdminProducts } from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [session, products] = await Promise.all([
    requireAdminSession(),
    getAdminProducts(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/products"
      title="Продукти"
      description="Редакция на продуктовия каталог в Supabase. Записите променят директно таблиците products, product_categories, product_audiences, product_images, product_highlights и related_products."
    >
      <AdminProductsManager products={products} />
    </AdminShell>
  );
}
