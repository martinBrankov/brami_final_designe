import { AdminPromoCodesManager } from "@/components/admin-promo-codes-manager";
import { AdminShell } from "@/components/admin-shell";
import { requireFullAdminSession } from "@/lib/admin-auth";
import { listMerchants, listPromoCodes } from "@/lib/promo-codes";

export const dynamic = "force-dynamic";

export default async function AdminPromoCodesPage() {
  const [session, codes, merchants] = await Promise.all([
    requireFullAdminSession(),
    listPromoCodes(),
    listMerchants(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/promo-codes"
      title="Промо кодове"
      description="Създавай и управлявай промо кодове, които носят отстъпка на клиентите и комисиона на търговеца."
    >
      <AdminPromoCodesManager initialCodes={codes} merchants={merchants} />
    </AdminShell>
  );
}
