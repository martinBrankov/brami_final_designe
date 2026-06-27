---
name: brami-architecture
description: Архитектурен преглед и конвенции на Brami (brami.shop) — Next.js 15 App Router e-commerce магазин за козметика. Използвай при добавяне на страници/компоненти/API routes, навигация из кодовата база, или въпроси "къде живее X" и "как е устроен проектът".
---

# Brami — архитектура и конвенции

E-commerce магазин за козметика (`brami.shop`), UI език: **български**. Hosting: **Vercel**.

> ⚠️ Преди да пишеш Next.js код виж `node_modules/next/dist/docs/` — това е Next.js **15.5.9** с breaking changes спрямо стари версии (виж `AGENTS.md`).

## Стек
- **Next.js 15.5.9** (App Router) + **React 19.2** + **TypeScript** (strict)
- **Tailwind CSS 3.4** (PostCSS), шрифтове Geist/Geist_Mono през `next/font`
- **Supabase** (Postgres) — данни + Storage за изображения → виж skill `brami-data-supabase`
- **bcryptjs** — пароли; собствени HMAC-подписани cookie сесии → виж skill `brami-auth-roles`
- **nodemailer** — транзакционни имейли (`src/lib/order-mail/`)
- **Speedy** API — доставка/офиси (`src/lib/speedy.ts`, `src/app/api/speedy/`)
- **TipTap** — rich-text редактор за блог в админ панела
- **OpenAI** (`gpt-4o-mini` по подразбиране) — авто-генериране на блог статии (`src/lib/blog-generate.ts`)

## Структура на директориите
- `src/app/` — App Router страници (`page.tsx`) и API (`api/**/route.ts`)
- `src/components/` — React компоненти; client компоненти имат `"use client"`, провайдъри завършват на `-provider.tsx`
- `src/lib/` — server-side бизнес логика; почти всички файлове започват с `import "server-only";`
- `src/data/` — данни/трансформации (`products.ts` е data-access слой към Supabase, не статичен JSON)
- `src/assets/` — статични изображения на продукти (`images/products/<id>/`)
- `supabase/migrations/` — номерирани SQL миграции
- `scripts/*.mjs` — node скриптове за backup/restore/seed/миграции (виж `package.json`)

## Ключови конвенции
- **Алиас за импорти:** `@/` → `src/`. Импортите са групирани: external → `@/...` → relative, с празни редове.
- **`import "server-only";`** в началото на всеки lib файл, който НЕ трябва да попада в клиентския бъндъл (всичко с service-role ключ или сесии).
- **API routes** почти винаги декларират:
  ```ts
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  ```
  и guard-ват достъпа в първия ред (`await requireAdminSession()` и т.н.). Връщат `NextResponse.json(...)`; грешки → `{ error }` със статус 400.
- **Root layout** (`src/app/layout.tsx`) е `force-dynamic`, server-side зарежда продукти + сесия + профил и ги подава на верига провайдъри: `ProductsProvider → UserProvider → CartProvider → FavoritesProvider → SiteChrome`. Client компонентите четат данни през hooks (`useProducts()` и т.н.), а НЕ чрез повторни fetch-ове.
- **Сървърни данни → клиент:** pattern е "fetch на сървъра в layout/page, подай като initial props на provider". Не fetch-вай продукти от клиента.
- **SEO/canonical:** използвай `SITE_URL` / `resolveSiteUrl()` от `src/lib/site-url.ts`. Никога не излагай `*.vercel.app` хост в canonical/OG — fallback е `https://brami.shop`. За IP/гео ползвай `x-vercel-*` хедъри преди външни услуги.
- **Цени:** BGN↔EUR курс `BGN_TO_EUR = 1.95583` (в `src/data/products.ts`). Безплатна доставка над `FREE_SHIPPING_THRESHOLD_EUR = 70`. Цени се показват като `"€X/Yлв."`.
- **Език:** целият UI текст и валидационни съобщения са на български; кодът/идентификаторите на английски; коментарите смесени.

## Домейн (функционалности)
- **Каталог/продукти** — `src/app/products`, `src/data/products.ts` (категории hair/body/face, audience, brand, badge, отстъпки, наличност, отзиви).
- **Количка/поръчки** — `cart-provider.tsx`, `src/app/cart`, `api/orders/`, `src/lib/user-orders.ts`; имейл потвърждения през `src/lib/order-mail/`.
- **Доставка Speedy** — офиси/локери, `speedy-office-picker.tsx`, тарифни таблици в `products.ts`.
- **Акаунти и роли** — `user` / `merchant` / `admin` (виж `brami-auth-roles`).
- **Мърчант програма** — отстъпки по нива (`merchant-tier.ts`), промокодове (`promo-codes.ts`), комисиони (`commission-status.ts`), банкови детайли + съгласие с условия.
- **Отстъпки за клиенти** — по натрупан оборот (`user-discount.ts`).
- **Блог** — `src/app/beauty-care`, TipTap редактор в админ, AI авто-генериране + дневен cron (`api/cron/blog-daily`).
- **Маркетинг** — абонати/имейли (`marketing-subscribers.ts`, `api/marketing/`).
- **Аналитика** — посещения/посетители (`visit-tracker.tsx`, `visit-geo.ts`, `api/track/`).
- **Админ панел** — `src/app/admin-panel/*` + `api/admin/*` (продукти, поръчки, потребители, мърчанти, промокодове, блог, статистики).
