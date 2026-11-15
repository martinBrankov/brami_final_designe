import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  SectionIntro,
  contentSectionClassName,
  contentSectionInnerClassName,
  pageSectionClassName,
} from "@/components/section-intro";
import { LegalBackButton } from "@/components/legal-back-button";
import { SeeAlsoLinks, type SeeAlsoPage } from "@/components/see-also-links";
import { isAppLocale } from "@/i18n/routing";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates } from "@/lib/seo";

// Text pages (delivery & returns, terms, privacy). Their content lives in
// messages/<locale>/legal.json under "Legal.<pageKey>".
export type LegalPageKey = "deliveryReturns" | "terms" | "privacy";

const LEGAL_PATHS = {
  deliveryReturns: "/delivery-returns",
  terms: "/terms",
  privacy: "/privacy-policy",
} as const satisfies Record<LegalPageKey, string>;

const LEGAL_SEE_ALSO = {
  deliveryReturns: ["cancellationForm", "terms", "faq", "contact"],
  terms: ["deliveryReturns", "cancellationForm", "privacyPolicy", "contact"],
  privacy: ["terms", "deliveryReturns", "contact"],
} as const satisfies Record<LegalPageKey, readonly SeeAlsoPage[]>;

type LegalSection = { title: string; paragraphs: string[] };

export type LegalPageProps = {
  params: Promise<{ locale: string }>;
};

export async function getLegalMetadata(
  pageKey: LegalPageKey,
  { params }: Pick<LegalPageProps, "params">,
): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: `Legal.${pageKey}` });
  const alternates = buildAlternates(locale, LEGAL_PATHS[pageKey]);

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates,
    openGraph: {
      title: `${t("metaTitle")} | Brami`,
      description: t("ogDescription"),
      url: alternates.canonical as string,
      locale: OG_LOCALES[locale],
      images: DEFAULT_OG_IMAGES,
    },
  };
}

export async function LegalPage({
  pageKey,
  params,
}: LegalPageProps & { pageKey: LegalPageKey }) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);

  const [t, tLegal] = await Promise.all([
    getTranslations({ locale, namespace: `Legal.${pageKey}` }),
    getTranslations({ locale, namespace: "Legal" }),
  ]);
  const sections = t.raw("sections") as LegalSection[];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={pageSectionClassName}>
        <div className="mb-8">
          <SectionIntro
            title={t("title")}
            titleAs="h1"
            size="page"
            description={t("description")}
            action={
              <Suspense fallback={null}>
                <LegalBackButton label={tLegal("backToCart")} />
              </Suspense>
            }
          />
        </div>
      </section>

      <section className={contentSectionClassName}>
        <div className={contentSectionInnerClassName}>
          {sections.map((section, index) => (
            <article
              key={section.title}
              className={
                index === 0
                  ? "py-6 first:pt-0 last:pb-0"
                  : "border-t border-[#ece4f1] py-6 first:pt-0 last:pb-0"
              }
            >
              <h2 className="text-xl font-semibold text-[#432855]">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#5f4b73]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <SeeAlsoLinks locale={locale} pages={LEGAL_SEE_ALSO[pageKey]} />
    </main>
  );
}
