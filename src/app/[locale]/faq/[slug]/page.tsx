import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link, permanentRedirect } from "@/i18n/navigation";
import { isAppLocale, locales, type AppLocale } from "@/i18n/routing";
import { findFaqEntryBySlug, type LocalizedFaqEntry } from "@/lib/faq";
import { looksLikeHtml, toParagraphs, toPlainText } from "@/lib/faq-text";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates, jsonLdScript, localizedUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type FaqAnswerPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

function faqHref(slug: string) {
  return { pathname: "/faq/[slug]" as const, params: { slug } };
}

function faqAlternates(locale: AppLocale, entry: LocalizedFaqEntry) {
  return buildAlternates(
    locale,
    Object.fromEntries(locales.map((l) => [l, faqHref(entry.slugs[l])])) as Record<
      AppLocale,
      ReturnType<typeof faqHref>
    >,
    entry.availableLocales,
  );
}

export async function generateMetadata({ params }: FaqAnswerPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const { entry } = await findFaqEntryBySlug(decodeURIComponent(slug), locale);

  if (!entry) return {};

  const description = toPlainText(entry.answer ?? "").slice(0, 200) || undefined;
  const alternates = faqAlternates(locale, entry);

  return {
    title: entry.question,
    description,
    alternates,
    ...(!entry.availableLocales.includes(locale) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: `${entry.question} | Brami`,
      description,
      url: alternates.canonical as string,
      locale: OG_LOCALES[locale],
      images: DEFAULT_OG_IMAGES,
    },
  };
}

function formatDate(dateStr: string | null, locale: AppLocale) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-GB" : "bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Answer({ answer }: { answer: string }) {
  if (looksLikeHtml(answer)) {
    return (
      <div
        className="[&_h2]:font-serif [&_h2]:text-2xl [&_h2]:leading-snug [&_h2]:text-[#432855] [&_h3]:font-serif [&_h3]:text-xl [&_h3]:leading-snug [&_h3]:text-[#432855] [&_p]:text-base [&_p]:leading-8 [&_p]:text-[#5f4b73] [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_a]:text-[#6c3f8d] [&_a]:underline [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-base [&_li]:leading-7 [&_li]:text-[#5f4b73] [&_li>p]:m-0 space-y-4"
        dangerouslySetInnerHTML={{ __html: answer }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {toParagraphs(answer).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line text-base leading-8 text-[#5f4b73]">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export default async function FaqAnswerPage({ params }: FaqAnswerPageProps) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);
  const { entry, redirectSlug } = await findFaqEntryBySlug(decodeURIComponent(slug), locale);

  if (!entry) {
    if (redirectSlug) permanentRedirect({ href: faqHref(redirectSlug), locale });
    notFound();
  }

  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: "Faq" }),
    getTranslations({ locale, namespace: "Nav" }),
  ]);
  const pageUrl = localizedUrl(locale, faqHref(entry.slug));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      url: pageUrl,
      inLanguage: locale,
      mainEntity: [
        {
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: { "@type": "Answer", text: toPlainText(entry.answer ?? "") },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: tNav("home"), item: localizedUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name: tNav("faq"), item: localizedUrl(locale, "/faq") },
        { "@type": "ListItem", position: 3, name: entry.question, item: pageUrl },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf9_0%,#f7eef4_44%,#f5edf5_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      {/* Breadcrumb */}
      <section className="h-[49px] w-full border-b border-[#ece6f1] bg-white">
        <div className="flex h-full min-w-0 items-center px-6 sm:px-10 lg:px-14">
          <nav
            aria-label={t("breadcrumb")}
            className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[13px] font-medium text-[#7a688d]"
          >
            <Link href="/" className="shrink-0 transition hover:text-[#432855]">
              {tNav("home")}
            </Link>
            <span className="shrink-0 text-[#b7a8c3]">/</span>
            <Link href="/faq" className="shrink-0 transition hover:text-[#432855]">
              {tNav("faq")}
            </Link>
            <span className="shrink-0 text-[#b7a8c3]">/</span>
            <span className="min-w-0 truncate text-[#5f4b73]">{entry.question}</span>
          </nav>
        </div>
      </section>

      {/* Question */}
      <section className="border-b border-[#eadde4] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
              {entry.category ?? t("question")}
            </p>
            <h1 className="mt-4 font-serif text-3xl leading-tight text-[#432855] sm:text-[2.75rem]">
              {entry.question}
            </h1>
            {entry.publishedAt ? (
              <p className="mt-5 text-sm text-[#8f72a7]">
                {t("answeredOn", { date: formatDate(entry.publishedAt, locale) })}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Answer */}
      <section className="border-b border-[#eadde4]">
        <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-14">
          <article className="rounded-[26px] border border-[#eadde4] bg-white px-6 py-8 shadow-[0_16px_50px_rgba(67,40,85,0.05)] sm:px-9 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
              {t("answerFromTeam")}
            </p>
            <div className="mt-5">
              <Answer answer={entry.answer ?? ""} />
            </div>
          </article>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/faq"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#d8d0de] bg-white px-5 text-sm font-semibold text-[#432855] transition hover:bg-[#faf7fc]"
            >
              {t("allQuestions")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-105"
            >
              {t("contactUs")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
