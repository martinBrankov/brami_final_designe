import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// QR codes on the product labels encode /products/<id>. Serve them straight
// from the product page, which 308-redirects to the current slug URL in one hop.
const QR_PRODUCT_PATH = /^\/products\/(\d+)\/?$/;

export default function middleware(request: NextRequest) {
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
