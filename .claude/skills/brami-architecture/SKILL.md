---
name: brami-architecture
description: Архитектурен преглед и конвенции на Brami (brami.shop) — Next.js 15 App Router e-commerce магазин за козметика, двуезичен (bg/en). Използвай при добавяне на страници/компоненти/API routes, навигация из кодовата база, или въпроси "къде живее X" и "как е устроен проектът".
---

# Brami — архитектура и конвенции

E-commerce магазин за козметика (`https://www.brami.shop`). Езици: **български** (по подразбиране, без префикс) и **английски** (под `/en`). Hosting: **Vercel**.

> ⚠️ Преди да пишеш Next.js код виж `node_modules/next/dist/docs/` — това е Next.js **15.5.9** с breaking changes спрямо стари версии (виж `AGENTS.md`).

## Стек
- **Next.js 15.5.9** (App Router) + **React 19.2** + **TypeScript** (strict)
- **next-intl 4** — езици, локализирани адреси, текстове в `messages/` → виж „Езици“ по-долу
- **Tailwind CSS 3.4** (PostCSS), системен шрифт (`font-sans`; Geist е махнат)
- **Supabase** (Postgres) — данни + Storage за изображения → виж skill `brami-data-supabase`
- **bcryptjs** — пароли; собствени HMAC-подписани cookie сесии → виж skill `brami-auth-roles`
- **nodemailer** — транзакционни имейли (`src/lib/order-mail/`), на езика на поръчката
- **Speedy** API — доставка/офиси (`src/lib/speedy.ts`, `src/app/api/speedy/`)
- **TipTap** — rich-text редактор за блог в админ панела
- **OpenAI** (`gpt-4o-mini` по подразбиране) — авто-генериране на блог статии (`src/lib/blog-generate.ts`). **Не** се ползва за превод на съдържание.

## Структура на директориите
- `src/app/[locale]/` — всички страници (`page.tsx`), вкл. `admin-panel/`. Сегментът `[locale]` е `bg` или `en`.
- `src/app/api/**/route.ts` — API (без locale в пътя; езикът се взима от cookie `NEXT_LOCALE`/Referer, виж `src/lib/api-i18n.ts`)
- `src/app/sitemap.ts`, `src/app/llms.txt/route.ts`, `src/app/indexnow-key.txt/route.ts` — за търсачки и AI; `public/robots.txt`
- `src/middleware.ts` — next-intl + пренасочване на QR адреси `/products/<id>`; 307 → 308
- `src/i18n/` — `routing.ts` (езици + локализирани адреси), `navigation.ts`, `request.ts`, `client-messages.ts`
- `messages/{bg,en}/*.json` — текстовете на интерфейса (по namespace)
- `src/components/` — React компоненти; client компоненти имат `"use client"`, провайдъри завършват на `-provider.tsx` / `-context.tsx`
- `src/lib/` — server-side бизнес логика; почти всички файлове започват с `import "server-only";`
- `src/data/` — `products.ts` е data-access слой към Supabase (не статичен JSON)
- `src/assets/images/` — статични изображения с описателни имена на латиница (`products/<описателно-име>/<описателно-име>.jpg` и `-og.jpg`)
- `supabase/migrations/` — номерирани SQL миграции (до `033`)
- `scripts/*.mjs` — node скриптове (backup/restore/seed, SEO данни, превод на съдържание, проверки на текстове)
- `docs/` — планове и решения (SEO/GEO: `seo-geo-plan.md`, превод: `localization-handoff.md`)

## Ключови конвенции
- **Алиас за импорти:** `@/` → `src/`. Импортите са групирани: external → `@/...` → relative, с празни редове.
- **`import "server-only";`** в началото на всеки lib файл, който НЕ трябва да попада в клиентския бъндъл (всичко с service-role ключ или сесии).
- **API routes** почти винаги декларират:
  ```ts
  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  ```
  и guard-ват достъпа в първия ред (`await requireAdminSession()` и т.н.). Връщат `NextResponse.json(...)`; грешки → `{ error: await localizeApiError(...) }` със статус 400.
