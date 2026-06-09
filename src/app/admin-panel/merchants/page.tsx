import { AdminMerchantsManager } from "@/components/admin-merchants-manager";
import { AdminShell } from "@/components/admin-shell";
import { requireFullAdminSession } from "@/lib/admin-auth";
import { listMerchantsForAdmin } from "@/lib/promo-codes";

export const dynamic = "force-dynamic";

export default async function AdminMerchantsPage() {
  const [session, merchants] = await Promise.all([
    requireFullAdminSession(),
    listMerchantsForAdmin(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/merchants"
      title="Търговци"
      description="Преглед на търговците, техните промо кодове, направените поръчки през тях и натрупаните комисиони."
    >
      <AdminMerchantsManager merchants={merchants} />
    </AdminShell>
  );
}
