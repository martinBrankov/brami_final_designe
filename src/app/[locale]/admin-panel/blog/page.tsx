import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { AdminShell } from "@/components/admin-shell";
import { AdminBlogList } from "@/components/admin-blog-list";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const t = await getTranslations("AdminPages");
  const session = await requireAdminSession();

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, eyebrow, published, is_featured, show_in_list, published_at, read_time, created_at")
    .order("created_at", { ascending: false });

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/blog"
      title={t("blog.title")}
      description={t("blog.description")}
    >
      <AdminBlogList posts={data ?? []} />
    </AdminShell>
  );
}
