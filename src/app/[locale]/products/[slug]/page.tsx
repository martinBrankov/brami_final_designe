import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteToggleButton } from "@/components/favorite-toggle-button";
import { InfoStrip } from "@/components/info-strip";
import { ProductCarouselSection } from "@/components/product-carousel-section";
import { ProductDetailTabs } from "@/components/product-detail-tabs";
import { RecentlyViewedTracker } from "@/components/recently-viewed-tracker";
import {
  findProductByUrlKey,
  getProductBadgeLabel,
  getProductBrandName,
  getProductBySlug,
  getProductDescription,
  getProductHref,
  getProductManufacturer,
  getProductShareDescription,
  getProductsByIds,
  getProducts,
  stripHtml,
  toClientProduct,
  trimToLength,
  type Product,
} from "@/data/products";
import { Link, permanentRedirect } from "@/i18n/navigation";
import { isAppLocale, locales, type AppLocale } from "@/i18n/routing";
import { CATEGORY_COLLECTIONS } from "@/lib/collections";
import { getDisplayName } from "@/lib/display-name";
import { isValidGtin, normalizeGtin } from "@/lib/gtin";
import { getProductReviews } from "@/lib/product-reviews";
import { OG_LOCALES, absoluteUrl, buildAlternates, jsonLdScript, localizedUrl } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";
import { getUserProfile, getUserSession } from "@/lib/user-auth";
import homeScreenImgMobile from "@/assets/images/brami-naturalna-balgarska-kozmetika-s-shafran-mobile.png";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

// Return policy and delivery facts used in the Product schema. Keep in sync
// with the "Delivery and returns" page.
const RETURN_DAYS = 14;
const DELIVERY_DAYS = { min: 1, max: 3 };
const OFFICE_SHIPPING_EUR = 2.5;

