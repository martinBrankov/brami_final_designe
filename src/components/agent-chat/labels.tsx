import { useTranslations } from "next-intl";

import type { MemberStatus } from "@/lib/agent-chat/types";

// Colour tokens (labels live in messages: AgentChatLabels.status, AgentChat.category) for status/category badges. Kept in one place
// so the roster, timeline and (future) task inspector stay visually consistent.


const STATUS_STYLES: Record<MemberStatus, string> = {
  idle: "bg-[#eef2f4] text-[#5f6b76]",
  planning: "bg-[#e7e0f7] text-[#5b4a8a]",
  working: "bg-[#dcefe4] text-[#2f7d55]",
  waiting: "bg-[#fdf0d8] text-[#8a6f45]",
  paused: "bg-[#e6e9ec] text-[#3d4752]",
  failed: "bg-[#f7dede] text-[#a23b3b]",
  completed: "bg-[#dbe7f7] text-[#2f5c8a]",
};


export function StatusBadge({ status }: { status: MemberStatus }) {
  const t = useTranslations("AgentChatLabels");
  const pulse = status === "working" || status === "planning";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? "animate-pulse" : ""}`} />
      {t(`status.${status}`)}
    </span>
  );
}
