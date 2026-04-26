import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import { CartProvider } from "@/components/cart-provider";
import { BottomBar } from "@/components/bottom-bar";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { FavoritesProvider } from "@/components/favorites-provider";
import { InteractionGuard } from "@/components/interaction-guard";
import { Navbar } from "@/components/navbar";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fallbackSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://brami.shop";

async function resolveSiteUrl() {
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");

  if (host) {
    const protocol =
      forwardedProto || (host.includes("localhost") || host.startsWith("192.168.") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return fallbackSiteUrl;
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await resolveSiteUrl();
  const defaultOgImageUrl = new URL("/og-logo.png", siteUrl).toString();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Brami",
      template: "%s | Brami",
    },
    description:
      "Brami предлага козметика и селекция от продукти за лице, тяло и коса с бърза онлайн поръчка.",
    openGraph: {
      type: "website",
      locale: "bg_BG",
      url: siteUrl,
      siteName: "Brami",
      title: "Brami",
      description:
        "Козметика и селекция от продукти за лице, тяло и коса с бърза онлайн поръчка.",
      images: [
        {
          url: defaultOgImageUrl,
          width: 300,
          height: 145,
          alt: "Brami",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Brami",
      description:
        "Козметика и селекция от продукти за лице, тяло и коса с бърза онлайн поръчка.",
      images: [defaultOgImageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bg"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="content-protected min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Brami",
              url: "https://brami.shop",
              logo: "https://brami.shop/og-logo.png",
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+359-889-342-781",
                contactType: "customer service",
                availableLanguage: "Bulgarian",
              },
              sameAs: [
                "https://www.facebook.com/Bramitrade",
                "https://www.instagram.com/Bramitrade",
              ],
            }),
          }}
        />
        <InteractionGuard />
        <CartProvider>
          <FavoritesProvider>
            <Navbar />
            <div className="flex-1">{children}</div>
            <BottomBar />
            <CookieConsentBanner />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
