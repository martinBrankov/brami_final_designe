# Brami — brami.shop

Online shop for natural Bulgarian cosmetics with saffron (the Saffron Adela
Sunny line by Brami Trade, plus Voditsa and Shafpol Beauty). Next.js 15.5 (App
Router) + React 19 + Supabase, hosted on Vercel at **https://www.brami.shop**
(`brami.shop` redirects to `www`).

Agent-facing conventions live in `.claude/skills/` (start with
`brami-architecture`). Plans and decisions are in `docs/`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run test:seo   # SEO regression tests (tests/seo-regressions.cjs)
```

Environment variables go in `.env.local` (Supabase, sessions, SMTP, Speedy,
OpenAI/Anthropic, Meta). `NEXT_PUBLIC_SITE_URL` defaults to
`https://www.brami.shop`; `*.vercel.app` values are ignored for SEO output.

> Do not run `next build` while `next dev` is running in the same folder:
> both write to `.next/` and the dev server starts returning 500 until restarted.

## Languages and URLs

The site is bilingual with [next-intl](https://next-intl.dev): **Bulgarian** is
the default (no prefix) and **English** lives under `/en`. Every URL is localised
— Bulgarian in Latin script, English in English:

| Page | Bulgarian | English |
| --- | --- | --- |
| Catalogue | `/produkti` | `/en/products` |
| Product | `/produkti/shampoan-s-shafran` | `/en/products/saffron-shampoo` |
| Collection | `/kozmetika-s-shafran` | `/en/saffron-cosmetics` |
| Blog | `/krasota-i-grizha` | `/en/beauty-care` |
| About | `/za-nas` | `/en/about` |

- The URL map is `pathnames` in [`src/i18n/routing.ts`](src/i18n/routing.ts).
  Code always uses the internal path (`/products`, `/about`) with `Link` /
  `redirect` from `@/i18n/navigation`.
- **QR codes:** product labels link to `/products/<id>`. These keep working
  forever and redirect (308) to the product's current URL. Old slugs
  (`products.old_slugs`) and the old auto slugs (`<name>-<id>`) redirect too.
- Interface text lives in `messages/{bg,en}/*.json`. A key missing in English
  falls back to Bulgarian. Check with `node scripts/check-messages.mjs`.
- Database content (products, articles, FAQ) keeps Bulgarian in the normal
  columns and English in `translations.en` (JSONB). An English page is indexed
  only when its key fields are translated; otherwise it is `noindex` and has no
  hreflang (`availableLocales`).
- There is **no automatic translation**. Editing the Bulgarian text does not
  change the English one: update the English fields in the admin (products,
  articles, FAQ) or the `messages/en` files. Bulk translation goes through
  `content-i18n/` (see the README there).
- Customer emails use the order's language; API errors use the visitor's
  language (`localizeApiError`, `src/lib/api-i18n.ts`).

## SEO and AI search

Plan and decisions: [`docs/seo-geo-plan.md`](docs/seo-geo-plan.md). Latest
review: [`docs/seo-review-2026-11-15.md`](docs/seo-review-2026-11-15.md).

- **Metadata:** canonical + hreflang via `buildAlternates()`, Open Graph with an
  image on every page (`DEFAULT_OG_IMAGES` when a page has none), Twitter tags
  derived from Open Graph. Helpers in [`src/lib/seo.ts`](src/lib/seo.ts).
- **Structured data:** Organization/OnlineStore + WebSite (layout), Product with
  brand, manufacturer, GTIN, offers, shipping, 14-day return policy and reviews
  (books also get `Book` + `isbn`), FAQPage, BreadcrumbList, BlogPosting,
  CollectionPage.
- **Crawling:** `sitemap.xml` (both languages, hreflang, images),
  `public/robots.txt` (AI search and training bots allowed; cart/account pages
  stay crawlable so their `noindex` is seen), `/llms.txt`.
- **IndexNow:** saving, deleting or publishing a product, article or FAQ in the
  admin notifies Bing/Copilot (`src/lib/indexnow.ts`, key at
  `/indexnow-key.txt`; production only).
- **AI visits:** admin → Statistics shows sessions from ChatGPT, Perplexity,
  Gemini, Copilot, Claude and others (`src/lib/ai-referrals.ts`).
- **Search consoles:** the sitemap is submitted to Bing Webmaster Tools (which
  also has an AI Performance report for Copilot citations). Google Search
  Console is verified via a DNS TXT record (DNS is at SuperHosting.bg).
- **Page weight:** the browser receives `ClientProduct` (no descriptions,
  reviews, FAQ or SEO texts) and only the message namespaces client components
  use (`src/i18n/client-messages.ts`).

## Product catalogue

Products live in **Supabase** and are mapped to the `Product` type in
[`src/data/products.ts`](src/data/products.ts) (`getProducts(locale)` joins
categories, audiences, images, highlights, comments and related products, and
applies the English translation for `en`).

### Pricing — euro only

All customer-facing prices are shown **in EUR only** (product cards, product detail,
cart, order confirmation / status emails, and the Product JSON-LD `priceCurrency`).
The `price_bgn` column is still stored in the DB (auto-derived from EUR × `1.95583`
in the admin form) but is **never displayed** — it is internal only. `BGN_TO_EUR`
remains as a constant purely for shipping math.

### Barcodes (GTIN / EAN / ISBN)

`products.gtin` is entered in the admin ("Баркод (EAN / GTIN)"). The admin
rejects codes with a wrong length or check digit (`src/lib/gtin.ts`), and only
valid codes are published in the Product schema (digits only). Use the barcode
printed by the manufacturer for resold brands; codes for the own line should be
GS1-registered (Bulgarian prefix 380). An ISBN (978/979…) also marks the product
as a book.

### Taxonomies (closed enums)

`brand`, `badge` and `audience` are fixed enums. **Adding a new value means editing
code in several places _and_ the DB**, not just the database:

| Taxonomy | Code to update | DB |
| --- | --- | --- |
| **Brand** | `Product["brand"]` + `allowedBrands` in `products.ts`; `brandOptions` in `products-page-content.tsx`; `admin-data.ts` type; brand `<select>` in `admin-products-manager.tsx`; brand list in `admin-stats.tsx` | `products.brand` (plain text) |
| **Badge** (etichет) | `Product["badge"]` + `allowedBadges` + `getProductBadgeLabel()` in `products.ts`; `BADGE_GRADIENTS` in `product-card.tsx`; `badgeOptions` in `products-page-content.tsx`; `admin-data.ts` type; `BADGE_LABELS` + `<select>` in `admin-products-manager.tsx`; badge list in `admin-stats.tsx` | `products.badge` (plain text) |
| **Audience** (за кого) | `Product["audience"]` + `allowedAudiences` in `products.ts`; `audienceOptions` in `products-page-content.tsx` | `audiences` row (slug) + `product_audiences` link. Admin reads audiences dynamically, so no admin code change is needed. |

Current values: brands `brami` / `Voditsa` / `Shafpol Beauty` / `other`; badges
`bestseller` / `sale` / `new` / `favorite` / `featured` / `kids` (“За деца”) / `none`;
audiences `women` / `men` / `unisex` / `kids` (“За деца”).

Labels shown to visitors come from `messages/*/products.json`, so a new value also
needs a Bulgarian and an English label.

### Product images

Images are stored under
`src/assets/images/products/<descriptive-latin-name>/` with
`<descriptive-latin-name>.jpg` (card/detail) and `<descriptive-latin-name>-og.jpg`
(social preview), e.g. `shampoan-s-shafran-saffron-adela-sunny-250-ml/`. The
descriptive name helps image search. Wiring a product's image takes **two files
plus a DB row**:

1. Import the main image as `idNN` and add it to `productImages` in
   [`src/data/product-images.ts`](src/data/product-images.ts).
2. Import the `-og.jpg` as `ogIdNN` and add it to `productOgImages` in
   [`src/data/products.ts`](src/data/products.ts).
3. Insert a `product_images` row (`product_id`, `image_src = "idNN"`, `sort_order`)
   — the card's `imageSrc` array is built from this join. Fill in `alt` (and the
   English alt) in the admin.

