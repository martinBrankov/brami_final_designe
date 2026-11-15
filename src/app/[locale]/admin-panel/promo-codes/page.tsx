import { getTranslations } from "next-intl/server";
import { AdminPromoCodesManager } from "@/components/admin-promo-codes-manager";
import { AdminShell } from "@/components/admin-shell";
import { requireFullAdminSession } from "@/lib/admin-auth";
import { listMerchants, listPromoCodes } from "@/lib/promo-codes";

export const dynamic = "force-dynamic";

export default async function AdminPromoCodesPage() {
  const t = await getTranslations("AdminPages");
  const [session, codes, merchants] = await Promise.all([
    requireFullAdminSession(),
    listPromoCodes(),
    listMerchants(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/promo-codes"
      title={t("promoCodes.title")}
      description={t("promoCodes.description")}
    >
      <AdminPromoCodesManager initialCodes={codes} merchants={merchants} />
    </AdminShell>
  );
}
