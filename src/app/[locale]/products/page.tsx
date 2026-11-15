import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { COLLECTION_PAGES, SeeAlsoLinks } from "@/components/see-also-links";
import { isAppLocale } from "@/i18n/routing";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates } from "@/lib/seo";

import { ProductsPageContent } from "./products-page-content";

// Old ?category= links are redirected by the middleware; ?q= and ?favorites=
// are read in the browser, so this page is the same for everyone and cached.
type ProductsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ProductsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "ProductsPage" });
  const alternates = buildAlternates(locale, "/products");

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

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { locale } = await params;
  if (isAppLocale(locale)) setRequestLocale(locale);

  return (
    <>
      <ProductsPageContent />
      {isAppLocale(locale) ? (
        <SeeAlsoLinks locale={locale} pages={[...COLLECTION_PAGES, "deliveryReturns", "faq"]} />
      ) : null}
    </>
  );
}
