import "server-only";

import type {
  CurrentUser,
  CurrentUserDiscount,
  CurrentUserProfile,
} from "@/components/user-provider";
import { getMerchantTierStatus } from "@/lib/merchant-tier";
import {
  getUserProfile,
  getUserSession,
  isConsentedMerchant,
  toPublicUser,
} from "@/lib/user-auth";
import { getUserDiscountStatus } from "@/lib/user-discount";

export type CurrentUserState = {
  user: CurrentUser | null;
  profile: CurrentUserProfile | null;
  discount: CurrentUserDiscount | null;
};

/**
 * Everything the browser needs to know about the signed-in visitor. Served by
 * /api/auth/session, so the pages themselves never read the session cookie
 * and can be cached.
 */
export async function getCurrentUserState(): Promise<CurrentUserState> {
  const session = await getUserSession();
  if (!session) {
    return { user: null, profile: null, discount: null };
  }

  const [profile, discountStatus] = await Promise.all([
    getUserProfile(session.id),
    getUserDiscountStatus(session.email),
  ]);
  // Merchant discount only applies once the merchant has accepted the terms.
  const effectiveMerchantDiscountPercent = isConsentedMerchant(profile)
    ? (
        await getMerchantTierStatus(
          profile!.id,
          profile!.email,
          profile!.merchantDiscountPercent,
        )
      ).poolPercent
    : 0;

  return {
    user: { ...toPublicUser(session), role: profile?.role ?? session.role },
    profile: profile
      ? {
          fullName: profile.fullName,
          phone: profile.phone,
          city: profile.city,
          postalCode: profile.postalCode,
          address: profile.address,
          preferredOffice: profile.preferredOffice,
          preferredLocker: profile.preferredLocker,
          hasPassword: profile.hasPassword,
          merchantDiscountPercent: profile.merchantDiscountPercent,
          effectiveMerchantDiscountPercent,
          merchantTermsAccepted: profile.merchantTermsAcceptedAt !== null,
        }
      : null,
    discount: discountStatus
      ? {
          totalSpentEur: discountStatus.totalSpentEur,
          currentPercent: discountStatus.currentPercent,
          nextTierThresholdEur: discountStatus.nextTier?.thresholdEur ?? null,
          nextTierPercent: discountStatus.nextTier?.percent ?? null,
          amountToNextTierEur: discountStatus.amountToNextTierEur,
        }
      : null,
  };
}
