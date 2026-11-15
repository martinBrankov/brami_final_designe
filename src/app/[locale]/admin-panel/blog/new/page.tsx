import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminBlogEditor } from "@/components/admin-blog-editor";

export const dynamic = "force-dynamic";

export default async function AdminBlogNewPage() {
  const t = await getTranslations("AdminPages");
  const session = await requireAdminSession();

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/blog"
      title={t("blogNew.title")}
      description={t("blogNew.description")}
    >
      <AdminBlogEditor post={null} />
    </AdminShell>
  );
}
