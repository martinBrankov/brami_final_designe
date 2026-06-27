import { AdminShell } from "@/components/admin-shell";
import { AdminAiDashboard } from "@/components/admin-ai-dashboard";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  getCampaigns,
  getEditorSuggestions,
  getMarketingStrategies,
  getSocialPosts,
} from "@/lib/ai/marketing-data";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const session = await requireAdminSession();

  const [campaigns, socialPosts, strategies, suggestions] = await Promise.all([
    getCampaigns(),
    getSocialPosts(),
    getMarketingStrategies(),
    getEditorSuggestions(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/ai"
      title="AI агенти"
      description="Мениджър, инфлуенсър, редактор и маркетинг специалист — генерират чернови, които одобряваш ти."
    >
      <AdminAiDashboard
        campaigns={campaigns}
        socialPosts={socialPosts}
        strategies={strategies}
        suggestions={suggestions}
      />
    </AdminShell>
  );
}
