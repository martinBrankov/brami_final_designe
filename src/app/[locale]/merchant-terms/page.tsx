import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import {
  SectionIntro,
  pageSectionClassName,
} from "@/components/section-intro";
import { isAppLocale } from "@/i18n/routing";
import { MERCHANT_TIERS } from "@/lib/merchant-tier";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates } from "@/lib/seo";

type MerchantTermsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: MerchantTermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "MerchantTerms" });
  const alternates = buildAlternates(locale, "/merchant-terms");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates,
    openGraph: {
      title: `${t("metaTitle")} | Brami`,
      description: t("metaDescription"),
      url: alternates.canonical as string,
      locale: OG_LOCALES[locale],
      images: DEFAULT_OG_IMAGES,
    },
  };
}

function formatThreshold(value: number) {
  return `€${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

const strong = (chunks: ReactNode) => <strong>{chunks}</strong>;

export default async function MerchantTermsPage({ params }: MerchantTermsPageProps) {
  const { locale } = await params;
  if (isAppLocale(locale)) setRequestLocale(locale);
  const t = await getTranslations("MerchantTerms");
  const paidTiers = MERCHANT_TIERS.filter((tier) => tier.percent > 0);
  const withdrawalItems = ["s5Item1", "s5Item2", "s5Item3", "s5Item4", "s5Item5"] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-3xl">
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
          <div className="mx-auto max-w-3xl space-y-10 text-[#432855]">
            <div>
              <h2 className="font-serif text-2xl">{t("s1Title")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">{t("s1Text")}</p>
            </div>

            <div>
              <h2 className="font-serif text-2xl">{t("s2Title")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">{t.rich("s2Text", { strong })}</p>
              <ul className="mt-4 divide-y divide-[#ece3f2] overflow-hidden rounded-[14px] border border-[#ece3f2]">
                {paidTiers.map((tier) => (
                  <li
                    key={tier.thresholdEur}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold">{t("tierDiscount", { percent: tier.percent })}</span>
                    <span className="text-[#8f72a7]">
                      {t("tierThreshold", { amount: formatThreshold(tier.thresholdEur) })}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">{t.rich("s2Note", { strong })}</p>
            </div>

            <div>
              <h2 className="font-serif text-2xl">{t("s3Title")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">{t("s3Intro")}</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#5b4a6b]">
                <li>{t.rich("s3Customer", { strong })}</li>
                <li>{t.rich("s3Dividend", { strong })}</li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">{t("s3Note")}</p>
            </div>

            <div>
              <h2 className="font-serif text-2xl">{t("s4Title")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">{t.rich("s4P1", { strong })}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">{t.rich("s4P2", { strong })}</p>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">{t.rich("s4P3", { strong })}</p>
            </div>

            <div>
              <h2 className="font-serif text-2xl">{t("s5Title")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">{t("s5Intro")}</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#5b4a6b]">
                {withdrawalItems.map((key) => (
                  <li key={key}>{t.rich(key, { strong })}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">{t.rich("s5Note", { strong })}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
