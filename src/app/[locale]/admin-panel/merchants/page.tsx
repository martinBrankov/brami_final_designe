import { getTranslations } from "next-intl/server";
import { AdminMerchantsManager } from "@/components/admin-merchants-manager";
import { AdminShell } from "@/components/admin-shell";
import { requireFullAdminSession } from "@/lib/admin-auth";
import { listMerchantsForAdmin } from "@/lib/promo-codes";

export const dynamic = "force-dynamic";

export default async function AdminMerchantsPage() {
  const t = await getTranslations("AdminPages");
  const [session, merchants] = await Promise.all([
    requireFullAdminSession(),
    listMerchantsForAdmin(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/merchants"
      title={t("merchants.title")}
      description={t("merchants.description")}
    >
      <AdminMerchantsManager merchants={merchants} />
    </AdminShell>
  );
}
