import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type DiscountTier = {
  thresholdEur: number;
  percent: number;
};

export const DISCOUNT_TIERS: DiscountTier[] = [
  { thresholdEur: 0, percent: 0 },
  { thresholdEur: 1000, percent: 5 },
];

export type DiscountStatus = {
  totalSpentEur: number;
  currentPercent: number;
  nextTier: DiscountTier | null;
  amountToNextTierEur: number;
  currentThresholdEur: number;
};

export function getDiscountForSpend(totalSpentEur: number): DiscountStatus {
  const sortedTiers = [...DISCOUNT_TIERS].sort(
    (a, b) => a.thresholdEur - b.thresholdEur,
  );

  let currentTier = sortedTiers[0];
  let nextTier: DiscountTier | null = null;

  for (let i = 0; i < sortedTiers.length; i += 1) {
    if (totalSpentEur >= sortedTiers[i].thresholdEur) {
      currentTier = sortedTiers[i];
      nextTier = sortedTiers[i + 1] ?? null;
    } else {
      break;
    }
  }

  const amountToNextTierEur = nextTier
    ? Math.max(0, nextTier.thresholdEur - totalSpentEur)
    : 0;

  return {
    totalSpentEur,
    currentPercent: currentTier.percent,
    nextTier,
    amountToNextTierEur,
    currentThresholdEur: currentTier.thresholdEur,
  };
}

export async function getUserTurnoverEur(email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return 0;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_orders")
    .select("subtotal")
    .ilike("customer_email", normalized)
    .returns<Array<{ subtotal: number }>>();

  if (error) {
    throw new Error(`Failed to load turnover: ${error.message}`);
  }

  if (!data) {
    return 0;
  }

  return data.reduce((sum, row) => sum + Number(row.subtotal ?? 0), 0);
}

export async function getUserDiscountStatus(email: string): Promise<DiscountStatus> {
  const totalSpentEur = await getUserTurnoverEur(email);
  return getDiscountForSpend(totalSpentEur);
}
