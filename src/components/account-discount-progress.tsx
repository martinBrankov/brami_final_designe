"use client";

import { useUser } from "@/components/user-provider";

function formatEur(value: number) {
  return `€${value.toFixed(2)}`;
}

export function AccountDiscountProgress() {
  const { discount } = useUser();

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
              Лоялност и отстъпка
            </span>
            <p className="mt-1 text-base font-medium text-[#432855]">
              Текуща отстъпка: {currentPercent}%
            </p>
            <p className="mt-0.5 text-sm text-[#6b587f]">
              Оборот до момента: {formatEur(totalSpentEur)}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
            {currentPercent}% отстъпка
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
                {formatEur(nextTierThresholdEur)} за {nextTierPercent}%
              </span>
            ) : (
              <span className="text-[#6b587f]">Достигнат максимален таргет</span>
            )}
          </div>
        </div>

        {nextTierThresholdEur !== null && amountToNextTierEur > 0 ? (
          <p className="text-sm text-[#6b587f]">
            Остават{" "}
            <span className="font-semibold text-[#432855]">
              {formatEur(amountToNextTierEur)}
            </span>{" "}
            оборот до отстъпка от{" "}
            <span className="font-semibold text-[#432855]">{nextTierPercent}%</span>.
          </p>
        ) : (
          <p className="text-sm text-[#2e6b3a]">
            Имаш максималната отстъпка.
          </p>
        )}
      </div>
    </section>
  );
}
