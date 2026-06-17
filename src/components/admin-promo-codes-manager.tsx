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

type Merchant = { id: string; username: string; email: string };

type Feedback = { kind: "success" | "error"; message: string } | null;

export function AdminPromoCodesManager({
  initialCodes,
  merchants,
}: {
  initialCodes: PromoCodeRecord[];
  merchants: Merchant[];
}) {
  const router = useRouter();
  const [codes, setCodes] = useState<PromoCodeRecord[]>(initialCodes);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  const [newCode, setNewCode] = useState("");
  const [newMerchantId, setNewMerchantId] = useState(merchants[0]?.id ?? "");
  const [newDiscount, setNewDiscount] = useState<number>(5);
  const [newCommission, setNewCommission] = useState<number>(5);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function createCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const response = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        merchantId: newMerchantId,
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
    setNewDiscount(5);
    setNewCommission(5);
    setFeedback({ kind: "success", message: "Кодът е създаден." });
    refresh();
  }

  // Edit feedback is surfaced inline in the row (not in the top create form).
  async function patchCode(
    id: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch(`/api/admin/promo-codes/${id}`, {
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

    const response = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
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
    <div className="space-y-8">
      <form
        onSubmit={createCode}
        className="rounded-[18px] border border-[#e7dfd1] bg-white p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f45]">
          Нов промо код
        </p>
        <p className="mt-1 text-sm text-[#5f6b76]">
          Кодът се прилага от клиента в количката; той получава отстъпка, а търговецът — комисиона.
        </p>

        {merchants.length === 0 ? (
          <p className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Няма маркирани търговци. Маркирай поне един потребител като търговец от &quot;Потребители&quot;.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#25313d]">Код</span>
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
                  className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-[#fcfbf8] px-4 font-mono tracking-[0.16em] uppercase"
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
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-[16px] border border-[#d9d4ca] bg-white px-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#1d2733] transition hover:bg-[#f8f4ec]"
                >
                  Генерирай
                </button>
              </div>
              <span className="mt-1 block text-xs text-[#6a7480]">
                Точно 5 символа (A–Z, 0–9, %).
              </span>
            </label>

            <label className="block xl:col-span-2">
              <span className="mb-2 block text-sm font-medium text-[#25313d]">Търговец</span>
              <select
                value={newMerchantId}
                onChange={(event) => setNewMerchantId(event.target.value)}
                className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-[#fcfbf8] px-4"
                required
              >
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.username || merchant.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#25313d]">
                Отстъпка на купувача (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={newDiscount}
                onChange={(event) => setNewDiscount(Number(event.target.value))}
                className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-[#fcfbf8] px-4"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#25313d]">
                Комисиона за търговеца (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={newCommission}
                onChange={(event) => setNewCommission(Number(event.target.value))}
                className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-[#fcfbf8] px-4"
              />
            </label>
          </div>
        )}

        {feedback ? (
          <p
            className={`mt-4 text-sm font-medium ${
              feedback.kind === "success" ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={isPending || merchants.length === 0}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#1d2733] px-5 text-sm font-semibold text-white transition hover:bg-[#2b3847] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Създай
          </button>
        </div>
      </form>

      <div className="rounded-[18px] border border-[#e7dfd1] bg-white">
        <div className="border-b border-[#e7dfd1] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f45]">
            Списък промо кодове
          </p>
        </div>

        {codes.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-[#5f6b76]">
            Все още няма създадени промо кодове.
          </p>
        ) : (
          <ul className="divide-y divide-[#e7dfd1]">
            {codes.map((item) => (
              <AdminPromoCodeRow
                key={item.id}
                item={item}
                onSave={patchCode}
                onDelete={deleteCode}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AdminPromoCodeRow({
  item,
  onSave,
  onDelete,
}: {
  item: PromoCodeRecord;
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

  async function save() {
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
      <li className="grid gap-3 px-5 py-4 lg:grid-cols-[160px_1fr_110px_110px_110px_180px] lg:items-center">
        <span className="font-mono text-sm font-semibold tracking-[0.08em] text-[#1d2733]">
          {item.code}
        </span>
        <span className="text-sm text-[#4f5b66]">
          {item.merchantUsername || item.merchantEmail}
        </span>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Отстъпка
          </span>
          <p className="mt-0.5 text-sm font-semibold text-[#1d2733]">
            {item.discountPercent}%
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Комисиона
          </span>
          <p className="mt-0.5 text-sm font-semibold text-[#1d2733]">
            {item.commissionPercent}%
          </p>
        </div>
        <div className="flex items-center">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
              item.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {item.isActive ? "Активен" : "Неактивен"}
          </span>
        </div>
        <div className="flex items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#d9d4ca] px-3 text-xs font-semibold text-[#1d2733] transition hover:bg-[#f8f4ec]"
          >
            Редактирай
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50"
          >
            Изтрий
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="grid gap-3 bg-[#fcfbf8] px-5 py-4 lg:grid-cols-[160px_1fr_110px_110px_110px_180px] lg:items-end">
      <span className="font-mono text-sm font-semibold tracking-[0.08em] text-[#1d2733] lg:flex lg:h-9 lg:items-center">
        {item.code}
      </span>
      <span className="text-sm text-[#4f5b66] lg:flex lg:h-9 lg:items-center">
        {item.merchantUsername || item.merchantEmail}
      </span>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
          Отстъпка %
        </span>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={discount}
          onChange={(event) => setDiscount(Number(event.target.value))}
          className="mt-1 h-9 w-full rounded-[12px] border border-[#d9d4ca] bg-white px-3 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
          Комисиона %
        </span>
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={commission}
          onChange={(event) => setCommission(Number(event.target.value))}
          className="mt-1 h-9 w-full rounded-[12px] border border-[#d9d4ca] bg-white px-3 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-[#25313d] lg:h-9">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="h-4 w-4 rounded border-[#bca5cc] accent-[#1d2733]"
        />
        Активен
      </label>
      <div className="flex items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-9 items-center justify-center rounded-full bg-[#1d2733] px-4 text-xs font-semibold text-white transition hover:bg-[#2b3847] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Запазване…" : "Запази"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#d9d4ca] px-4 text-xs font-semibold text-[#5f6b76] transition hover:bg-white disabled:opacity-60"
        >
          Откажи
        </button>
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-600 lg:col-span-6">{error}</p>
      ) : null}
    </li>
  );
}
