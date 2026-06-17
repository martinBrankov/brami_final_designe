import { MERCHANT_TIERS } from "@/lib/merchant-tier";

function formatEur(value: number) {
  return `€${value.toFixed(2)}`;
}

// Full tier threshold with a thousands separator, e.g. €500 / €5 000 / €50 000.
// Rendered inside whitespace-nowrap spans so the amount never wraps mid-number.
function formatThreshold(value: number) {
  return `€${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

export type MerchantTierProgressData = {
  turnoverEur: number;
  currentPercent: number;
  currentThresholdEur: number;
  nextTierThresholdEur: number | null;
  nextTierPercent: number | null;
  amountToNextTierEur: number;
  poolPercent: number;
  tiers: { thresholdEur: number; percent: number }[];
  manualBonusApplied: boolean;
};

export function AccountMerchantTierProgress({
  data,
}: {
  data: MerchantTierProgressData;
}) {
  const {
    turnoverEur,
    currentPercent,
    nextTierThresholdEur,
    nextTierPercent,
    amountToNextTierEur,
    tiers,
  } = data;

  // Bar spans €0 → top tier threshold; clamp turnover into that range. With a
  // single tier (max discount from the start) there is no range to fill.
  const maxThreshold = tiers[tiers.length - 1]?.thresholdEur ?? 0;
  const fillPercent =
    maxThreshold > 0 ? Math.min(100, (turnoverEur / maxThreshold) * 100) : 100;

  // Admin-granted starting discount (the floor baked into the ladder's first tier).
  const startPercent = tiers[0]?.percent ?? 0;
  // Full reference ladder (all paid levels), for the explanatory breakdown.
  const allTiers = MERCHANT_TIERS.filter((tier) => tier.percent > 0);

  return (
    <section className="rounded-[18px] border border-[#e6dcef] bg-[linear-gradient(140deg,#faf4fc_0%,#f4eef6_100%)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
            Ниво на отстъпка за търговец
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[#432855]">
            {currentPercent}%
          </p>
          <p className="mt-1 text-xs text-[#6b587f]">
            Общ оборот:{" "}
            <span className="font-semibold text-[#432855]">
              {formatEur(turnoverEur)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-[#6b587f]">
            Натрупва се само от доставени поръчки — твои собствени и направени с
            твоите промо кодове.
          </p>
        </div>
      </div>

      {/* Segmented ladder chart */}
      <div className="mt-6">
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#f1ebf4]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(100deg,#c8a3d4_0%,#9f79ac_50%,#432855_100%)] transition-all"
            style={{ width: `${fillPercent}%` }}
          />
          {/* Tier markers (skip the €0 base) */}
          {maxThreshold > 0
            ? tiers
                .filter((tier) => tier.thresholdEur > 0)
                .map((tier) => {
                  const left = Math.min(
                    100,
                    (tier.thresholdEur / maxThreshold) * 100,
                  );
                  const reached = turnoverEur >= tier.thresholdEur;
                  return (
                    <span
                      key={tier.thresholdEur}
                      className={`absolute top-1/2 h-3 w-[2px] -translate-y-1/2 ${
                        reached ? "bg-white/70" : "bg-[#cdbcd9]"
                      }`}
                      style={{ left: `${left}%` }}
                    />
                  );
                })
            : null}
        </div>

        <div
          className="mt-2 grid gap-1 text-center"
          style={{
            gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))`,
          }}
        >
          {tiers.map((tier) => {
            const reached = turnoverEur >= tier.thresholdEur;
            const isCurrent = tier.percent === currentPercent;
            return (
              <div key={tier.thresholdEur} className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    isCurrent
                      ? "text-[#432855]"
                      : reached
                        ? "text-[#8f72a7]"
                        : "text-[#b3a4c0]"
                  }`}
                >
                  {tier.percent}%
                </p>
                <p
                  className={`whitespace-nowrap text-[10px] ${
                    reached ? "text-[#6b587f]" : "text-[#b3a4c0]"
                  }`}
                >
                  {tier.thresholdEur === 0 ? "старт" : formatThreshold(tier.thresholdEur)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {nextTierThresholdEur !== null && nextTierPercent !== null ? (
        <p className="mt-4 text-sm text-[#6b587f]">
          Остават{" "}
          <span className="font-semibold text-[#432855]">
            {formatEur(amountToNextTierEur)}
          </span>{" "}
          оборот до ниво{" "}
          <span className="font-semibold text-[#432855]">{nextTierPercent}%</span>.
        </p>
      ) : (
        <p className="mt-4 text-sm text-[#2e6b3a]">
          Достигна максималното ниво на отстъпка.
        </p>
      )}

      {/* How the discount is formed — full ladder incl. levels below the start */}
      <details className="group mt-6 rounded-[16px] border border-[#e6dcef] bg-white/70 p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7] [&::-webkit-details-marker]:hidden">
          Как се формира отстъпката ти
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
        </summary>
        <p className="mt-3 text-sm text-[#6b587f]">
          {startPercent > 0 ? (
            <>
              Администраторът ти е дал{" "}
              <span className="font-semibold text-[#432855]">
                стартова отстъпка {startPercent}%
              </span>
              , която важи веднага. Нивата под нея вече са включени в старта, а
              по-високите се отключват с нарастване на общия ти оборот.
            </>
          ) : (
            <>
              Нямаш стартова отстъпка от администратор — започваш от 0% и
              отключваш нивата с нарастване на общия ти оборот от доставени
              поръчки.
            </>
          )}
        </p>

        <ul className="mt-4 space-y-1.5">
          {allTiers.map((tier) => {
            const includedInStart = tier.percent <= startPercent;
            const reached = !includedInStart && turnoverEur >= tier.thresholdEur;
            const isCurrent = tier.percent === currentPercent && !includedInStart;

            let badgeLabel: string;
            let badgeClass: string;
            if (includedInStart) {
              badgeLabel = "включено в стартовата отстъпка";
              badgeClass = "bg-[#d5dae1] text-[#4b5562]";
            } else if (isCurrent) {
              badgeLabel = "текущо ниво";
              badgeClass = "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white";
            } else if (reached) {
              badgeLabel = "достигнато";
              badgeClass = "bg-[#bfe6c9] text-[#1f5e32]";
            } else {
              badgeLabel = `при оборот ${formatThreshold(tier.thresholdEur)}`;
              badgeClass = "bg-[#e0cef0] text-[#553079]";
            }

            return (
              <li
                key={tier.thresholdEur}
                className={`flex flex-col items-start gap-1.5 rounded-[10px] px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                  includedInStart ? "opacity-60" : ""
                }`}
              >
                <span className="flex items-baseline gap-2 font-semibold text-[#432855]">
                  <span className="inline-block w-10 shrink-0">{tier.percent}%</span>
                  <span className="whitespace-nowrap text-xs font-normal text-[#8f72a7]">
                    оборот {formatThreshold(tier.thresholdEur)}
                  </span>
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] ${badgeClass}`}
                >
                  {badgeLabel}
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
