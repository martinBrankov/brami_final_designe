import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { permanentRedirect } from "@/i18n/navigation";
import { COLLECTION_PAGES, SeeAlsoLinks } from "@/components/see-also-links";
import { isAppLocale } from "@/i18n/routing";
import { CATEGORY_COLLECTIONS } from "@/lib/collections";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates } from "@/lib/seo";

import { ProductsPageContent } from "./products-page-content";

type ProductsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  if (isAppLocale(locale)) setRequestLocale(locale);
  const query = await searchParams;

  // Old ?category= links now live on their own category pages.
  const category = firstParam(query.category);
  // hasOwn, not `in`: "constructor"/"toString" would match Object.prototype.
  if (Object.hasOwn(CATEGORY_COLLECTIONS, category) && isAppLocale(locale)) {
    permanentRedirect({
      href: CATEGORY_COLLECTIONS[category as keyof typeof CATEGORY_COLLECTIONS],
      locale,
    });
  }

  return (
    <>
      <ProductsPageContent
        initialQuery={firstParam(query.q).toLowerCase()}
        initialFavoritesOnly={firstParam(query.favorites) === "1"}
      />
      {isAppLocale(locale) ? (
        <SeeAlsoLinks locale={locale} pages={[...COLLECTION_PAGES, "deliveryReturns", "faq"]} />
      ) : null}
    </>
  );
}
