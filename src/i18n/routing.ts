import { defineRouting } from "next-intl/routing";

export const locales = ["bg", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "bg";

// Internal route (the folder under src/app/[locale]) → public URL per locale.
// Bulgarian URLs are Bulgarian words in Latin script (no /bg prefix);
// English URLs live under /en. Internal paths still resolve and are
// permanently redirected by the middleware, so old links and the QR codes on
// the labels (/products/<id>) keep working.
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  // Never redirect by Accept-Language: bots and visitors get the language of
  // the URL they asked for (Google's recommendation for multilingual sites).
  localeDetection: false,
  // Remembered only so API routes and e-mails know the visitor's language;
  // it never redirects anyone (locale detection is off).
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
  // hreflang is emitted per page via `alternates` metadata, because product,
  // article and FAQ slugs differ between languages.
  alternateLinks: false,
  pathnames: {
    "/": "/",
    "/products": { bg: "/produkti", en: "/products" },
    "/products/[slug]": { bg: "/produkti/[slug]", en: "/products/[slug]" },
    "/collections/face": { bg: "/kozmetika-za-litse", en: "/face-care" },
    "/collections/hair": { bg: "/kozmetika-za-kosa", en: "/hair-care" },
    "/collections/body": { bg: "/kozmetika-za-tyalo", en: "/body-care" },
    "/collections/saffron": { bg: "/kozmetika-s-shafran", en: "/saffron-cosmetics" },
    "/collections/bulgarian": {
      bg: "/balgarska-naturalna-kozmetika",
      en: "/bulgarian-natural-cosmetics",
    },
    "/about": { bg: "/za-nas", en: "/about" },
    "/beauty-care": { bg: "/krasota-i-grizha", en: "/beauty-care" },
    "/beauty-care/[slug]": { bg: "/krasota-i-grizha/[slug]", en: "/beauty-care/[slug]" },
    "/faq": { bg: "/chesto-zadavani-vaprosi", en: "/faq" },
    "/faq/[slug]": { bg: "/chesto-zadavani-vaprosi/[slug]", en: "/faq/[slug]" },
    "/contact": { bg: "/kontakti", en: "/contact" },
    "/partners": { bg: "/partnori", en: "/partners" },
    "/delivery-returns": { bg: "/dostavka-i-vrashtane", en: "/delivery-and-returns" },
    "/terms": { bg: "/obshti-usloviya", en: "/terms-and-conditions" },
    "/privacy-policy": { bg: "/politika-za-lichni-danni", en: "/privacy-policy" },
    "/cancellation-form": { bg: "/formulyar-za-otkaz", en: "/withdrawal-form" },
    "/merchant-terms": { bg: "/usloviya-za-targovtsi", en: "/merchant-terms" },
    "/cart": { bg: "/kolichka", en: "/cart" },
    "/account": { bg: "/profil", en: "/account" },
    "/account/merchant": { bg: "/profil/targovets", en: "/account/merchant" },
    "/my-orders": { bg: "/moite-porachki", en: "/my-orders" },
    "/unsubscribe-marketing": { bg: "/otpisvane", en: "/unsubscribe" },
    "/admin-panel": "/admin-panel",
    "/admin-panel/agent-chat": "/admin-panel/agent-chat",
    "/admin-panel/ai": "/admin-panel/ai",
    "/admin-panel/blog": "/admin-panel/blog",
    "/admin-panel/blog/new": "/admin-panel/blog/new",
    "/admin-panel/blog/[id]": "/admin-panel/blog/[id]",
    "/admin-panel/faq": "/admin-panel/faq",
    "/admin-panel/marketing": "/admin-panel/marketing",
    "/admin-panel/merchants": "/admin-panel/merchants",
    "/admin-panel/orders": "/admin-panel/orders",
    "/admin-panel/orders/[id]": "/admin-panel/orders/[id]",
    "/admin-panel/products": "/admin-panel/products",
    "/admin-panel/promo-codes": "/admin-panel/promo-codes",
    "/admin-panel/stats": "/admin-panel/stats",
    "/admin-panel/users": "/admin-panel/users",
  },
});

export type AppPathname = keyof typeof routing.pathnames;

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
