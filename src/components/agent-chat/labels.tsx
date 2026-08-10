import type { AgentCategory, MemberStatus } from "@/lib/agent-chat/types";

// Bulgarian labels + colour tokens for status/category badges. Kept in one place
// so the roster, timeline and (future) task inspector stay visually consistent.

export const STATUS_LABELS: Record<MemberStatus, string> = {
  idle: "Готов",
  planning: "Планира",
  working: "Работи",
  waiting: "Чака",
  paused: "Пауза",
  failed: "Грешка",
  completed: "Завършен",
};

const STATUS_STYLES: Record<MemberStatus, string> = {
  idle: "bg-[#eef2f4] text-[#5f6b76]",
  planning: "bg-[#e7e0f7] text-[#5b4a8a]",
  working: "bg-[#dcefe4] text-[#2f7d55]",
  waiting: "bg-[#fdf0d8] text-[#8a6f45]",
  paused: "bg-[#e6e9ec] text-[#3d4752]",
  failed: "bg-[#f7dede] text-[#a23b3b]",
  completed: "bg-[#dbe7f7] text-[#2f5c8a]",
};

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  orchestration: "Оркестрация",
  planning: "Планиране",
  content: "Съдържание",
  image: "Изображения",
  ads: "Реклами",
  review: "Ревю",
  publishing: "Публикуване",
  utility: "Помощен",
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  const pulse = status === "working" || status === "planning";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? "animate-pulse" : ""}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
