import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCard } from "@/components/product-card";
import { RelatedReadingSection } from "@/components/related-reading-section";
import { SectionIntro, pageSectionClassName } from "@/components/section-intro";
import { getProductBadgeLabel, getProductHref, getProducts, toClientProduct } from "@/data/products";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { getBlogPosts } from "@/lib/blog";
import {
  COLLECTION_KEYS,
  COLLECTION_PATHS,
  filterCollectionProducts,
  isCollectionKey,
} from "@/lib/collections";
import { pickRelatedPosts } from "@/lib/related-content";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates, jsonLdScript, localizedUrl } from "@/lib/seo";

type CollectionPageProps = {
  params: Promise<{ locale: string; collection: string }>;
};

type FaqItem = { question: string; answer: string };

export function generateStaticParams() {
  return COLLECTION_KEYS.map((collection) => ({ collection }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { locale, collection } = await params;
  if (!isAppLocale(locale) || !isCollectionKey(collection)) return {};
  const t = await getTranslations({ locale, namespace: `Collections.${collection}` });
  const alternates = buildAlternates(locale, COLLECTION_PATHS[collection]);

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

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { locale, collection } = await params;
  if (!isAppLocale(locale) || !isCollectionKey(collection)) notFound();
  setRequestLocale(locale);

  const [t, tAll, tNav, tProduct, allProducts, posts] = await Promise.all([
    getTranslations({ locale, namespace: `Collections.${collection}` }),
    getTranslations({ locale, namespace: "Collections" }),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Product" }),
    getProducts(locale),
    getBlogPosts(locale),
  ]);
  const products = filterCollectionProducts(collection, allProducts);
  // Category pages get the articles about that category; the saffron and
  // Bulgarian pages cover every category, so they get the newest ones.
  const relatedPosts = pickRelatedPosts(
    collection === "saffron-face"
      ? ["face"]
      : collection === "face" || collection === "hair" || collection === "body"
        ? [collection]
        : [],
    posts,
    locale,
    { fill: true },
  );
  const body = t.raw("body") as string[];
  const faq = t.raw("faq") as FaqItem[];
  const pageUrl = localizedUrl(locale, COLLECTION_PATHS[collection]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: t("title"),
      description: t("metaDescription"),
      url: pageUrl,
      inLanguage: locale,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: localizedUrl(locale, getProductHref(product)),
          name: product.name,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: tNav("home"), item: localizedUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name: tNav("products"), item: localizedUrl(locale, "/products") },
        { "@type": "ListItem", position: 3, name: t("title"), item: pageUrl },
      ],
    },
    ...(faq.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />

      <section className={pageSectionClassName}>
        <div className="mb-3">
          <SectionIntro title={t("title")} titleAs="h1" size="page" description={t("lead")} />
        </div>
      </section>

      <section className="w-full border-y border-y-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="grid grid-cols-2 gap-x-[10px] gap-y-3 min-[640px]:flex min-[640px]:flex-wrap min-[640px]:justify-evenly min-[640px]:gap-y-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={toClientProduct(product)}
                badge={getProductBadgeLabel(product.badge, tProduct, product.discountPercent)}
                compact
                className="w-full max-w-[168px] justify-self-center min-[640px]:w-[198px] min-[640px]:max-w-[198px]"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-[#FBF8FF]">
        <div className="max-w-[860px] space-y-4 px-6 py-10 text-[#5f4b73] sm:px-10 lg:px-14">
          {body.map((paragraph) => (
            <p key={paragraph} className="leading-7">
              {paragraph}
            </p>
          ))}

          {faq.length ? (
            <div className="pt-4">
              <h2 className="font-serif text-[1.8rem] leading-tight text-[#432855]">
                {tAll("faqTitle")}
              </h2>
              <div className="mt-3">
                {faq.map((item) => (
                  <details key={item.question} className="group border-b border-[#ece3f2] py-3 last:border-b-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#432855]">
                      <span>{item.question}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855] transition group-open:rotate-180">
                        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 7.5 5 5 5-5" />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-2">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ) : null}

          <nav aria-label={tAll("moreCollections")} className="pt-4">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#8f72a7]">
              {tAll("moreCollections")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {COLLECTION_KEYS.filter((key) => key !== collection).map((key) => (
                <Link
                  key={key}
                  href={COLLECTION_PATHS[key]}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#d8d0de] bg-white px-4 text-sm font-medium text-[#432855] transition hover:bg-[#faf7fc]"
                >
                  {tAll(`${key}.title`)}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </section>

      <RelatedReadingSection
        locale={locale}
        posts={relatedPosts}
        pages={["beautyCare", "faq", "deliveryReturns", "about"]}
      />
    </main>
  );
}
