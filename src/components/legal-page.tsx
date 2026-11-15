import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  SectionIntro,
  contentSectionClassName,
  contentSectionInnerClassName,
  pageSectionClassName,
  sectionActionClassName,
} from "@/components/section-intro";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { OG_LOCALES, buildAlternates } from "@/lib/seo";

// Text pages (delivery & returns, terms, privacy). Their content lives in
// messages/<locale>/legal.json under "Legal.<pageKey>".
export type LegalPageKey = "deliveryReturns" | "terms" | "privacy";

const LEGAL_PATHS = {
  deliveryReturns: "/delivery-returns",
  terms: "/terms",
  privacy: "/privacy-policy",
} as const satisfies Record<LegalPageKey, string>;

type LegalSection = { title: string; paragraphs: string[] };

export type LegalPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ from?: string; step?: string }>;
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
    },
  };
}

export async function LegalPage({
  pageKey,
  params,
  searchParams,
}: LegalPageProps & { pageKey: LegalPageKey }) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);

  const [t, tLegal] = await Promise.all([
    getTranslations({ locale, namespace: `Legal.${pageKey}` }),
    getTranslations({ locale, namespace: "Legal" }),
  ]);
  const sections = t.raw("sections") as LegalSection[];
  const resolvedSearchParams = await searchParams;
  const showBackButton = resolvedSearchParams?.from === "cart";
  const backHref =
    resolvedSearchParams?.step === "delivery"
      ? { pathname: "/cart" as const, query: { step: "delivery" } }
      : "/cart";

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
              showBackButton ? (
                <Link href={backHref} className={sectionActionClassName}>
                  {tLegal("backToCart")}
                </Link>
              ) : null
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
    </main>
  );
}
