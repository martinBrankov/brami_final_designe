import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FaqAskForm } from "@/components/faq-ask-form";
import { FaqList, type FaqListItem } from "@/components/faq-list";
import { SeeAlsoLinks } from "@/components/see-also-links";
import { isAppLocale } from "@/i18n/routing";
import { getPublishedFaqEntries } from "@/lib/faq";
import { toPlainText } from "@/lib/faq-text";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates, jsonLdScript, localizedUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type FaqPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Faq" });
  const alternates = buildAlternates(locale, "/faq");

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

const EXCERPT_LENGTH = 180;

function buildExcerpt(text: string) {
  if (text.length <= EXCERPT_LENGTH) return text;
  return `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const t = await getTranslations("Faq");
  const entries = await getPublishedFaqEntries(locale);

  const items: FaqListItem[] = entries
    .map((entry) => {
      const answerText = toPlainText(entry.answer ?? "");

      return {
        id: entry.id,
        slug: entry.slug,
        question: entry.question,
        category: entry.category,
        excerpt: buildExcerpt(answerText),
        searchText: `${entry.question} ${answerText} ${entry.category ?? ""}`.toLocaleLowerCase(
          locale,
        ),
      };
    });

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: localizedUrl(locale, "/faq"),
    inLanguage: locale,
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      url: localizedUrl(locale, { pathname: "/faq/[slug]", params: { slug: entry.slug } }),
      acceptedAnswer: { "@type": "Answer", text: toPlainText(entry.answer ?? "") },
    })),
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf9_0%,#f8f1f7_44%,#f5edf5_100%)]">
      {entries.length ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
      ) : null}
      <section className="border-b border-[#eadde4] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-[#432855] sm:text-5xl lg:text-[4rem]">
              {t("title")}
            </h1>
            <p className="mt-6 text-lg leading-8 text-[#6b587f]">
              {t("lead")}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
        {items.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-[#ddd3e4] bg-white/70 px-6 py-12 text-center">
            <p className="font-serif text-2xl text-[#432855]">
              {t("emptyTitle")}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#6b587f]">
              {t("emptyText")}
            </p>
          </div>
        ) : (
          <FaqList items={items} />
        )}
      </section>

      <section className="w-full border-y border-[#ece3f2] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
            {t("askEyebrow")}
          </p>
          <h2 className="mt-3 font-serif text-3xl text-[#432855] sm:text-4xl">
            {t("askTitle")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#6b587f]">
            {t("askText")}
          </p>

          <div className="mt-8">
            <FaqAskForm />
          </div>
        </div>
      </section>

      <SeeAlsoLinks
        locale={locale}
        pages={["deliveryReturns", "cancellationForm", "contact", "products", "beautyCare"]}
      />
    </main>
  );
}
