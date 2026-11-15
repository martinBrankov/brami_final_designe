import { statSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BestsellersSection } from "@/components/bestsellers-section";
import { HomeCollections } from "@/components/home-collections";
import { HomeHero } from "@/components/home-hero";
import { InfoStrip } from "@/components/info-strip";
import { isAppLocale } from "@/i18n/routing";
import { OG_LOCALES, absoluteUrl, buildAlternates } from "@/lib/seo";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Home" });
  const mtime = statSync(join(process.cwd(), "src/assets/images/brami-naturalna-kozmetika-s-shafran-og.jpg")).mtimeMs;
  const v = Math.floor(mtime).toString(36);
  const alternates = buildAlternates(locale, "/");

  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates,
    openGraph: {
      title: t("metaTitle"),
      description: t("ogDescription"),
      url: alternates.canonical as string,
      locale: OG_LOCALES[locale],
      images: [
        {
          url: absoluteUrl(`${locale === "bg" ? "" : `/${locale}`}/opengraph-image?v=${v}`),
          width: 1200,
          height: 630,
          alt: t("metaTitle"),
        },
      ],
    },
  };
}

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  if (isAppLocale(locale)) setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <HomeHero />
      <InfoStrip />
      <BestsellersSection />
      <HomeCollections />
    </main>
  );
}
