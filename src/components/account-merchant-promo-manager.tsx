"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { PromoCodeRecord } from "@/lib/promo-codes";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateRandomCode(exclude: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let candidate = "";
    for (let i = 0; i < 5; i += 1) {
      candidate += CODE_CHARS.charAt(
        Math.floor(Math.random() * CODE_CHARS.length),
      );
    }
    if (!exclude.has(candidate)) {
      return candidate;
    }
  }
  return "";
}

type Feedback = { kind: "success" | "error"; message: string } | null;

export function AccountMerchantPromoManager({
  initialCodes,
  poolPercent,
}: {
  initialCodes: PromoCodeRecord[];
  poolPercent: number;
}) {
  const router = useRouter();
  const [codes, setCodes] = useState<PromoCodeRecord[]>(initialCodes);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState<number>(poolPercent);
  const [newCommission, setNewCommission] = useState<number>(0);

  const newRemaining = poolPercent - (newDiscount + newCommission);
  const newOverflow = newRemaining < -1e-9;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function createCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (newOverflow) {
      setFeedback({
        kind: "error",
        message: `Сборът надвишава общия пул от ${poolPercent}%.`,
      });
      return;
    }

    const response = await fetch("/api/account/merchant/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        discountPercent: newDiscount,
        commissionPercent: newCommission,
        isActive: true,
      }),
    });

    const result = (await response.json().catch(() => null)) as
      | { code?: PromoCodeRecord; error?: string }
      | null;

    if (!response.ok || !result?.code) {
      setFeedback({ kind: "error", message: result?.error || "Грешка при създаване." });
      return;
    }

    setCodes((current) => [result.code as PromoCodeRecord, ...current]);
    setNewCode("");
    setNewDiscount(poolPercent);
    setNewCommission(0);
    setFeedback({ kind: "success", message: "Кодът е създаден." });
    refresh();
  }

  // Edit feedback is surfaced inline in the row (not in the top create form).
  async function patchCode(
    id: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch(`/api/account/merchant/promo-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => null)) as
      | { code?: PromoCodeRecord; error?: string }
      | null;

    if (!response.ok || !result?.code) {
      return { ok: false, error: result?.error || "Грешка при запис." };
    }
    setCodes((current) =>
      current.map((item) => (item.id === id ? (result.code as PromoCodeRecord) : item)),
    );
    refresh();
    return { ok: true };
  }

  async function deleteCode(id: string) {
    if (!confirm("Сигурен ли си, че искаш да изтриеш този код?")) return;

    const response = await fetch(`/api/account/merchant/promo-codes/${id}`, {
      method: "DELETE",
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !result?.ok) {
      setFeedback({ kind: "error", message: result?.error || "Грешка при изтриване." });
      return;
    }

    setCodes((current) => current.filter((item) => item.id !== id));
    setFeedback({ kind: "success", message: "Кодът е изтрит." });
    refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={createCode}
        className="rounded-[18px] border border-[#e6dcef] bg-white p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
          Нов промо код
        </p>
        <p className="mt-1 text-sm text-[#6b587f]">
          Разпредели общия си пул от{" "}
          <span className="font-semibold text-[#432855]">{poolPercent}%</span> между
          отстъпка за клиента и твой дивидент.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#432855]">Код</span>
            <div className="flex gap-2">
              <input
                value={newCode}
                onChange={(event) =>
                  setNewCode(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9%]/g, "")
                      .slice(0, 5),
                  )
                }
                placeholder="MB05%"
                className="h-11 w-full rounded-[16px] border border-[#d9cfe2] bg-[#fcfbfd] px-4 font-mono uppercase tracking-[0.16em]"
                required
                minLength={5}
                maxLength={5}
                pattern="[A-Z0-9%]{5}"
                title="5 символа: A-Z, 0-9, %"
              />
              <button
                type="button"
                onClick={() => {
                  const existing = new Set(codes.map((item) => item.code));
                  const candidate = generateRandomCode(existing);
                  if (candidate) {
                    setNewCode(candidate);
                    setFeedback(null);
                  } else {
                    setFeedback({
                      kind: "error",
                      message: "Не успях да генерирам уникален код, опитай ръчно.",
                    });
                  }
                }}
                title="Генерирай случаен код"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-[16px] border border-[#d9cfe2] bg-white px-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#432855] transition hover:bg-[#f8f4fc]"
              >
                Генерирай
              </button>
            </div>
            <span className="mt-1 block text-xs text-[#8f72a7]">
              Точно 5 символа (A–Z, 0–9, %).
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#432855]">
              Отстъпка за клиента (%)
            </span>
            <input
              type="number"
              min={0}
              max={poolPercent}
              step={0.5}
              value={newDiscount}
              onChange={(event) => setNewDiscount(Number(event.target.value))}
              className="h-11 w-full rounded-[16px] border border-[#d9cfe2] bg-[#fcfbfd] px-4"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#432855]">
              Твой дивидент (%)
            </span>
            <input
              type="number"
              min={0}
              max={poolPercent}
              step={0.5}
              value={newCommission}
              onChange={(event) => setNewCommission(Number(event.target.value))}
              className="h-11 w-full rounded-[16px] border border-[#d9cfe2] bg-[#fcfbfd] px-4"
            />
          </label>

          <div className="block">
            <span className="mb-2 block text-sm font-medium text-[#432855]">
              Остатък от пула
            </span>
            <p
              className={`flex h-11 items-center rounded-[16px] border px-4 text-sm font-semibold ${
                newOverflow
                  ? "border-[#e8c7c7] bg-[#fff6f6] text-[#9a3f3f]"
                  : "border-[#cce4d3] bg-[#f3faf4] text-[#2e6b3a]"
              }`}
            >
              {newRemaining.toFixed(1)}%
            </p>
          </div>
        </div>

        {feedback ? (
          <p
            className={`mt-4 text-sm font-medium ${
              feedback.kind === "success" ? "text-[#2e6b3a]" : "text-[#9a3f3f]"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={isPending || poolPercent <= 0 || newOverflow}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Създай код
          </button>
        </div>
      </form>

      {codes.length === 0 ? (
        <p className="rounded-[18px] border border-[#ece3f2] bg-[#faf7fc] px-4 py-4 text-sm text-[#6b587f]">
          Все още нямаш промо кодове. Създай първия си код по-горе.
        </p>
      ) : (
        <ul className="space-y-3">
          {codes.map((item) => (
            <PromoCodeRow
              key={item.id}
              item={item}
              poolPercent={poolPercent}
              onSave={patchCode}
              onDelete={deleteCode}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PromoCodeRow({
  item,
  poolPercent,
  onSave,
  onDelete,
}: {
  item: PromoCodeRecord;
  poolPercent: number;
  onSave: (
    id: string,
    body: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discount, setDiscount] = useState(item.discountPercent);
  const [commission, setCommission] = useState(item.commissionPercent);
  const [active, setActive] = useState(item.isActive);

  function startEdit() {
    setDiscount(item.discountPercent);
    setCommission(item.commissionPercent);
    setActive(item.isActive);
    setError(null);
    setEditing(true);
  }

  const draftRemaining = poolPercent - (discount + commission);
  const draftOverflow = draftRemaining < -1e-9;
  const savedRemaining = poolPercent - (item.discountPercent + item.commissionPercent);
  const savedOverflow = savedRemaining < -1e-9;

  async function save() {
    if (draftOverflow) return;
    setSaving(true);
    setError(null);
    const result = await onSave(item.id, {
      discountPercent: discount,
      commissionPercent: commission,
      isActive: active,
    });
    setSaving(false);
    if (result.ok) {
      setEditing(false);
    } else {
      setError(result.error || "Грешка при запис.");
    }
  }

  if (!editing) {
    return (
      <li className="grid gap-3 rounded-[18px] border border-[#e6dcef] bg-white p-4 lg:grid-cols-[110px_1fr_1fr_90px_110px_180px] lg:items-center">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
            Код
          </span>
          <p className="mt-1 font-mono text-lg font-semibold tracking-[0.08em] text-[#432855]">
            {item.code}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
            Отстъпка за клиента
          </span>
          <p className="mt-1 text-sm font-semibold text-[#432855]">
            {item.discountPercent}%
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
            Твой дивидент
          </span>
          <p className="mt-1 text-sm font-semibold text-[#432855]">
            {item.commissionPercent}%
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
            Остатък
          </span>
          <p
            className={`mt-1 text-sm font-semibold ${
              savedOverflow ? "text-[#9a3f3f]" : "text-[#432855]"
            }`}
          >
            {savedRemaining.toFixed(1)}%
          </p>
        </div>
        <div className="flex items-center">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
              item.isActive
                ? "bg-[#f3faf4] text-[#2e6b3a]"
                : "bg-[#fff6f6] text-[#9a3f3f]"
            }`}
          >
            {item.isActive ? "Активен" : "Неактивен"}
          </span>
        </div>
        <div className="flex items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#d9cfe2] px-3 text-xs font-semibold text-[#432855] transition hover:bg-[#f8f4fc]"
          >
            Редактирай
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#e8c7c7] px-3 text-xs font-semibold text-[#9a3f3f] transition hover:bg-[#fff6f6]"
          >
            Изтрий
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="grid gap-3 rounded-[18px] border border-[#c8a3d4] bg-[#fcf9fe] p-4 lg:grid-cols-[110px_1fr_1fr_90px_110px_180px] lg:items-end">
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
          Код
        </span>
        <p className="mt-1 font-mono text-lg font-semibold tracking-[0.08em] text-[#432855]">
          {item.code}
        </p>
      </div>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
          Отстъпка за клиента %
        </span>
        <input
          type="number"
          min={0}
          max={poolPercent}
          step={0.5}
          value={discount}
          onChange={(event) => setDiscount(Number(event.target.value))}
          className="mt-1 h-10 w-full rounded-[12px] border border-[#d9cfe2] bg-white px-3 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
          Твой дивидент %
        </span>
        <input
          type="number"
          min={0}
          max={poolPercent}
          step={0.5}
          value={commission}
          onChange={(event) => setCommission(Number(event.target.value))}
          className="mt-1 h-10 w-full rounded-[12px] border border-[#d9cfe2] bg-white px-3 text-sm"
        />
      </label>
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
          Остатък
        </span>
        <p
          className={`mt-1 flex h-10 items-center rounded-[12px] px-3 text-sm font-semibold ${
            draftOverflow ? "bg-[#fff6f6] text-[#9a3f3f]" : "bg-[#f6f2f9] text-[#432855]"
          }`}
        >
          {draftRemaining.toFixed(1)}%
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-[#432855] lg:h-10">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="h-4 w-4 rounded border-[#bca5cc] accent-[#432855]"
        />
        Активен
      </label>
      <div className="flex items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || draftOverflow}
          className="inline-flex h-9 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-4 text-xs font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Запазване…" : "Запази"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#d9cfe2] px-4 text-xs font-semibold text-[#6b587f] transition hover:bg-white disabled:opacity-60"
        >
          Откажи
        </button>
      </div>
      {error ? (
        <p className="text-sm font-medium text-[#9a3f3f] lg:col-span-6">{error}</p>
      ) : null}
    </li>
  );
}
