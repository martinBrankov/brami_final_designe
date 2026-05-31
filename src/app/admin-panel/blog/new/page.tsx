import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminBlogEditor } from "@/components/admin-blog-editor";

export const dynamic = "force-dynamic";

export default async function AdminBlogNewPage() {
  const session = await requireAdminSession();

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/blog"
      title="Нова статия"
      description="Създай нова публикация в блога."
    >
      <AdminBlogEditor post={null} />
    </AdminShell>
  );
}
