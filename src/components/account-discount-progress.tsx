"use client";

import { useTranslations } from "next-intl";

import { useUser } from "@/components/user-provider";

function formatEur(value: number) {
  return `€${value.toFixed(2)}`;
}

export function AccountDiscountProgress() {
  const t = useTranslations("DiscountProgress");
  const { discount, user, profile } = useUser();

  // Only active merchants (consented) are on the merchant programme; until then
  // they accumulate turnover toward the normal loyalty discount like any user.
  if (user?.role === "merchant" && profile?.merchantTermsAccepted) {
    return null;
  }

  if (!discount) {
    return null;
  }

  const {
    totalSpentEur,
    currentPercent,
    nextTierThresholdEur,
    nextTierPercent,
    amountToNextTierEur,
  } = discount;

  const progressDenominator = nextTierThresholdEur ?? (totalSpentEur || 1);
  const rawProgress = Math.min(100, (totalSpentEur / progressDenominator) * 100);
  const progressPercent = nextTierThresholdEur ? rawProgress : 100;

  return (
    <section className="border-b border-[#ece3f2] py-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
              {t("title")}
            </span>
            <p className="mt-1 text-base font-medium text-[#432855]">
              {t("current", { percent: currentPercent })}
            </p>
            <p className="mt-0.5 text-sm text-[#6b587f]">
              {t("turnover", { amount: formatEur(totalSpentEur) })}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
            {t("badge", { percent: currentPercent })}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#f1ebf4]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(100deg,#c8a3d4_0%,#9f79ac_50%,#432855_100%)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#432855]">{formatEur(totalSpentEur)}</span>
            {nextTierThresholdEur !== null ? (
              <span className="text-[#6b587f]">
                {t("nextTier", { amount: formatEur(nextTierThresholdEur), percent: nextTierPercent ?? 0 })}
              </span>
            ) : (
              <span className="text-[#6b587f]">{t("maxReached")}</span>
            )}
          </div>
        </div>

        {nextTierThresholdEur !== null && amountToNextTierEur > 0 ? (
          <p className="text-sm text-[#6b587f]">
            {t.rich("remaining", {
              amount: formatEur(amountToNextTierEur),
              percent: nextTierPercent ?? 0,
              strong: (chunks) => <span className="font-semibold text-[#432855]">{chunks}</span>,
            })}
          </p>
        ) : (
          <p className="text-sm text-[#2e6b3a]">
            {t("maxDiscount")}
          </p>
        )}
      </div>
    </section>
  );
}
