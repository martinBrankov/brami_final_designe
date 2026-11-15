import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

import {
  MerchantConsentGate,
  MerchantConsentManager,
} from "@/components/account-merchant-consent";
import { AccountMerchantSection } from "@/components/account-merchant-section";
import {
  SectionIntro,
  pageSectionClassName,
} from "@/components/section-intro";
import { getMerchantTierStatus } from "@/lib/merchant-tier";
import {
  deactivateCodesOverPool,
  getPromoOrdersForMerchant,
  listPromoCodesForMerchant,
} from "@/lib/promo-codes";
import { getUserProfile, getUserSession, isConsentedMerchant } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: isAppLocale(locale) ? locale : "bg", namespace: "MerchantPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AccountMerchantPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : "bg";
  setRequestLocale(locale);
  const t = await getTranslations("MerchantPage");
  const session = await getUserSession();

  if (!session) {
    return redirect({ href: "/account", locale });
  }

  const profile = await getUserProfile(session.id);

  if (!profile || profile.role !== "merchant") {
    return redirect({ href: "/account", locale });
  }

  // Merchant has the role but has not accepted (or withdrew) the terms —
  // show the consent gate instead of the dashboard.
  if (!isConsentedMerchant(profile)) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
        <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
          <div className="mx-auto max-w-6xl">
            <SectionIntro
              title={t("title")}
              titleAs="h1"
              size="page"
              description={t("consentDescription")}
            />
          </div>
        </section>
        <section className="w-full border-y border-[#d8d0de] bg-white">
          <div className="px-6 py-8 sm:px-10 lg:px-14">
            <MerchantConsentGate
              initialBank={{
                bankAccountHolder: profile.bankAccountHolder,
                bankIban: profile.bankIban,
                bankBic: profile.bankBic,
              }}
            />
          </div>
        </section>
      </main>
    );
  }

  const tierStatus = await getMerchantTierStatus(
    session.id,
    profile.email,
    profile.merchantDiscountPercent,
  );

  // Auto-deactivate any code whose split now exceeds the current pool.
  await deactivateCodesOverPool(session.id, tierStatus.poolPercent);

  const [merchantCodes, merchantOrders] = await Promise.all([
    listPromoCodesForMerchant(session.id),
    getPromoOrdersForMerchant(session.id),
  ]);

  const tierData = {
    turnoverEur: tierStatus.turnoverEur,
    currentPercent: tierStatus.currentPercent,
    currentThresholdEur: tierStatus.currentThresholdEur,
    nextTierThresholdEur: tierStatus.nextTier?.thresholdEur ?? null,
    nextTierPercent: tierStatus.nextTier?.percent ?? null,
    amountToNextTierEur: tierStatus.amountToNextTierEur,
    poolPercent: tierStatus.poolPercent,
    tiers: tierStatus.tiers,
    manualBonusApplied: tierStatus.manualBonusApplied,
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={t("title")}
            titleAs="h1"
            size="page"
            description={t("description")}
          />
        </div>
      </section>

      <section className="w-full border-y border-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-6xl space-y-10">
            <AccountMerchantSection
              codes={merchantCodes}
              orders={merchantOrders}
              tierData={tierData}
            />
            <MerchantConsentManager
              acceptedAt={profile.merchantTermsAcceptedAt}
              initialBank={{
                bankAccountHolder: profile.bankAccountHolder,
                bankIban: profile.bankIban,
                bankBic: profile.bankBic,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
