import { useLocale, useTranslations } from "next-intl";

import {
  AccountMerchantTierProgress,
  type MerchantTierProgressData,
} from "@/components/account-merchant-tier-progress";
import { AccountMerchantPromoManager } from "@/components/account-merchant-promo-manager";
import { isCommissionEligible, isOrderCancelled } from "@/lib/commission-status";
import type { PromoCodeRecord, MerchantOrderSummary } from "@/lib/promo-codes";

function formatEur(value: number) {
  return `€${value.toFixed(2)}`;
}

type CommissionState = "paid" | "ready" | "awaiting" | "cancelled";

function getCommissionState(order: MerchantOrderSummary): CommissionState {
  if (order.promoCommissionPaidAt) return "paid";
  if (isOrderCancelled(order.status)) return "cancelled";
  if (isCommissionEligible(order.status)) return "ready";
  return "awaiting";
}

const COMMISSION_BADGE: Record<
  CommissionState,
  { badge: string; amount: string }
> = {
  paid: {
    badge: "bg-[#f3faf4] text-[#2e6b3a]",
    amount: "text-[#6b587f]",
  },
  ready: {
    badge: "bg-[#f1f5fc] text-[#3d5a92]",
    amount: "text-[#2e6b3a]",
  },
  awaiting: {
    badge: "bg-[#faf7fc] text-[#8f72a7]",
    amount: "text-[#8f72a7]",
  },
  cancelled: {
    badge: "bg-[#fff6f6] text-[#9a3f3f]",
    amount: "text-[#9a3f3f]",
  },
};

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "bg-BG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AccountMerchantSection({
  codes,
  orders,
  tierData,
}: {
  codes: PromoCodeRecord[];
  orders: MerchantOrderSummary[];
  tierData: MerchantTierProgressData;
}) {
  const t = useTranslations("MerchantSection");
  const tStatus = useTranslations("OrderStatus");
  const locale = useLocale();
  // Cancelled orders yield no dividend, so they are left out of the total.
  const totalCommission = orders
    .filter((order) => getCommissionState(order) !== "cancelled")
    .reduce((sum, order) => sum + order.promoCommissionAmount, 0);
  const paidCommission = orders
    .filter((order) => getCommissionState(order) === "paid")
    .reduce((sum, order) => sum + order.promoCommissionAmount, 0);
  const readyCommission = orders
    .filter((order) => getCommissionState(order) === "ready")
    .reduce((sum, order) => sum + order.promoCommissionAmount, 0);
  const awaitingCommission = orders
    .filter((order) => getCommissionState(order) === "awaiting")
    .reduce((sum, order) => sum + order.promoCommissionAmount, 0);

  return (
    <section className="w-full">
      <p className="text-sm text-[#6b587f]">
        {t("intro")}
      </p>

      <div className="mt-6">
        <AccountMerchantTierProgress data={tierData} />
      </div>

      <h3 className="mt-12 font-serif text-2xl text-[#432855]">
        {t("codesTitle")}
      </h3>
      <p className="mt-1 text-sm text-[#6b587f]">
        {t("codesText")}
      </p>

      <div className="mt-6">
        <AccountMerchantPromoManager
          initialCodes={codes}
          poolPercent={tierData.poolPercent}
        />
      </div>

      <div className="mt-12">
        <h3 className="font-serif text-2xl text-[#432855]">
          {t("ordersTitle")}
        </h3>
        <p className="mt-1 text-sm text-[#6b587f]">
          {t("ordersText")}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[18px] border border-[#ece3f2] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
              {t("totalAccrued")}
            </p>
            <p className="mt-1 text-xl font-semibold text-[#432855]">
              {formatEur(totalCommission)}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#cce4d3] bg-[#f3faf4] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2e6b3a]">
              {t("commission.paid")}
            </p>
            <p className="mt-1 text-xl font-semibold text-[#2e6b3a]">
              {formatEur(paidCommission)}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#cdd8ec] bg-[#f1f5fc] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3d5a92]">
              {t("commission.ready")}
            </p>
            <p className="mt-1 text-xl font-semibold text-[#3d5a92]">
              {formatEur(readyCommission)}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#ece3f2] bg-[#faf7fc] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
              {t("commission.awaiting")}
            </p>
            <p className="mt-1 text-xl font-semibold text-[#8f72a7]">
              {formatEur(awaitingCommission)}
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="mt-4 rounded-[18px] border border-[#ece3f2] bg-[#faf7fc] px-4 py-4 text-sm text-[#6b587f]">
            {t("noOrders")}
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-3 lg:hidden">
              {orders.map((order) => {
                const state = getCommissionState(order);
                const badge = COMMISSION_BADGE[state];
                return (
                  <li
                    key={order.id}
                    className="rounded-[18px] border border-[#ece3f2] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-[#432855]">
                          #{order.orderNumber}
                        </p>
                        <p className="text-[11px] text-[#6b587f]">
                          {formatDate(order.orderCreatedAt || order.createdAt, locale)}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-[#f6f2f9] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#432855]">
                        {tStatus.has(order.status) ? tStatus(order.status) : order.status}
                      </span>
                    </div>

                    <div className="mt-3 text-sm">
                      <p className="truncate font-medium text-[#432855]">
                        {order.customerFullName}
                      </p>
                      <p className="truncate text-xs text-[#8f72a7]">
                        {order.customerEmail}
                      </p>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8f72a7]">
                          {t("code")}
                        </dt>
                        <dd className="mt-0.5 font-mono text-sm text-[#432855]">
                          {order.promoCodeText}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8f72a7]">
                          {t("value")}
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium text-[#432855]">
                          {formatEur(order.total)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#ece3f2] pt-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${badge.badge}`}
                      >
                        {state === "paid"
                          ? t("paidOn", { date: formatDate(order.promoCommissionPaidAt!, locale) })
                          : t(`commission.${state}`)}
                      </span>
                      <span className={`text-base font-semibold ${badge.amount}`}>
                        {state === "paid" ? "" : "+"}
                        {formatEur(order.promoCommissionAmount)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 hidden lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-[#ece3f2] text-left text-xs uppercase tracking-[0.08em] text-[#8f72a7]">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">{t("colOrder")}</th>
                    <th className="py-2 pr-3 font-semibold">{t("colDate")}</th>
                    <th className="py-2 pr-3 font-semibold">{t("colCustomer")}</th>
                    <th className="py-2 pr-3 font-semibold">{t("colCode")}</th>
                    <th className="py-2 pr-3 font-semibold">{t("colOrderStatus")}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{t("colValue")}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{t("colDividend")}</th>
                    <th className="py-2 pl-3 font-semibold">{t("colDividendStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece3f2]">
                  {orders.map((order) => {
                    const state = getCommissionState(order);
                    const badge = COMMISSION_BADGE[state];
                    return (
                      <tr key={order.id} className="text-[#432855]">
                        <td className="py-3 pr-3 font-mono text-xs">
                          #{order.orderNumber}
                        </td>
                        <td className="py-3 pr-3 text-xs text-[#6b587f]">
                          {formatDate(order.orderCreatedAt || order.createdAt, locale)}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="block text-sm font-medium">
                            {order.customerFullName}
                          </span>
                          <span className="block text-xs text-[#8f72a7]">
                            {order.customerEmail}
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          {order.promoCodeText}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="inline-flex items-center rounded-full bg-[#f6f2f9] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#432855]">
                            {tStatus.has(order.status) ? tStatus(order.status) : order.status}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-right font-medium">
                          {formatEur(order.total)}
                        </td>
                        <td
                          className={`py-3 pr-3 text-right font-semibold ${badge.amount}`}
                        >
                          {state === "paid" ? "" : "+"}
                          {formatEur(order.promoCommissionAmount)}
                        </td>
                        <td className="py-3 pl-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${badge.badge}`}
                          >
                            {state === "paid"
                              ? t("paidOn", { date: formatDate(order.promoCommissionPaidAt!, locale) })
                              : t(`commission.${state}`)}
                          </span>
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
    </section>
  );
}
