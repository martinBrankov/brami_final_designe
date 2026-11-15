import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelEntryPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin-panel/products");
  }

  redirect("/account");
}
