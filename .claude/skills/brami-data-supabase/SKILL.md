---
name: brami-data-supabase
description: Как Brami работи с данни през Supabase (Postgres) — клиенти, data-access слой, миграции и node скриптове. Използвай при четене/писане на данни, нова таблица/колона, промяна на схема, или backup/restore/seed.
---

# Brami — данни и Supabase

Данните живеят в **Supabase Postgres**. Изображенията на продукти са в `src/assets`, а блог изображения — в Supabase Storage (`*.supabase.co/storage/v1/object/public/**`, allow-listнато в `next.config.ts`).

> Продуктите бяха мигрирани от JSON към Supabase — `getProducts()` е async; client компоненти получават продуктите през `ProductsProvider`/`useProducts()`, не чрез директен fetch.

## Два Supabase клиента
- `createSupabaseClient()` — `src/lib/supabase.ts`. На **сървъра** ползва service-role (или anon) ключ; в **браузъра** ползва само anon ключ. За публично четене (напр. каталог).
- `createSupabaseAdminClient()` — `src/lib/supabase-admin.ts`. Само сървър, винаги service-role. Ползва се във всичко чувствително: профили, поръчки, мърчанти, маркетинг. Тези файлове имат `import "server-only";`.

Избор: публично/четимо → `createSupabaseClient`; нещо, което заобикаля RLS или пише чувствителни данни → `createSupabaseAdminClient` в lib файл със `server-only`.

## Data-access слой
- `src/data/products.ts` — `getProducts()` е `cache(async () => …)` (React `cache`), прави един голям nested select с релации (`product_categories`, `product_images`, `product_highlights`, `product_comments`, `related_products`) и мапва DB редове към типа `Product` чрез `mapDbProduct`. Тук са и константите за цени/доставка.
- `src/lib/*.ts` — по една област на файл (`user-auth`, `admin-data`, `promo-codes`, `merchant-tier`, `user-orders`, `marketing-subscribers`, ...). DB колоните са `snake_case`, TS типовете `camelCase`; мапването става в explicit `mapX()` функции.
- **Forward-compatible селекти:** някои функции (виж `getUserProfile`) опитват няколко select-а от най-нов към най-стар и падат назад ако колона липсва (миграцията още не е приложена). Пази този pattern при добавяне на нови колони.

## Миграции
- Файлове в `supabase/migrations/NNN_описание.sql`, номерирани последователно (текущо до `021_merchant_bank_details.sql`).
- Нова промяна на схема → нов файл със следващия номер. Не редактирай приложени миграции.
- Прилагане към production: `scripts/run-migration-on-production.mjs` (виж скрипта за употреба).

## Node скриптове (`package.json`)
- `npm run backup` / `npm run restore` — backup/restore на Supabase.
- `npm run clone-schema` — клониране на схема.
- `npm run seed` — seed данни.
- `npm run sync-sequences` — синхронизира Postgres sequences (след ръчни insert-и с фиксирани id).
- `npm run add-product` — добавяне на продукт.
- `npm run migrate:merchant-terms` — конкретна миграция.
- `npm run clear-cache` — изчиства `.next/cache/fetch-cache`.
- Останалите (`scripts/*.mjs`): export/migrate на блог изображения и поръчки към production.

## Env променливи (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `USER_SESSION_SECRET` / `ADMIN_SESSION_SECRET` (fallback е service-role ключът)
- `OPENAI_API_KEY`, `OPENAI_MODEL` (блог генериране)
- `NEXT_PUBLIC_SITE_URL` (виж `site-url.ts` — `*.vercel.app` се игнорира)
