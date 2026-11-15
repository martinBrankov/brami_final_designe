import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { getMappedProductId } from "@/data/external-product-map";
import { routing, type AppLocale } from "@/i18n/routing";
import { CATEGORY_COLLECTIONS } from "@/lib/collections";

const intlMiddleware = createIntlMiddleware(routing);

// QR codes on the product labels encode /products/<id>. Serve them straight
// from the product page, which 308-redirects to the current slug URL in one hop.
const QR_PRODUCT_PATH = /^\/products\/(\d+)\/?$/;

const HOME_PATH = /^\/(bg|en)?\/?$/;
const PRODUCTS_PATH = /^(?:\/(bg|en))?\/(?:products|produkti)\/?$/;

function localePrefix(locale: AppLocale) {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

/**
 * Old links that carry their target in the query string. They are answered
 * here, so the pages never read the query and stay cacheable.
 */
function legacyQueryRedirect(request: NextRequest): string | null {
  const { pathname, searchParams } = request.nextUrl;

  // /?productID=<id from the old shop> → the product (via its numeric URL).
  const home = pathname.match(HOME_PATH);
  const externalId = searchParams.get("productID") ?? searchParams.get("productId");
  if (home && externalId) {
    const productId = getMappedProductId(externalId);
    if (productId) {
      const locale = (home[1] as AppLocale | undefined) ?? routing.defaultLocale;
      return `${localePrefix(locale)}/products/${productId}`;
    }
  }

  // /produkti?category=hair → the category page.
  const products = pathname.match(PRODUCTS_PATH);
  const category = searchParams.get("category") ?? "";
  // hasOwn, not `in`: "constructor"/"toString" would match Object.prototype.
  if (products && Object.hasOwn(CATEGORY_COLLECTIONS, category)) {
    const locale = (products[1] as AppLocale | undefined) ?? routing.defaultLocale;
    const collection = CATEGORY_COLLECTIONS[category as keyof typeof CATEGORY_COLLECTIONS];
    return `${localePrefix(locale)}${routing.pathnames[collection][locale]}`;
  }

  return null;
}

export default function middleware(request: NextRequest) {
  const legacyTarget = legacyQueryRedirect(request);
  if (legacyTarget) {
    return NextResponse.redirect(new URL(legacyTarget, request.url), 308);
  }

  const qrMatch = request.nextUrl.pathname.match(QR_PRODUCT_PATH);
  if (qrMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}/products/${qrMatch[1]}`;
    const headers = new Headers(request.headers);
    headers.set("X-NEXT-INTL-LOCALE", routing.defaultLocale);
    return NextResponse.rewrite(url, { request: { headers } });
  }

  const response = intlMiddleware(request);

  // With locale detection off, every redirect next-intl issues is a URL
  // canonicalisation (old internal path → localized path, /bg/x → /x). Those
  // are permanent, so search engines must get 308 instead of the default 307.
  if (response.status === 307) {
    const location = response.headers.get("location");
    if (location) {
      return NextResponse.redirect(location, 308);
    }
  }

  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension
  // (sitemap.xml, robots.txt, llms.txt, images, …).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
