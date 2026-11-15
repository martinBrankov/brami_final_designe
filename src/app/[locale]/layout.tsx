import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { CartProvider } from "@/components/cart-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { InteractionGuard } from "@/components/interaction-guard";
import { ProductsProvider } from "@/components/products-context";
import { SiteChrome } from "@/components/site-chrome";
import { UserProvider } from "@/components/user-provider";
import { getProducts, toClientProduct } from "@/data/products";
import { getPublicClientMessages } from "@/i18n/client-messages";
import { isAppLocale, locales, type AppLocale } from "@/i18n/routing";
import { OG_LOCALES, absoluteUrl, jsonLdScript } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

import "../globals.css";

// Public pages are rendered once and served from the cache (ISR). The layout
// reads nothing from the request: the signed-in visitor is loaded in the
// browser by UserProvider. Admin saves refresh the cache at once
// (revalidatePublicContent); this is only the fallback interval.
export const revalidate = 600;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type LayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    // Canonical URLs always use the production domain, never the request host.
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("defaultTitle"),
      template: "%s | Brami",
    },
    description: t("description"),
    // No `alternates` here: child pages would inherit the home canonical.
    openGraph: {
      type: "website",
      locale: OG_LOCALES[locale],
      alternateLocale: Object.entries(OG_LOCALES)
        .filter(([l]) => l !== locale)
        .map(([, og]) => og),
      url: absoluteUrl(locale === "bg" ? "/" : `/${locale}`),
      siteName: "Brami",
      title: t("defaultTitle"),
      description: t("ogDescription"),
    },
    // Card type only: Next.js fills twitter:title/description/image from each
    // page's openGraph. A title here would be inherited by every page instead.
    twitter: {
      card: "summary_large_image",
    },
  };
}

async function getSiteJsonLd(locale: AppLocale) {
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const homeUrl = absoluteUrl(locale === "bg" ? "/" : `/${locale}`);

  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${SITE_URL}/#organization`,
      name: "Brami",
      legalName: "Brami Trade",
      url: SITE_URL,
      logo: absoluteUrl("/og-logo.png"),
      description: t("organizationDescription"),
      founder: { "@type": "Person", name: t("founderName") },
      areaServed: { "@type": "Country", name: t("countryName"), identifier: "BG" },
      address: {
        "@type": "PostalAddress",
        streetAddress: t("streetAddress"),
        addressLocality: t("city"),
        postalCode: "1588",
        addressCountry: "BG",
      },
      email: "info@brami.shop",
      telephone: "+359889342781",
      // ЕИК (company registration number), not a VAT number.
      taxID: "206426005",
      knowsAbout: t("organizationKnowsAbout").split("|"),
      brand: [
        {
          "@type": "Brand",
          name: "Saffron Adela Sunny",
          description: t("saffronLineDescription"),
        },
      ],
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+359-889-342-781",
        contactType: "customer service",
        areaServed: "BG",
        availableLanguage: ["Bulgarian", "English"],
      },
      sameAs: [
        "https://www.facebook.com/Bramitrade",
        "https://www.instagram.com/Bramitrade",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${homeUrl}#website`,
      name: "Brami",
      url: homeUrl,
      inLanguage: locale,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ];
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const products = await getProducts(locale);

  return (
    <html
      lang={locale}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(await getSiteJsonLd(locale))}
        />
        <InteractionGuard />
        <NextIntlClientProvider messages={getPublicClientMessages(await getMessages())}>
          <ProductsProvider products={products.map(toClientProduct)}>
            <UserProvider>
              <CartProvider>
                <FavoritesProvider>
                  <SiteChrome>{children}</SiteChrome>
                </FavoritesProvider>
              </CartProvider>
            </UserProvider>
          </ProductsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