- **Root layout** (`src/app/[locale]/layout.tsx`) е `force-dynamic`, server-side зарежда продукти + сесия + профил и ги подава на верига провайдъри: `NextIntlClientProvider → ProductsProvider → UserProvider → CartProvider → FavoritesProvider → SiteChrome`. Client компонентите четат данни през hooks (`useProducts()` и т.н.), а НЕ чрез повторни fetch-ове.
- **Лек HTML:** към браузъра отива `ClientProduct` (`toClientProduct()` — без описания, отзиви, FAQ, SEO текстове) и само текстовете, нужни на client компоненти (`getPublicClientMessages()`). Когато server страница подава продукт на client компонент (напр. `ProductCard`), подай `toClientProduct(product)`.
- **Сървърни данни → клиент:** pattern е "fetch на сървъра в layout/page, подай като initial props на provider". Не fetch-вай продукти от клиента.
- **SEO/canonical:** каноничният хост е **`https://www.brami.shop`** (`SITE_URL` от `src/lib/site-url.ts`; brami.shop пренасочва към www). Никога не излагай `*.vercel.app`. Метаданни: `buildAlternates()`, `localizedUrl()`, `DEFAULT_OG_IMAGES`, `jsonLdScript()` от `src/lib/seo.ts`. За IP/гео ползвай `x-vercel-*` хедъри преди външни услуги.
- **Цени:** показват се **само в EUR**. `BGN_TO_EUR = 1.95583` (в `src/data/products.ts`) остава само за сметки. Безплатна доставка над `FREE_SHIPPING_THRESHOLD_EUR = 70`.
- **Код/идентификатори на английски**, коментари смесени.

## Езици (next-intl)
- **Никога не пиши UI текст в кода.** Добави ключа в `messages/bg/<файл>.json` и в `messages/en/<файл>.json`. Липсващ английски ключ показва българския (`scripts/check-messages.mjs` показва разликите).
- **Навигация:** `Link`, `redirect`, `permanentRedirect`, `useRouter`, `usePathname`, `getPathname` от `@/i18n/navigation` (не от `next/link` / `next/navigation`). Адресите са вътрешни (`/products`, `/about`), а `routing.ts` ги превежда (`/produkti` | `/en/products`).
- **Нова страница:** папка под `src/app/[locale]/`, локализиран адрес в `pathnames` в `src/i18n/routing.ts`, `setRequestLocale(locale)` в страницата, `generateMetadata` с `buildAlternates()` и `openGraph` с `images: DEFAULT_OG_IMAGES` (ако страницата няма собствена снимка).
- **Съдържание от базата:** български в обикновените колони, английски в JSONB `translations.en`; липсващо поле пада обратно към български. `availableLocales` решава дали английската версия е готова (иначе noindex и без hreflang).
- **Нов namespace само за server компоненти** → добави го в `SERVER_ONLY_NAMESPACES` в `src/i18n/client-messages.ts`. Namespaces, започващи с `Admin`/`AgentChat`, се подават само в админа.

## Домейн (функционалности)
- **Каталог/продукти** — `src/app/[locale]/products`, `src/app/[locale]/collections/[collection]` (тематични страници), `src/data/products.ts` (категории hair/body/face, audience, brand, badge, отстъпки, наличност, отзиви, SEO полета, баркод).
- **Количка/поръчки** — `cart-provider.tsx`, `src/app/[locale]/cart`, `api/orders/`, `src/lib/user-orders.ts`; имейл потвърждения през `src/lib/order-mail/`.
- **Доставка Speedy** — офиси/локери, `speedy-office-picker.tsx`, тарифни таблици в `products.ts`.
- **Акаунти и роли** — `user` / `merchant` / `admin` (виж `brami-auth-roles`).
- **Мърчант програма** — отстъпки по нива (`merchant-tier.ts`), промокодове (`promo-codes.ts`), комисиони (`commission-status.ts`), банкови детайли + съгласие с условия.
- **Отстъпки за клиенти** — по натрупан оборот (`user-discount.ts`).
- **Блог** — `src/app/[locale]/beauty-care`, TipTap редактор в админ, AI авто-генериране + дневен cron (`api/cron/blog-daily`).
- **FAQ** — `src/app/[locale]/faq`, `src/lib/faq.ts`.
- **Маркетинг** — абонати/имейли (`marketing-subscribers.ts`, `api/marketing/`).
- **Аналитика** — посещения/посетители (`visit-tracker.tsx`, `visit-geo.ts`, `api/track/`); посещения от AI асистенти (`src/lib/ai-referrals.ts`).
- **SEO/AI търсене** — sitemap, `robots.txt`, `/llms.txt`, JSON-LD, IndexNow (`src/lib/indexnow.ts`) → skill `brami-seo` (техника) и `brami-seo-content` (текстове на продукти/статии); план в `docs/seo-geo-plan.md`.
- **Админ панел** — `src/app/[locale]/admin-panel/*` + `api/admin/*` (продукти, поръчки, потребители, мърчанти, промокодове, блог, FAQ, AI, статистики).
