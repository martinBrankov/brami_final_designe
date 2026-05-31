"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const orderStatusOptions = [
  "Потвърдена",
  "В обработка",
  "Изпратена",
  "Доставена",
  "Отказана",
] as const;

export function getOrderStatusIcon(status: string) {
  switch (status) {
    case "Потвърдена":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="#cffafe" stroke="#0891b2" strokeWidth="1.5" />
          <path d="M6 10l3 3 5-5" stroke="#0891b2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "В обработка":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="#fef3c7" stroke="#c9a227" strokeWidth="1.5" />
          <path d="M10 6.5v3.5l2 2" stroke="#c9a227" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Изпратена":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="#dbeafe" stroke="#3d73b8" strokeWidth="1.5" />
          <path d="M7 10h6M11 8l2 2-2 2" stroke="#3d73b8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Доставена":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="#d1fae5" stroke="#218a54" strokeWidth="1.5" />
          <path d="M5 11l5-5 5 5v5H5v-5z" stroke="#218a54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 16v-3h4v3" stroke="#218a54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Отказана":
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="#fee2e2" stroke="#b64242" strokeWidth="1.5" />
          <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="#b64242" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="#f3f4f6" stroke="#8c96a0" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="2" fill="#8c96a0" />
        </svg>
      );
  }
}

export function AdminOrderStatusControl({
  orderId,
  status,
  onSaved,
  saveMode = "auto",
}: {
  orderId: string;
  status: string;
  onSaved?: (message: string) => void;
  saveMode?: "auto" | "manual";
}) {
  const router = useRouter();
  const [savedStatus, setSavedStatus] = useState(status);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  async function persistStatus(nextStatus: string) {
    if (nextStatus === savedStatus) {
      return;
    }

    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !result?.ok) {
      onSaved?.(result?.error || "Неуспешна промяна на статуса.");
      setSelectedStatus(savedStatus);
      return;
    }

    setSavedStatus(nextStatus);
    onSaved?.("Статусът на поръчката е записан.");
    startTransition(() => {
      router.refresh();
    });
  }

  function handleStatusChange(nextStatus: string) {
    setSelectedStatus(nextStatus);

    if (saveMode === "auto") {
      void persistStatus(nextStatus);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0">{getOrderStatusIcon(selectedStatus)}</span>
      <select
        value={selectedStatus}
        onChange={(event) => handleStatusChange(event.target.value)}
        disabled={isPending}
        className="h-8 w-[132px] rounded-[8px] border border-[#d9d4ca] bg-[#fcfbf8] px-2 text-xs font-semibold text-[#1d2733] outline-none transition focus:border-[#8a6f45] disabled:cursor-wait disabled:opacity-70"
      >
        {orderStatusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {!orderStatusOptions.includes(status as (typeof orderStatusOptions)[number]) ? (
          <option value={status}>{status}</option>
        ) : null}
      </select>
      {saveMode === "manual" ? (
        <button
          type="button"
          onClick={() => void persistStatus(selectedStatus)}
          disabled={isPending || selectedStatus === savedStatus}
          title="Запази статус"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#1d2733] text-white transition hover:bg-[#2b3847] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isPending
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
        </button>
      ) : null}
    </div>
  );
}
