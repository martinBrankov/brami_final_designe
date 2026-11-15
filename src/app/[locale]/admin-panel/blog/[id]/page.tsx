import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { AdminShell } from "@/components/admin-shell";
import { AdminBlogEditor } from "@/components/admin-blog-editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminBlogEditPage({ params }: Props) {
  const t = await getTranslations("AdminPages");
  const { id } = await params;
  const [session] = await Promise.all([requireAdminSession()]);

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*, blog_blocks(*)")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const sortedBlocks = ((data.blog_blocks ?? []) as Array<{
    id: string;
    type: string;
    content: string | null;
    position: number;
  }>).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/blog"
      title={t("blogEdit.title", { title: data.title })}
      description={t("blogEdit.description")}
    >
      <AdminBlogEditor post={{ ...data, blog_blocks: sortedBlocks }} />
    </AdminShell>
  );
}
