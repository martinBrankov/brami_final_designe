import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { AdminShell } from "@/components/admin-shell";
import { AdminBlogList } from "@/components/admin-blog-list";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const session = await requireAdminSession();

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, eyebrow, published, is_featured, published_at, read_time, created_at")
    .order("created_at", { ascending: false });

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/blog"
      title="Блог статии"
      description="Управлявай публикациите в блога — добавяй, редактирай или премахвай статии."
    >
      <AdminBlogList posts={data ?? []} />
    </AdminShell>
  );
}
