import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { FAQ_COLUMNS, mapFaqEntry } from "@/lib/faq";
import { AdminShell } from "@/components/admin-shell";
import { AdminFaqManager } from "@/components/admin-faq-manager";

export const dynamic = "force-dynamic";

export default async function AdminFaqPage() {
  const session = await requireAdminSession();

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("faq_entries")
    .select(FAQ_COLUMNS)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/faq"
      title="Често задавани въпроси"
      description="Отговаряй на въпросите от клиенти, добавяй нови и публикувай ги на страницата с ЧЗВ."
    >
      <AdminFaqManager entries={(data ?? []).map(mapFaqEntry)} />
    </AdminShell>
  );
}
