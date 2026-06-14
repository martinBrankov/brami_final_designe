import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountMerchantSection } from "@/components/account-merchant-section";
import {
  SectionIntro,
  pageSectionClassName,
} from "@/components/section-intro";
import {
  getPromoOrdersForMerchant,
  listPromoCodesForMerchant,
} from "@/lib/promo-codes";
import { getUserProfile, getUserSession } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профил на търговец",
  description: "Промо кодове, комисиони и поръчки за търговци на Brami.",
};

export default async function AccountMerchantPage() {
  const session = await getUserSession();

  if (!session) {
    redirect("/account");
  }

  const profile = await getUserProfile(session.id);

  if (!profile || profile.role !== "merchant") {
    redirect("/account");
  }

  const [merchantCodes, merchantOrders] = await Promise.all([
    listPromoCodesForMerchant(session.id),
    getPromoOrdersForMerchant(session.id),
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title="Профил на търговец"
            titleAs="h1"
            size="page"
            description="Управлявай своите промо кодове, комисиони и поръчки."
          />
        </div>
      </section>

      <section className="w-full border-y border-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-6xl">
            <AccountMerchantSection
              codes={merchantCodes}
              orders={merchantOrders}
              personalDiscountPercent={profile.merchantDiscountPercent}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
