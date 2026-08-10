This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Product Catalog

Products live in **Supabase** and are mapped to the `Product` type in
[`src/data/products.ts`](src/data/products.ts) (`getProducts()` joins categories,
audiences, images, highlights, comments and related products).

### Pricing — euro only

All customer-facing prices are shown **in EUR only** (product cards, product detail,
cart, order confirmation / status emails, and the Product JSON-LD `priceCurrency`).
The `price_bgn` column is still stored in the DB (auto-derived from EUR × `1.95583`
in the admin form) but is **never displayed** — it is internal only. `BGN_TO_EUR`
remains as a constant purely for shipping math.

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

### Product images

Images are stored under `src/assets/images/products/<zero-padded-id>/` with
`01.jpg` (card/detail) and `og.jpg` (social preview). Wiring a product's image
takes **two files plus a DB row**:

1. Import the `01.jpg` as `idNN` and add it to `productImages` in
   [`src/data/product-images.ts`](src/data/product-images.ts).
2. Import the `og.jpg` as `ogIdNN` and add it to `productOgImages` in
   [`src/data/products.ts`](src/data/products.ts).
3. Insert a `product_images` row (`product_id`, `image_src = "idNN"`, `sort_order`)
   — the card's `imageSrc` array is built from this join.

### Partners

The partners page ([`src/app/partners/page.tsx`](src/app/partners/page.tsx)) is a
static `Partner[]` array (name, url, tagline, description, tags). Add a partner by
appending an entry and updating the page metadata.

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
