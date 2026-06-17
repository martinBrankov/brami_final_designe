import "server-only";

import { COMMISSION_ELIGIBLE_STATUS } from "@/lib/commission-status";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export type MerchantTier = {
  thresholdEur: number;
  percent: number;
};

// Volume ladder driven by the merchant's total (all-time) delivered turnover.
// Below the first paid threshold the discount is 0%.
export const MERCHANT_TIERS: MerchantTier[] = [
  { thresholdEur: 0, percent: 0 },
  { thresholdEur: 250, percent: 5 },
  { thresholdEur: 500, percent: 10 },
  { thresholdEur: 5000, percent: 15 },
  { thresholdEur: 10000, percent: 20 },
  { thresholdEur: 25000, percent: 25 },
  { thresholdEur: 50000, percent: 30 },
];

// The natural starting discount when the admin grants no manual override.
export const BASE_MERCHANT_PERCENT = MERCHANT_TIERS[0].percent;

export type MerchantTierStatus = {
  turnoverEur: number;
  currentPercent: number;
  currentThresholdEur: number;
  nextTier: MerchantTier | null;
  amountToNextTierEur: number;
  /** Discount the merchant can distribute (the current tier percent). */
  poolPercent: number;
  /** The full ladder for this merchant, with the admin floor baked in. */
  tiers: MerchantTier[];
  /** Whether the admin's manual setting lifts the starting tier above the base. */
  manualBonusApplied: boolean;
};

/**
 * Builds the merchant's ladder with the admin-set discount as the starting tier.
 * Tiers below that floor disappear; remaining higher tiers keep their thresholds.
 * Example: floor 20% → [20% @ €0, 25% @ €1000, 30% @ €1250] (10% and 15% hidden).
 */
export function buildMerchantTiers(floorPercent: number): MerchantTier[] {
  const base = Math.max(floorPercent, BASE_MERCHANT_PERCENT);
  const higher = MERCHANT_TIERS.filter((tier) => tier.percent > base);
  return [{ thresholdEur: 0, percent: base }, ...higher];
}

export function getMerchantTier(
  turnoverEur: number,
  tiers: MerchantTier[],
): {
  currentPercent: number;
  currentThresholdEur: number;
  nextTier: MerchantTier | null;
  amountToNextTierEur: number;
} {
  const sortedTiers = [...tiers].sort((a, b) => a.thresholdEur - b.thresholdEur);

  let currentTier = sortedTiers[0];
  let nextTier: MerchantTier | null = null;

  for (let i = 0; i < sortedTiers.length; i += 1) {
    if (turnoverEur >= sortedTiers[i].thresholdEur) {
      currentTier = sortedTiers[i];
      nextTier = sortedTiers[i + 1] ?? null;
    } else {
      break;
    }
  }

  const amountToNextTierEur = nextTier
    ? Math.max(0, nextTier.thresholdEur - turnoverEur)
    : 0;

  return {
    currentPercent: currentTier.percent,
    currentThresholdEur: currentTier.thresholdEur,
    nextTier,
    amountToNextTierEur,
  };
}

type TurnoverRow = { id: string; subtotal: number | string | null };

/**
 * Total (all-time) turnover for a merchant: their own orders (matched by email)
 * plus orders placed with any of their promo codes (matched by promo_merchant_id),
 * deduplicated by order id so overlap is not double-counted. Only delivered
 * orders count towards turnover — anything else is ignored.
 */
export async function getMerchantTurnoverEur(
  merchantId: string,
  email: string,
): Promise<number> {
  const supabase = createSupabaseAdminClient();

  const normalizedEmail = email.trim().toLowerCase();

  const [ownResult, promoResult] = await Promise.all([
    normalizedEmail
      ? supabase
          .from("customer_orders")
          .select("id, subtotal")
          .ilike("customer_email", normalizedEmail)
          .eq("status", COMMISSION_ELIGIBLE_STATUS)
          .returns<TurnoverRow[]>()
      : Promise.resolve({ data: [] as TurnoverRow[], error: null }),
    supabase
      .from("customer_orders")
      .select("id, subtotal")
      .eq("promo_merchant_id", merchantId)
      .eq("status", COMMISSION_ELIGIBLE_STATUS)
      .returns<TurnoverRow[]>(),
  ]);

  if (ownResult.error) {
    throw new Error(`Failed to load merchant turnover: ${ownResult.error.message}`);
  }
  if (promoResult.error) {
    throw new Error(`Failed to load merchant turnover: ${promoResult.error.message}`);
  }

  const subtotalById = new Map<string, number>();
  for (const row of [...(ownResult.data ?? []), ...(promoResult.data ?? [])]) {
    subtotalById.set(row.id, Number(row.subtotal ?? 0));
  }

  let total = 0;
  for (const value of subtotalById.values()) {
    total += value;
  }
  return total;
}

/**
 * Resolves a merchant's current pool (effective discount %) from their id alone,
 * loading the email + manual discount needed for the tier computation.
 */
export async function getMerchantPoolPercent(merchantId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("email, merchant_discount_percent")
    .eq("id", merchantId)
    .maybeSingle<{ email: string; merchant_discount_percent: number | string | null }>();

  if (error) {
    throw new Error(`Failed to load merchant: ${error.message}`);
  }
  if (!data) {
    return 0;
  }

  const status = await getMerchantTierStatus(
    merchantId,
    data.email,
    Number(data.merchant_discount_percent ?? 0),
  );
  return status.poolPercent;
}

export async function getMerchantTierStatus(
  merchantId: string,
  email: string,
  manualPercent: number,
): Promise<MerchantTierStatus> {
  const turnoverEur = await getMerchantTurnoverEur(merchantId, email);
  const tiers = buildMerchantTiers(manualPercent);
  const tier = getMerchantTier(turnoverEur, tiers);

  return {
    turnoverEur,
    currentPercent: tier.currentPercent,
    currentThresholdEur: tier.currentThresholdEur,
    nextTier: tier.nextTier,
    amountToNextTierEur: tier.amountToNextTierEur,
    poolPercent: tier.currentPercent,
    tiers,
    manualBonusApplied: manualPercent > BASE_MERCHANT_PERCENT,
  };
}