const EURO_SYMBOL = "€";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0 text-[#c5a76c]">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-5 w-5 ${
            index < rating ? "fill-current" : "fill-[#eadfcb]"
          }`}
        >
          <path d="m12 3.6 2.55 5.17 5.71.83-4.13 4.02.98 5.68L12 16.62 6.89 19.3l.98-5.68-4.13-4.02 5.71-.83Z" />
        </svg>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 10.5 8 14l7.5-8" />
    </svg>
  );
}

function CartLineIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="19" r="1.2" />
      <circle cx="18" cy="19" r="1.2" />
      <path d="M3.5 5h2l1.8 8.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.74l1.4-5.26H7.2" />
    </svg>
  );
}

function parseEuroPrice(price: string) {
  const euroMatch = price.match(/€\s?(\d+[.,]?\d*)/i);

  if (euroMatch) {
    return Number.parseFloat(euroMatch[1].replace(",", "."));
  }

  return 0;
}

function formatEuroPrice(price: number) {
  return `${EURO_SYMBOL}${price.toFixed(2)}`;
}

function imageUrl(image: unknown): string {
  return typeof image === "object" && image !== null && "src" in image
    ? absoluteUrl(String((image as { src: string }).src))
    : absoluteUrl(homeScreenImgMobile.src);
}

function getPricing(product: Product) {
  const originalPriceEuro = parseEuroPrice(product.price);
  const isOnSale = product.badge === "sale";
  const discountFactor = isOnSale && product.discountPercent ? 1 - product.discountPercent / 100 : 0.8;
  const currentPriceEuro = isOnSale && originalPriceEuro ? originalPriceEuro * discountFactor : originalPriceEuro;
  const oldPriceEuro = isOnSale ? originalPriceEuro : null;
  return { currentPriceEuro, oldPriceEuro };
}

/**
 * Looks the product up by the slug of the requested language. Anything else
 * that identifies it (numeric id from the QR codes, a slug in another
 * language, a retired slug) is permanently redirected to the current URL.
 */
async function resolveProduct(locale: AppLocale, slug: string) {
  const allProducts = await getProducts(locale);
  const decodedSlug = decodeURIComponent(slug);
  const product = getProductBySlug(allProducts, decodedSlug);

  if (!product) {
    const match = findProductByUrlKey(allProducts, decodedSlug);
    if (match) {
      permanentRedirect({ href: getProductHref(match), locale });
    }
    notFound();
  }

  return { product, allProducts };
}

function productAlternates(locale: AppLocale, product: Product) {
  return buildAlternates(
    locale,
    Object.fromEntries(
      locales.map((l) => [l, { pathname: "/products/[slug]", params: { slug: product.slugs[l] } }]),
    ) as Record<AppLocale, { pathname: "/products/[slug]"; params: { slug: string } }>,
    product.availableLocales,
  );
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const allProducts = await getProducts(locale);
  const product = getProductBySlug(allProducts, decodeURIComponent(slug));

  if (!product) {
    // The page itself redirects or 404s.
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Product" });
  const description = getProductShareDescription(product, t);
  const title = product.seoTitle || product.name;
  const alternates = productAlternates(locale, product);

  const ogImg = product.ogImage ?? product.imageSrc[0];
  const ogImageUrl = imageUrl(ogImg);
  const ogWidth =
    ogImg && typeof ogImg === "object" && "width" in ogImg
      ? Number(ogImg.width)
      : homeScreenImgMobile.width;
  const ogHeight =
    ogImg && typeof ogImg === "object" && "height" in ogImg
      ? Number(ogImg.height)
      : homeScreenImgMobile.height;

  return {
    // seo_title already carries the brand; don't append " | Brami" twice.
    title: product.seoTitle ? { absolute: product.seoTitle } : product.name,
    description,
    alternates,
    ...(!product.availableLocales.includes(locale) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      locale: OG_LOCALES[locale],
      url: alternates.canonical as string,
      title,
      description,
      images: [{ url: ogImageUrl, width: ogWidth, height: ogHeight, alt: product.imageAlts[0] ?? product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);

  const { product, allProducts } = await resolveProduct(locale, slug);
  const [t, tNav, tCategories] = await Promise.all([
    getTranslations({ locale, namespace: "Product" }),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Categories" }),
  ]);

  const productImage = product.imageSrc[0];
  const productDescription = getProductDescription(product, t);
  const primaryCategory = product.category[0];
  const categoryLabel = primaryCategory ? tCategories(primaryCategory) : tNav("products");
  const categoryHref = primaryCategory ? CATEGORY_COLLECTIONS[primaryCategory] : "/products";
  const { currentPriceEuro, oldPriceEuro } = getPricing(product);
  const isInStock = product.stock > 0;
  const brandName = getProductBrandName(product);
  const manufacturer = getProductManufacturer(product);
  const relatedProducts = getProductsByIds(allProducts, product.relatedProductIds).filter(
    (relatedProduct) => relatedProduct.id !== product.id,
  );

  // User-submitted reviews (stored in DB) merged with the seed testimonials.
  const [session, userReviews] = await Promise.all([
    getUserSession(),
    getProductReviews(product.id),
  ]);
  const currentUserReview = session
    ? userReviews.find((review) => review.userId === session.id) ?? null
    : null;

  // Prefill the review name with the profile name ("Име"), falling back to a
  // readable name derived from the email when it's missing.
  const sessionProfile = session ? await getUserProfile(session.id) : null;
  const reviewerName = session
    ? getDisplayName(sessionProfile?.fullName, session.email)
    : "";

  // Only reviews that include a written comment are listed; rating-only
  // submissions still count toward the average below.
  const commentedUserReviews = userReviews.filter((review) => review.comment.trim().length > 0);
  const displayReviews = [
    ...commentedUserReviews.map((review) => ({
      id: review.id,
      kind: "review" as const,
      name: review.authorName,
      comment: review.comment,
      rating: review.rating,
      data: new Date(review.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "bg-BG", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    })),
    ...product.comments.map((comment) => ({
      id: String(comment.id),
      kind: "comment" as const,
      name: comment.name,
      comment: comment.comment,
      rating: comment.rating,
      data: comment.data,
    })),
  ];

  // Same source as the product cards (computed in getProducts) so the star
  // rating and vote count are identical everywhere.
  const reviewCount = product.reviewCount;
  const averageRating = product.averageRating;

  const productUrl = localizedUrl(locale, getProductHref(product));
  const homeUrl = localizedUrl(locale, "/");

  // Specs table: easy to quote for AI answers, and the same facts as the schema.
  const specs = [
    brandName ? { label: t("specs.brand"), value: brandName } : null,
    manufacturer ? { label: t("specs.manufacturer"), value: manufacturer } : null,
    manufacturer ? { label: t("specs.origin"), value: t("specs.originBulgaria") } : null,
    { label: t("specs.packaging"), value: product.packaging },
    primaryCategory
      ? { label: t("specs.category"), value: product.category.map((c) => tCategories(c)).join(", ") }
      : null,
    product.checkboxInfo.length
      ? { label: t("specs.highlights"), value: product.checkboxInfo.join(" · ") }
      : null,
    { label: t("specs.price"), value: formatEuroPrice(currentPriceEuro) },
    { label: t("specs.availability"), value: isInStock ? t("inStock") : t("outOfStock") },
  ].filter((row): row is { label: string; value: string } => row !== null);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: tNav("home"), item: homeUrl },
      { "@type": "ListItem", position: 2, name: tNav("products"), item: localizedUrl(locale, "/products") },
      { "@type": "ListItem", position: 3, name: categoryLabel, item: localizedUrl(locale, categoryHref) },
      { "@type": "ListItem", position: 4, name: product.name, item: productUrl },
    ],
  };

  // Digits only: Google expects a bare GTIN (an ISBN-13 is a GTIN-13 with prefix 978/979).
  // An invalid code is left out: a wrong GTIN is worse than none.
  const gtinDigits = normalizeGtin(product.gtin);
  const gtin = isValidGtin(gtinDigits) ? gtinDigits : null;
  const isbn = gtin && /^97[89]\d{10}$/.test(gtin) ? gtin : null;
  const isBook = Boolean(isbn) || /ISBN/i.test(product.description);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": isBook ? ["Product", "Book"] : "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    url: productUrl,
    sku: String(product.id),
    ...(gtin ? { gtin } : {}),
    ...(isbn ? { isbn } : {}),
    image: product.imageSrc.map((image) => imageUrl(image)),
    description: trimToLength(stripHtml(product.summary || product.description), 1000),
    // For a book this is the book's language (Bulgarian), not the page's.
    inLanguage: isBook ? "bg" : locale,
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    ...(manufacturer
      ? {
          manufacturer: { "@type": "Organization", name: manufacturer, "@id": `${SITE_URL}/#organization` },
          countryOfOrigin: { "@type": "Country", name: t("specs.originBulgaria"), identifier: "BG" },
        }
      : {}),
    ...(primaryCategory ? { category: categoryLabel } : {}),
    additionalProperty: [
      { "@type": "PropertyValue", name: t("specs.packaging"), value: product.packaging },
      ...product.checkboxInfo.map((value) => ({
        "@type": "PropertyValue",
        name: t("specs.highlights"),
        value,
      })),
    ],
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "EUR",
      price: currentPriceEuro.toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Brami", "@id": `${SITE_URL}/#organization` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: OFFICE_SHIPPING_EUR, currency: "EUR" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "BG" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: DELIVERY_DAYS.min,
            maxValue: DELIVERY_DAYS.max,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BG",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: RETURN_DAYS,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      },
    },
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(averageRating.toFixed(1)),
        reviewCount,
        bestRating: 5,
      },
    }),
    ...(displayReviews.length
      ? {
          review: displayReviews.slice(0, 10).map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.name },
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
            reviewBody: review.comment,
          })),
        }
      : {}),
  };

  const faqJsonLd = product.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: product.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(productJsonLd)} />
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
      ) : null}
      <RecentlyViewedTracker productId={product.id} />
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
            <Link href="/products" className="shrink-0 transition hover:text-[#432855]">
              {tNav("products")}
            </Link>
            <span className="shrink-0 text-[#b7a8c3]">/</span>
            <Link href={categoryHref} className="shrink-0 transition hover:text-[#432855]">
              {categoryLabel}
            </Link>
            <span className="shrink-0 text-[#b7a8c3]">/</span>
            <span className="min-w-0 truncate text-[#5f4b73]">{product.name}</span>
          </nav>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(340px,520px)_minmax(320px,520px)] xl:items-stretch xl:gap-10">
            <div className="relative mx-auto w-full max-w-[400px] overflow-hidden rounded-[28px] bg-white max-xl:mx-0 xl:mx-0 xl:max-w-[600px] [@media(orientation:landscape)_and_(max-width:932px)]:mx-0 [@media(orientation:landscape)_and_(max-width:932px)]:max-w-[200px]">
              <div className="relative rounded-[28px] border border-[#d8d0de] bg-[linear-gradient(180deg,#fcfbfd_0%,#f4eef8_100%)] p-0">
                <div className="overflow-hidden rounded-[28px]">
                  {productImage ? (
                    <Image
                      src={productImage}
                      alt={product.imageAlts[0] ?? product.name}
                      priority
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-[#f3edf7]" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex h-full flex-col justify-between">
              {product.badge !== "none" ? (
                <div className="mb-3">
                  <span className="inline-flex rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-3 py-1 text-xs font-semibold text-white">
                    {getProductBadgeLabel(product.badge, t, product.discountPercent)}
                  </span>
                </div>
              ) : null}
              <h1 className="font-serif text-[2.2rem] leading-tight text-[#432855] sm:text-[3rem]">
                {product.name}
              </h1>

              {product.summary ? (
                <p className="mt-3 text-[15px] leading-6 text-[#5f4b73] sm:text-base">
                  {product.summary}
                </p>
              ) : null}

              <div className="mt-4 flex flex-col gap-2">
                {isInStock ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-[#4f875d]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#68b27b]" />
                    {t("inStock")}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium text-[#8f7a9d]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#c9bcd3]" />
                    {t("outOfStock")}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <StarRow rating={averageRating} />
                  <span className="text-sm font-medium text-[#6b587f]">
                    ({t("ratingCount", { count: reviewCount })})
                  </span>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-[#6b587f]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f3edf7] text-[#6c3f8d]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 3.5h6" />
                    <path d="M8 3.5v3l-3.4 5.7A3 3 0 0 0 7.2 16.5h5.6a3 3 0 0 0 2.6-4.3L12 6.5v-3" />
                  </svg>
                </span>
                <span className="text-sm font-medium">
                  {t("specs.packaging")}: {product.packaging}
                </span>
              </div>

              <div className="mt-5">
                <div className="flex flex-col gap-2">
                  {product.checkboxInfo.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-[#5f4b73]"
                    >
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#efe7f4] text-[#6c3f8d]">
                        <CheckIcon />
                      </span>
                      <span className="text-[15px] font-medium leading-5 sm:text-base">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <span className="text-4xl font-semibold leading-none text-[#432855] sm:text-[2.7rem]">
                    {currentPriceEuro ? formatEuroPrice(currentPriceEuro) : product.price}
                  </span>
                  {oldPriceEuro ? (
                    <span className="text-xl font-medium text-[#8f7a9d] line-through">
                      {formatEuroPrice(oldPriceEuro)}
                    </span>
                  ) : null}
                </div>

                <AddToCartButton
                  productId={product.id}
                  stock={product.stock}
                  className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-8 text-sm font-semibold uppercase tracking-[0.08em] text-white sm:text-base"
                >
                  <CartLineIcon />
                  {t("addToCart")}
                </AddToCartButton>

                <FavoriteToggleButton
                  productId={product.id}
                  className="mt-3 h-12 w-full"
                />
              </div>
            </div>
          </div>
        </div>

      </section>

      <ProductDetailTabs
        productId={product.id}
        productName={product.name}
        description={productDescription}
        reviews={displayReviews}
        isAuthenticated={Boolean(session)}
        isAdmin={session?.role === "admin"}
        userName={reviewerName}
        initialUserReview={
          currentUserReview
            ? { rating: currentUserReview.rating, comment: currentUserReview.comment }
            : null
        }
      >
        <div className="pt-2">
          <h3 className="font-serif text-[1.5rem] leading-tight text-[#432855]">
            {t("specs.title")}
          </h3>
          <table className="mt-4 w-full max-w-[720px] border-collapse text-left text-[15px] text-[#5f4b73]">
            <tbody>
              {specs.map((row) => (
                <tr key={row.label} className="border-b border-[#ece3f2] last:border-b-0">
                  <th scope="row" className="w-[40%] py-2.5 pr-4 align-top font-semibold text-[#432855]">
                    {row.label}
                  </th>
                  <td className="py-2.5 align-top">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {product.faq.length ? (
          <div className="pt-4">
            <h3 className="font-serif text-[1.5rem] leading-tight text-[#432855]">
              {t("faqTitle")}
            </h3>
            <div className="mt-3 max-w-[720px]">
              {product.faq.map((item) => (
                <details
                  key={item.question}
                  className="group border-b border-[#ece3f2] py-3 last:border-b-0"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#432855]">
                    <span>{item.question}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855] transition group-open:rotate-180">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m5 7.5 5 5 5-5" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-2 text-[#5f4b73]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        ) : null}
      </ProductDetailTabs>

      <ProductCarouselSection
        title={t("relatedProducts")}
        products={relatedProducts.map(toClientProduct)}
      />

      <InfoStrip className="border-b-0 bg-transparent" />
    </main>
  );
}