### Partners

The partners page ([`src/app/[locale]/partners/page.tsx`](src/app/[locale]/partners/page.tsx))
reads its partner list from the messages: `Partners.list` in
`messages/bg/legal.json` and `messages/en/legal.json`. Add a partner by appending
an entry (name, url, tagline, description, tags) to both files.

## Database migrations

SQL files in `supabase/migrations/` (currently up to `033`). The owner applies them
manually in Supabase Studio — production first, then development. `032` adds the
SEO and translation columns; `033` adds unique English slugs and triggers that keep
`blog_posts.updated_at` current. Both are applied on production; development is
pending.

## AI Marketing Agents

The multi-agent marketing system (manager / influencer / editor / marketing specialist)
runs on Claude and publishes social posts to Meta. Configure in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API key — powers all four AI agents (`src/lib/ai/`). |
| `META_PAGE_ID` | Facebook Page ID for publishing Page posts. |
| `META_PAGE_ACCESS_TOKEN` | Long-lived Page access token (also used for Instagram). |
| `IG_BUSINESS_ACCOUNT_ID` | Instagram Business account ID linked to the Page. |
| `META_GRAPH_VERSION` | Optional Graph API version (default `v21.0`). |

Existing vars reused: `CRON_SECRET` guards `/api/cron/ai-marketing` (weekly manager run),
`BLOG_NOTIFY_EMAIL`/`SALES_ORDER_EMAIL` receive the campaign summary email.

The agents only create **drafts**; an admin reviews and publishes from
`/admin-panel/ai`. Instagram posts require a publicly reachable image URL.
