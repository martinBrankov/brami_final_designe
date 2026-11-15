---
name: brami-data-supabase
description: Как Brami работи с данни през Supabase (Postgres) — клиенти, data-access слой, миграции и node скриптове. Използвай при четене/писане на данни, нова таблица/колона, промяна на схема, или backup/restore/seed.
---

# Brami — данни и Supabase

Данните живеят в **Supabase Postgres**. Изображенията на продукти са в `src/assets`, а блог изображения — в Supabase Storage (`*.supabase.co/storage/v1/object/public/**`, allow-listнато в `next.config.ts`).

> Продуктите бяха мигрирани от JSON към Supabase — `getProducts(locale)` е async; client компоненти получават продуктите през `ProductsProvider`/`useProducts()` (олекотени до `ClientProduct`), не чрез директен fetch.

## Два Supabase клиента
- `createSupabaseClient()` — `src/lib/supabase.ts`. На **сървъра** ползва service-role (или anon) ключ; в **браузъра** ползва само anon ключ. За публично четене (напр. каталог).
- `createSupabaseAdminClient()` — `src/lib/supabase-admin.ts`. Само сървър, винаги service-role. Ползва се във всичко чувствително: профили, поръчки, мърчанти, маркетинг. Тези файлове имат `import "server-only";`.

Избор: публично/четимо → `createSupabaseClient`; нещо, което заобикаля RLS или пише чувствителни данни → `createSupabaseAdminClient` в lib файл със `server-only`.

## Data-access слой
- `src/data/products.ts` — `getProducts(locale)` (React `cache`) прави един голям nested select с релации (`product_categories`, `product_images`, `product_highlights`, `product_comments`, `related_products`) и мапва DB редове към типа `Product` на дадения език (английските полета от `translations.en`, с резервен български). Тук са и:
  - `findProductByUrlKey()` — намира продукт по числово id, slug на който и да е език или стар slug (за 308 пренасочвания);
  - `getProductHref()`, `getProductBrandName()`, `getProductManufacturer()`;
  - `ClientProduct` / `toClientProduct()` — версията без дългите текстове, която отива в браузъра;
  - константите за цени/доставка.
- `src/lib/blog.ts` (`getBlogPosts(locale)`, `findBlogPostBySlug`) и `src/lib/faq.ts` (`getPublishedFaqEntries(locale)`, `findFaqEntryBySlug`) работят по същия начин. Всеки запис има `availableLocales` — езиците с готов превод (за hreflang, sitemap и noindex).
- `src/lib/*.ts` — по една област на файл (`user-auth`, `admin-data`, `promo-codes`, `merchant-tier`, `user-orders`, `marketing-subscribers`, ...). DB колоните са `snake_case`, TS типовете `camelCase`; мапването става в explicit `mapX()` функции.
- **Forward-compatible селекти:** някои функции (виж `getUserProfile`) опитват няколко select-а от най-нов към най-стар и падат назад ако колона липсва (миграцията още не е приложена). Пази този pattern при добавяне на нови колони.

## Миграции
- Файлове в `supabase/migrations/NNN_описание.sql`, номерирани последователно (текущо до `033_unique_translated_slugs.sql`).
- Нова промяна на схема → нов файл със следващия номер. Не редактирай приложени миграции.
- Прилагане: собственикът ги пуска **ръчно в Supabase Studio** (първо prod, после dev). Не ги пускай сам от скрипт без изрично разрешение.
- Състояние към 15.11.2026: 032 и 033 са приложени на prod; dev още не (dev базата беше на пауза).

## Node скриптове (`package.json`)
- `npm run backup` / `npm run restore` — backup/restore на Supabase.
- `npm run clone-schema` — клониране на схема.
- `npm run seed` — seed данни.
- `npm run sync-sequences` — синхронизира Postgres sequences (след ръчни insert-и с фиксирани id).
- `npm run add-product` — добавяне на продукт.
- `npm run migrate:merchant-terms` — конкретна миграция.
- `npm run clear-cache` — изчиства `.next/cache/fetch-cache`.
- `npm run test:seo` — регресионни тестове за SEO (`tests/seo-regressions.cjs`).
- SEO и преводи (по подразбиране са dry run; запис само с `--apply`, база с `--target=prod|dev`):
  - `scripts/seed-product-seo.mjs` — SEO данни на продуктите от `scripts/data/product-seo.json` (bg + en);
  - `scripts/i18n-content.mjs export|import` — превод на продукти/статии/FAQ през файловете в `content-i18n/` (виж README там). **Не пускай `export` върху преведените файлове** — ще изтрие прегледаните преводи;
  - `scripts/check-messages.mjs`, `scripts/check-translations.mjs` — сравняват `messages/bg` и `messages/en`;
  - `scripts/check-content-translations.mjs` — проверява `content-i18n/` преди импорт.
- Останалите (`scripts/*.mjs`): export/migrate на блог изображения и поръчки към production.

## Env променливи (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `USER_SESSION_SECRET` / `ADMIN_SESSION_SECRET` (fallback е service-role ключът)
- `OPENAI_API_KEY`, `OPENAI_MODEL` (блог генериране)
- `NEXT_PUBLIC_SITE_URL` (виж `site-url.ts` — `*.vercel.app` се игнорира; по подразбиране `https://www.brami.shop`)
- `INDEXNOW_KEY` (по желание; иначе вграден ключ в `src/lib/indexnow.ts`)
- `PROD_SUPABASE_URL` / `PROD_SUPABASE_SERVICE_ROLE_KEY` и `DEV_…` — само за node скриптовете с `--target=prod|dev`
