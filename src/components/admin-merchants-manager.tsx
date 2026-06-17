"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { isCommissionEligible, isOrderCancelled } from "@/lib/commission-status";
import type { MerchantAdminRow } from "@/lib/promo-codes";

function formatEur(value: number) {
  return `€${value.toFixed(2)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function postCommissionMark(orderIds: string[], paid: boolean) {
  const response = await fetch("/api/admin/commissions/mark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderIds, paid }),
  });
  const result = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || "Грешка при запис.");
  }
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

function MerchantRow({
  merchant,
  defaultOpen = false,
}: {
  merchant: MerchantAdminRow;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const paidTotal = useMemo(
    () =>
      merchant.orders
        .filter((order) => order.promoCommissionPaidAt)
        .reduce((sum, o) => sum + o.promoCommissionAmount, 0),
    [merchant.orders],
  );
  // "Payable" = delivered but not yet paid; "awaiting" = not yet delivered.
  const payableTotal = useMemo(
    () =>
      merchant.orders
        .filter(
          (order) =>
            !order.promoCommissionPaidAt && isCommissionEligible(order.status),
        )
        .reduce((sum, o) => sum + o.promoCommissionAmount, 0),
    [merchant.orders],
  );
  const payableOrderIds = useMemo(
    () =>
      merchant.orders
        .filter(
          (order) =>
            !order.promoCommissionPaidAt && isCommissionEligible(order.status),
        )
        .map((order) => order.id),
    [merchant.orders],
  );

  async function toggleOne(orderId: string, currentlyPaid: boolean) {
    setError(null);
    setPendingId(orderId);
    try {
      await postCommissionMark([orderId], !currentlyPaid);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка.");
    } finally {
      setPendingId(null);
    }
  }

  async function markAllPayable() {
    if (!payableOrderIds.length) return;
    if (
      !confirm(
        `Маркирай ${payableOrderIds.length} доставен${
          payableOrderIds.length === 1 ? "а поръчка" : "и поръчки"
        } като изплатени?`,
      )
    )
      return;
    setError(null);
    try {
      await postCommissionMark(payableOrderIds, true);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка.");
    }
  }

  return (
    <article className="border-b border-[#e7dfd1]">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="grid w-full grid-cols-2 gap-3 px-4 py-4 text-left transition hover:bg-[#fbf8f1] sm:px-5 lg:grid-cols-[minmax(200px,1.4fr)_120px_120px_180px_24px] lg:items-center"
      >
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <p className="truncate text-sm font-semibold text-[#1d2733]">
            {merchant.username || "—"}
          </p>
          <p className="truncate text-xs text-[#6a7480]">{merchant.email}</p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Лична отстъпка
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#1d2733]">
            {merchant.merchantDiscountPercent}%
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Кодове / Поръчки
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#1d2733]">
            {merchant.codeCount} / {merchant.orderCount}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Комисиона (изплатена / готова)
          </p>
          <p className="mt-0.5 text-sm">
            <span className="font-semibold text-emerald-700">
              {formatEur(paidTotal)}
            </span>
            <span className="text-[#8a6f45]"> / </span>
            <span className="font-semibold text-[#3d5a92]">
              {formatEur(payableTotal)}
            </span>
          </p>
        </div>

        <div className="col-span-2 flex justify-end lg:col-span-1 lg:block">
          <ChevronIcon isOpen={isOpen} />
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-[#e7dfd1] bg-[#fbf8f1] px-4 py-5 sm:px-5">
          <div className="mb-6 rounded-[14px] border border-[#e7dfd1] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
                Банкова сметка за изплащане
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  merchant.merchantTermsAccepted
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {merchant.merchantTermsAccepted
                  ? "Приети условия"
                  : "Без съгласие"}
              </span>
            </div>
            {merchant.bankIban ? (
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
                    Титуляр
                  </dt>
                  <dd className="mt-0.5 text-[#1d2733]">
                    {merchant.bankAccountHolder || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
                    IBAN
                  </dt>
                  <dd className="mt-0.5 font-mono text-[#1d2733]">
                    {merchant.bankIban}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
                    BIC
                  </dt>
                  <dd className="mt-0.5 font-mono text-[#1d2733]">
                    {merchant.bankBic || "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-[#5f6b76]">
                Търговецът още не е въвел банкова сметка.
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
                Промо кодове ({merchant.codes.length})
              </p>
              {merchant.codes.length === 0 ? (
                <p className="mt-2 text-sm text-[#5f6b76]">Няма създадени кодове.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {merchant.codes.map((code) => (
                    <li
                      key={code.id}
                      className="flex items-center justify-between gap-3 rounded-[14px] border border-[#e7dfd1] bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold tracking-[0.08em] text-[#1d2733]">
                          {code.code}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6a7480]">
                          Отстъпка {code.discountPercent}% · Комисиона{" "}
                          {code.commissionPercent}%
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                          code.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {code.isActive ? "Активен" : "Неактивен"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
                  Поръчки ({merchant.orders.length})
                </p>
                {payableOrderIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={markAllPayable}
                    className="inline-flex h-8 items-center justify-center rounded-full border border-emerald-300 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Маркирай доставените ({payableOrderIds.length}) като изплатени
                  </button>
                ) : null}
              </div>
              {error ? (
                <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
              ) : null}
              {merchant.orders.length === 0 ? (
                <p className="mt-2 text-sm text-[#5f6b76]">
                  Все още няма поръчки през кодовете на този търговец.
                </p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2 lg:hidden">
                    {merchant.orders.map((order) => {
                      const isPaid = Boolean(order.promoCommissionPaidAt);
                      const isDelivered = isCommissionEligible(order.status);
                      const isPending = pendingId === order.id;
                      const canPay = isPaid || isDelivered;
                      return (
                        <li
                          key={order.id}
                          className="rounded-[14px] border border-[#e7dfd1] bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-mono text-xs font-semibold text-[#1d2733]">
                                #{order.orderNumber}
                              </p>
                              <p className="text-[10px] text-[#6a7480]">
                                {formatDate(order.orderCreatedAt || order.createdAt)}
                              </p>
                            </div>
                            <span className="inline-flex shrink-0 items-center rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4f5b66]">
                              {order.status}
                            </span>
                          </div>

                          <div className="mt-2 text-xs">
                            <p className="truncate font-medium text-[#1d2733]">
                              {order.customerFullName}
                            </p>
                            <p className="truncate text-[10px] text-[#6a7480]">
                              {order.customerEmail}
                            </p>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#1d2733]">
                            <span className="font-mono text-[10px] text-[#6a7480]">
                              Код: {order.promoCodeText}
                            </span>
                            <span>·</span>
                            <span>Стойност: {formatEur(order.total)}</span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#e7dfd1] pt-2">
                            <span
                              className={`text-sm font-semibold ${
                                isPaid ? "text-[#6a7480]" : "text-emerald-700"
                              }`}
                            >
                              {isPaid ? "" : "+"}
                              {formatEur(order.promoCommissionAmount)}
                            </span>
                            {canPay ? (
                              <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={isPaid}
                                  disabled={isPending}
                                  onChange={() => toggleOne(order.id, isPaid)}
                                  className="h-4 w-4 rounded border-[#bca5cc] accent-emerald-600"
                                />
                                <span
                                  className={`font-medium ${
                                    isPaid ? "text-emerald-700" : "text-[#3d5a92]"
                                  }`}
                                >
                                  {isPaid
                                    ? `Изплатена ${formatDate(order.promoCommissionPaidAt!)}`
                                    : "Маркирай като изплатена"}
                                </span>
                              </label>
                            ) : isOrderCancelled(order.status) ? (
                              <span className="text-xs font-semibold text-[#b64242]">
                                Отказана
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-[#8a6f45]">
                                Очаква доставка
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 hidden lg:block">
                    <table className="w-full text-sm">
                      <thead className="border-b border-[#e7dfd1] text-left text-[10px] uppercase tracking-[0.08em] text-[#8a6f45]">
                        <tr>
                          <th className="py-2 pr-3 font-semibold">Поръчка</th>
                          <th className="py-2 pr-3 font-semibold">Клиент</th>
                          <th className="py-2 pr-3 font-semibold">Код</th>
                          <th className="py-2 pr-3 font-semibold">Статус</th>
                          <th className="py-2 pr-3 text-right font-semibold">Стойност</th>
                          <th className="py-2 pr-3 text-right font-semibold">Комисиона</th>
                          <th className="py-2 pl-3 font-semibold">Изплащане</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e7dfd1]">
                        {merchant.orders.map((order) => {
                          const isPaid = Boolean(order.promoCommissionPaidAt);
                          const isDelivered = isCommissionEligible(order.status);
                          const isPending = pendingId === order.id;
                          const canPay = isPaid || isDelivered;
                          return (
                            <tr key={order.id} className="text-[#1d2733]">
                              <td className="py-2 pr-3">
                                <span className="block font-mono text-xs">
                                  #{order.orderNumber}
                                </span>
                                <span className="block text-[10px] text-[#6a7480]">
                                  {formatDate(order.orderCreatedAt || order.createdAt)}
                                </span>
                              </td>
                              <td className="py-2 pr-3">
                                <span className="block truncate text-xs font-medium">
                                  {order.customerFullName}
                                </span>
                                <span className="block truncate text-[10px] text-[#6a7480]">
                                  {order.customerEmail}
                                </span>
                              </td>
                              <td className="py-2 pr-3 font-mono text-xs">
                                {order.promoCodeText}
                              </td>
                              <td className="py-2 pr-3">
                                <span className="inline-flex items-center rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4f5b66]">
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-right text-xs font-medium">
                                {formatEur(order.total)}
                              </td>
                              <td
                                className={`py-2 pr-3 text-right text-xs font-semibold ${
                                  isPaid ? "text-[#6a7480]" : "text-emerald-700"
                                }`}
                              >
                                {isPaid ? "" : "+"}
                                {formatEur(order.promoCommissionAmount)}
                              </td>
                              <td className="py-2 pl-3">
                                {canPay ? (
                                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={isPaid}
                                      disabled={isPending}
                                      onChange={() => toggleOne(order.id, isPaid)}
                                      className="h-4 w-4 rounded border-[#bca5cc] accent-emerald-600"
                                    />
                                    <span
                                      className={`font-medium ${
                                        isPaid ? "text-emerald-700" : "text-[#3d5a92]"
                                      }`}
                                    >
                                      {isPaid
                                        ? formatDate(order.promoCommissionPaidAt!)
                                        : "Готова"}
                                    </span>
                                  </label>
                                ) : isOrderCancelled(order.status) ? (
                                  <span className="text-xs font-semibold text-[#b64242]">
                                    Отказана
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-[#8a6f45]">
                                    Очаква доставка
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function AdminMerchantsManager({
  merchants,
}: {
  merchants: MerchantAdminRow[];
}) {
  const [selectedId, setSelectedId] = useState<string>("all");

  const visibleMerchants = useMemo(
    () =>
      selectedId === "all"
        ? merchants
        : merchants.filter((m) => m.id === selectedId),
    [merchants, selectedId],
  );

  if (merchants.length === 0) {
    return (
      <p className="rounded-[18px] border border-[#e7dfd1] bg-white px-5 py-12 text-center text-sm text-[#5f6b76]">
        Все още няма потребители с роля Търговец.
      </p>
    );
  }

  const totalPaid = visibleMerchants.reduce(
    (sum, m) =>
      sum +
      m.orders
        .filter((o) => o.promoCommissionPaidAt)
        .reduce((s, o) => s + o.promoCommissionAmount, 0),
    0,
  );
  // Ready for payout = delivered orders whose commission is not yet paid.
  const totalPayable = visibleMerchants.reduce(
    (sum, m) =>
      sum +
      m.orders
        .filter((o) => !o.promoCommissionPaidAt && isCommissionEligible(o.status))
        .reduce((s, o) => s + o.promoCommissionAmount, 0),
    0,
  );
  const totalOrders = visibleMerchants.reduce((sum, m) => sum + m.orderCount, 0);

  const isFiltered = selectedId !== "all";

  return (
    <div className="space-y-6">
      <div className="rounded-[18px] border border-[#e7dfd1] bg-white p-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Покажи комисионите на
          </span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="mt-2 h-11 w-full rounded-[14px] border border-[#d9d4ca] bg-[#fcfbf8] px-4 text-sm text-[#1d2733]"
          >
            <option value="all">Всички търговци ({merchants.length})</option>
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.username || merchant.email}
              </option>
            ))}
          </select>
        </label>
        {isFiltered ? (
          <button
            type="button"
            onClick={() => setSelectedId("all")}
            className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#8a6f45] underline-offset-2 transition hover:text-[#1d2733] hover:underline"
          >
            Покажи всички
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[18px] border border-[#e7dfd1] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            {isFiltered ? "Избран търговец" : "Търговци"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#1d2733]">
            {visibleMerchants.length}
          </p>
        </div>
        <div className="rounded-[18px] border border-[#e7dfd1] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Поръчки през кодове
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#1d2733]">{totalOrders}</p>
        </div>
        <div className="rounded-[18px] border border-[#e7dfd1] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Изплатени комисиони
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">
            {formatEur(totalPaid)}
          </p>
        </div>
        <div className="rounded-[18px] border border-[#e7dfd1] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">
            Готови за изплащане
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#3d5a92]">
            {formatEur(totalPayable)}
          </p>
        </div>
      </div>

      <div className="rounded-[18px] border border-[#e7dfd1] bg-white">
        {visibleMerchants.map((merchant) => (
          <MerchantRow
            key={merchant.id}
            merchant={merchant}
            defaultOpen={isFiltered}
          />
        ))}
      </div>
    </div>
  );
}
