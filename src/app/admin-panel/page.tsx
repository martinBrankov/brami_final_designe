import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelEntryPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin-panel/products");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#f4efe5_0%,#edf3f5_45%,#fefefe_100%)] px-6 py-12">
      <AdminLoginForm />
    </main>
  );
}
