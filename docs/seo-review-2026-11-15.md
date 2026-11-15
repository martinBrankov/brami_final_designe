# Public-site SEO review — 2026-11-15

Scope: direct HTTP audit of https://www.brami.shop and comparison with the current working tree. This review did not modify application code or deployment settings. The working tree already contains unpublished edits, including the book schema correction.

## Passed

- All 136 sitemap URLs returned HTTP 200, with self-referencing canonical URLs on www.brami.shop and no noindex directive.
- All sitemap pages have one H1, a title and a meta description. No duplicate titles or meta descriptions were found in this set.
- Every HTML hreflang target is present in the audited sitemap and has a reciprocal alternate link.
- Embedded JSON-LD parses successfully on every audited page. This is syntax validation, not a Google Rich Results eligibility test.
- All rendered image elements have an alt attribute; the review does not certify the descriptive quality of every alt value.
- Sample old numeric and language-specific product URLs redirect with 308; nonexistent product and arbitrary page URLs return 404 with noindex.
- The 136 live URLs and English metadata demonstrate that the localisation release is now published.

## Findings

### 1. P2 — Invalid product identifier in the published Product schema

Both versions of the Voditsa illuminating face mask emit GTIN `38005026593037`. Its last digit is 7, but the GS1 checksum of the preceding digits is 4. Do not simply replace the final digit: verify the actual barcode on the packaging or with the supplier, because the body of the identifier may also be mistyped. Validate GTIN length and checksum on admin save and omit unverified invalid identifiers from structured data.

Example: https://www.brami.shop/en/products/voditsa-illuminating-face-mask

The book also currently emits the hyphenated value `978-619-93643-0-7` in `gtin`; its English page declares the Bulgarian book's `inLanguage` as `en`. A local, uncommitted correction in `src/app/[locale]/products/[slug]/page.tsx` already strips GTIN punctuation, emits ISBN and uses the book's Bulgarian language. It needs validation and deployment.

Reference: https://www.gs1us.org/tools/check-digit-calculator

### 2. P2 — Invalid category input causes an HTTP 500

`https://www.brami.shop/produkti?category=constructor` returns 500. In `src/app/[locale]/products/page.tsx:46`, the `in` operator accepts inherited object properties, so this value is incorrectly treated as a category route. Use an own-property check or an explicit category allowlist; unknown categories should be ignored or handled deliberately, rather than crashing the catalogue.

Control: `?category=face` correctly returns 308 to `/kozmetika-za-litse`.

### 3. P2 — Canonical host redirect is temporary

Requests to `https://brami.shop/`, `/en`, `/sitemap.xml` and product URLs return 307 to the corresponding www URL. The site consistently chooses www in canonical tags and robots.txt, so configure the domain redirect in hosting as 301 or 308. Existing product-route redirects are already permanent.

Reference: https://developers.google.com/search/docs/crawling-indexing/301-redirects

### 4. P2 — Robots disallows prevent crawlers from reading noindex

`/kolichka`, `/en/cart`, `/profil` and `/en/account` are disallowed in robots.txt while the public pages emit noindex. A blocked crawler cannot read that directive. For public utility pages that should be removed from search, allow crawling and retain noindex. Keep access controls for private/admin content; do not treat robots.txt as access control. This review has not established that these URLs are currently indexed.

Reference: https://developers.google.com/search/docs/crawling-indexing/robots/intro

### 5. P2 — Offer validity dates are generated rather than sourced

The product template computes `priceValidUntil` as December 31 of the following year. Published offers currently all emit `2027-12-31`; the value does not come from a price/promotion expiry field. Omit it when there is no real expiry, or populate it from an actual offer date.

Source: `src/app/[locale]/products/[slug]/page.tsx:325` and `:364`.

### 6. P3 — Article/category social metadata inherits the homepage text

86 non-home, non-product pages have twitter:title different from their page-specific og:title. For example, `/en/beauty-care/the-role-of-saffron-in-face-and-body-creams` has the correct article title in Open Graph but the generic store title and description in Twitter metadata. The parent layout supplies those fields and only product detail pages override them. Set page-specific Twitter metadata or remove the generic title/description override where appropriate. This affects link previews; it is not evidence of a Google ranking penalty.

Source: `src/app/[locale]/layout.tsx:59`.

## Further opportunities

- The language switcher reuses the source-language slug. EN to BG on a product currently takes two 308 redirects before the final page; BG to EN takes one. Link to the known translated slug directly. Example: `/bg/produkti/saffron-face-cream` → `/produkti/saffron-face-cream` → `/produkti/krem-za-litse-s-shafran`.
- Median decompressed HTML size in the audit is about 356 KB, with the blog list about 495 KB. The root layout serialises the full product catalogue through ProductsProvider on every page. Investigate a smaller client payload and separately measure mobile Core Web Vitals. These byte measurements are not a Lighthouse score or evidence that CWV fails.

## Limits and evidence

No authenticated Search Console, Merchant Center, Rich Results Test or field Core Web Vitals report was available in this review. Indexing/ranking outcomes are therefore not certified. Shipping schema currently describes the office rate; no single audited product costs at least EUR 70, so a free-shipping mismatch for an individual product offer was not established.

Detailed HTTP observations are saved locally in ignored `backups/seo-audit/public-pages.json` and `backups/seo-audit/sitemap.xml`.

## Resolution (Anthropic, 2026-11-15)

Fixed in the working tree, verified on a local production build; not yet deployed unless noted.

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | Invalid GTIN | The Voditsa mask code was already corrected in the database (`3800502659037`, valid); all 21 stored codes pass the GS1 checksum. New `src/lib/gtin.ts`: the admin rejects invalid codes on save, and the Product schema emits only valid, digits-only GTINs. ISBN products also emit `isbn` and `inLanguage: "bg"`. |
| 2 | `?category=constructor` → 500 | `Object.hasOwn` instead of `in` (also in the agent-chat provider lookup). Returns 200; `?category=hair` still 308s. |
| 3 | Temporary 307 apex redirect | Hosting setting — owner to switch it to 308 in Vercel → Domains. |
| 4 | Robots blocks noindex pages | Cart, account and my-orders paths removed from `Disallow`; they keep `noindex`. Unsubscribe stays blocked (links carry personal tokens). |
| 5 | Generated `priceValidUntil` | Removed. |
| 6 | Twitter metadata inherited | The layout sets only `twitter.card`; Next.js derives title/description/image from each page's Open Graph. Pages without an image now use `DEFAULT_OG_IMAGES`. |
| — | Language switcher redirect chain | On click it follows the page's hreflang alternate directly (falls back to the slug link when the head is stale or has no alternate). |
| — | Large HTML | `ClientProduct` for the client catalogue and filtered client messages: public pages are 48–65% smaller (home 386 → 146 KB, product 428 → 190 KB, blog 495 → 258 KB). Core Web Vitals not measured. |
