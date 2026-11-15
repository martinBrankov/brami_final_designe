import { getTranslations } from "next-intl/server";
import { AdminShell } from "@/components/admin-shell";
import { AgentChatApp } from "@/components/agent-chat/agent-chat-app";
import { requireAdminSession } from "@/lib/admin-auth";
import { listConversations } from "@/lib/agent-chat/conversations";
import { getAgents, getModels } from "@/lib/agent-chat/registry";

export const dynamic = "force-dynamic";

export default async function AgentChatPage() {
  const t = await getTranslations("AdminPages");
  const session = await requireAdminSession();

  const [conversations, agents, models] = await Promise.all([
    listConversations(),
    getAgents(),
    getModels(),
  ]);

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/agent-chat"
      title={t("agentChat.title")}
      description={t("agentChat.description")}
    >
      <AgentChatApp initialConversations={conversations} agents={agents} models={models} />
    </AdminShell>
  );
}
