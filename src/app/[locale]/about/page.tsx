import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import addelaSunny from "@/assets/images/about/saffron-adela-sunny-kozmetika-s-shafran.jpg";
import garden from "@/assets/images/about/shafranova-gradina-v-balgariya.jpg";
import saffron from "@/assets/images/about/balgarski-shafran-crocus-sativus.jpg";
import { sectionActionClassName, sectionPrimaryButtonClassName } from "@/components/section-intro";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { COLLECTION_PATHS } from "@/lib/collections";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates, jsonLdScript } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

type AboutPageProps = { params: Promise<{ locale: string }> };
type AboutValue = string | { text: string; items: string[] };

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "About" });
  const alternates = buildAlternates(locale, "/about");

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

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  if (isAppLocale(locale)) setRequestLocale(locale);
  const t = await getTranslations("About");
  const values = t.raw("values") as AboutValue[];
  const storyParagraphs = t.raw("storyParagraphs") as string[];
  const approachParagraphs = t.raw("approachParagraphs") as string[];
  const brandParagraphs = t.raw("brandParagraphs") as string[];
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: t("title"),
    inLanguage: locale,
    about: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(aboutJsonLd)} />
      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
            {t("storyEyebrow")}
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-tight text-[#432855] sm:text-4xl">
            {t("storyTitle")}
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#5f4b73]">
            {storyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-8 font-serif text-xl italic text-[#432855]">
            {t("signature")}
          </p>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-white">
        <div className="grid min-h-[520px] lg:grid-cols-2">
          <div className="flex items-center px-6 pt-14 pb-7 sm:px-10 lg:px-14 lg:pt-20 lg:pb-0">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                {t("eyebrow")}
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-[#432855] sm:text-5xl lg:text-[3.8rem]">
                {t("title")}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#6b587f]">
                {t("lead")}
              </p>

              <ul className="mt-8 space-y-2">
                {values.map((value) => {
                  const text = typeof value === "string" ? value : value.text;
                  return (
                    <li key={text} className="flex items-baseline gap-2.5 text-sm font-medium text-[#432855]">
                      <svg viewBox="0 0 10 8" className="h-3 w-3 shrink-0 translate-y-[1px] text-[#6c3f8d]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 4l3 3 5-6" />
                      </svg>
                      <div>
                        {text}
                        {typeof value !== "string" && (
                          <ul className="mt-1.5 space-y-1">
                            {value.items.map((item) => (
                              <li key={item} className="flex items-baseline gap-2 font-normal text-[#5f4b73]">
                                <span className="h-1 w-1 shrink-0 -translate-y-[3px] rounded-full bg-[#8f72a7]" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-6 max-w-xl text-xs italic leading-6 text-[#8f72a7]">
                {t("valuesNote")}
              </p>
            </div>
          </div>

          <div className="border-t border-[#d8d0de] lg:border-t-0">
            <Image
              src={garden}
              alt={t("gardenAlt")}
              priority
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className="grid lg:grid-cols-2">
          <div className="order-2 border-t border-[#d8d0de] lg:order-none lg:border-t-0">
            <Image
              src={saffron}
              alt={t("saffronAlt")}
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="flex items-center border-b border-[#d8d0de] px-6 py-14 sm:px-10 lg:border-b-0 lg:px-14 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                {t("approachEyebrow")}
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-[#432855] sm:text-4xl">
                {t("approachTitle")}
              </h2>
              <div className="mt-6 space-y-4 text-base leading-8 text-[#5f4b73]">
                {approachParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white">
        <div className="grid lg:grid-cols-2">
          <div className="flex items-center px-6 pt-14 pb-0 sm:px-10 lg:px-14 lg:pt-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                Brami
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-[#432855] sm:text-4xl">
                {t("brandTitle")}
              </h2>
              <div className="mt-6 space-y-4 text-base leading-8 text-[#5f4b73]">
                {brandParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#d8d0de] lg:border-t-0">
            <Image
              src={addelaSunny}
              alt={t("productsAlt")}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="w-full border-t border-[#d8d0de] bg-[#fbf8ff]">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-10 lg:px-14">
          <h2 className="font-serif text-3xl leading-tight text-[#432855] sm:text-4xl">
            {t("exploreTitle")}
          </h2>
          <p className="mt-4 text-base leading-8 text-[#5f4b73]">{t("exploreText")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={COLLECTION_PATHS.saffron} className={sectionPrimaryButtonClassName}>
              {t("exploreSaffron")}
            </Link>
            <Link href={COLLECTION_PATHS.bulgarian} className={sectionActionClassName}>
              {t("exploreBulgarian")}
            </Link>
            <Link href="/products" className={sectionActionClassName}>
              {t("exploreAll")}
            </Link>
            <Link href="/beauty-care" className={sectionActionClassName}>
              {t("exploreBlog")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
