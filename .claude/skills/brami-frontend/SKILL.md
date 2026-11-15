---
name: brami-frontend
description: Brami фронтенд — React 19 компоненти, provider верига, Server/Client разделение, Tailwind стилове, форми и hooks. Използвай при създаване/промяна на UI компонент, страница, стилизиране или работа с клиентско състояние (количка, потребител, любими).
---

# Brami — Фронтенд

Next.js 15.5.9 App Router + React 19.2 + Tailwind CSS 3.4 + next-intl 4. Езици: **български** (по подразбиране) и **английски** (`/en`).

> ⚠️ Виж `node_modules/next/dist/docs/` — Next.js 15 има breaking changes (async params, поведение на Server/Client компоненти).

## Server vs Client — Златното Правило

**Default = Server Component.** Добавяй `"use client"` само когато трябва:
- state/effects (`useState`, `useEffect`)
- event handlers (`onClick`, `onChange`)
- browser APIs (`localStorage`, `window`)
- Context hooks

**Данните текат надолу, не се fetch-ват отново.** Server компонент fetch-ва → подава като initial props на provider → client компонентите четат през hooks. **Никога** не fetch-вай продукти/потребител от клиент.

```tsx
// ❌ ГРЕШНО — fetch от клиент
"use client";
const products = await fetch("/api/products"); // НЕ!

// ✅ ПРАВИЛНО — чети от context
"use client";
import { useProducts } from "@/components/products-context";
const products = useProducts();
```

## Provider Верига (`src/app/[locale]/layout.tsx`)

Root layout е `force-dynamic`, зарежда данни на сървъра и ги подава на веригата:

```
NextIntlClientProvider (messages = getPublicClientMessages(...))
  └─ ProductsProvider (products.map(toClientProduct))
      └─ UserProvider (initialUser, initialProfile, initialDiscount)
          └─ CartProvider
              └─ FavoritesProvider
                  └─ SiteChrome → Navbar + children + BottomBar
```

- `ProductsProvider` държи `ClientProduct[]` — продукт **без** `description`, `comments`, `faq`, `summary`, SEO полета, `oldSlugs`, `gtin`, `ogImage`. Тези полета се ползват само на server страницата на продукта. Ако client компонент има нужда от тях, рендерирай ги на сървъра и ги подай като props/children.
- `NextIntlClientProvider` подава само текстовете, които client компонентите ползват (без server-only namespaces и без `Admin*`/`AgentChat*`). Админът има собствен provider в `src/app/[locale]/admin-panel/layout.tsx`.
- Server страница, която подава продукт на client компонент (`ProductCard`, `ProductCarouselSection`), подава `toClientProduct(product)` — иначе целият продукт отива в HTML-а.

### Hooks за четене на състояние
| Hook | Provider | Файл | Данни |
|------|----------|------|-------|
| `useProducts()` | ProductsProvider | `products-context.tsx` | `ClientProduct[]` |
| `useUser()` | UserProvider | `user-provider.tsx` | текущ потребител, профил, отстъпка |
| `useCart()` | CartProvider | `cart-provider.tsx` | количка, промокод, доставка |
| `useFavorites()` | FavoritesProvider | `favorites-provider.tsx` | любими продукти |

`SiteChrome` (`site-chrome.tsx`) скрива Navbar/BottomBar за `/admin-panel/*` и `/en/admin-panel/*` (regex върху pathname с locale префикс).

## Текстове и навигация (next-intl)

- **Без текст в кода.** Client: `const t = useTranslations("Namespace")`; server: `await getTranslations("Namespace")`. Ключът се добавя в `messages/bg/*.json` и `messages/en/*.json`.
- **Връзки:** `Link` / `useRouter` / `usePathname` от `@/i18n/navigation`, с вътрешни адреси (`href="/products"`, `href={{ pathname: "/products/[slug]", params: { slug } }}`). Адрес на продукт: `getProductHref(product)`.
- **Смяна на език:** `locale-switcher.tsx` — в горната лента, в менюто, във футъра и в админа. При клик води директно към hreflang алтернативата на страницата (без пренасочване през чуждия slug).
- Дати/числа: `useFormatter()` / `Intl` с `bg-BG` или `en-GB` според езика.

## Конвенции за Компоненти

- **Именуване:** `kebab-case.tsx` файлове; provider файлове завършват на `-provider.tsx` (или `-context.tsx`)
- **Импорти:** external → `@/...` → relative, разделени с празни редове
- **Props:** явен `type Props = { ... }` над компонента
- **Client компоненти** започват с `"use client";` на първи ред
- **UI текстът е в `messages/`**; имена на компоненти/променливи на английски

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useCart } from "@/components/cart-provider";

type Props = {
  productId: number;
};

export function AddToCartButton({ productId }: Props) {
  const t = useTranslations("Product");
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  // ... {t("addToCart")}
}
```

## Стилизиране (Tailwind)

- Tailwind CSS 3.4 през PostCSS; глобални стилове в `src/app/globals.css`
- Шрифт: системният (`font-sans` на Tailwind). Geist е махнат. Ако добавяш шрифт, той трябва да поддържа кирилица (`subsets: ["cyrillic", "latin"]`).
- `content-protected` клас — обвивка на съдържанието (виж `SiteChrome`)
- Ползвай utility класове inline; избягвай отделни CSS файлове освен глобалните

## Форми

Форми са client компоненти. Pattern:
1. `useState` за полетата + грешки
2. `onSubmit` → `fetch("/api/...", { method: "POST", body: JSON.stringify(...) })`
3. Обработка на `{ error }` отговор → API-то вече връща грешката на езика на потребителя (`localizeApiError`); резервен текст от `t(...)`
4. Loading state (disabled бутон + текст "Изпращане...")

Примери: `contact-form.tsx`, `account-auth-forms.tsx`, `account-profile-form.tsx`, `cancellation-form.tsx`.

```tsx
const res = await fetch("/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const data = await res.json();
if (!res.ok) {
  setError(data.error ?? "Възникна грешка");
  return;
}
```

## Продуктови Компоненти

- `product-card.tsx` — карта в грид/каросел
- `product-carousel-section.tsx`, `bestsellers-section.tsx`, `recently-viewed-section.tsx` — секции
- `product-detail-tabs.tsx` — табове на страницата на продукт
- `add-to-cart-button.tsx`, `cart-quantity-stepper.tsx`, `favorite-toggle-button.tsx` — действия
- `recently-viewed-tracker.tsx` — записва скоро гледани (localStorage)

## Цени в UI

Цените се показват **само в EUR** (`€11.66`). `BGN_TO_EUR = 1.95583` остава само за сметки (доставка). Продуктовият `price` вече идва форматиран от `products.ts`. За изчисления ползвай числовите стойности от cart логиката, не парсвай стринга.

## Admin UI

Admin компонентите (`admin-*.tsx`) са в `SiteChrome` без Navbar/BottomBar. `admin-shell.tsx` е обвивката на админ панела. Виж skill `brami-admin-panel`.

## Аналитика/Tracking (client)

- `visit-tracker.tsx` — вътре в `<Suspense>`, POST-ва към `api/track`
- `recently-viewed-tracker.tsx` — localStorage
- `cookie-consent-banner.tsx` — GDPR банер
- `interaction-guard.tsx` — защита от копиране/интеракции

## SEO / Metadata

- `generateMetadata()` в page.tsx (server): `title`, `description`, `alternates: buildAlternates(locale, "/вътрешен-адрес")` (canonical + hreflang) и `openGraph` с `title`, `description`, `url`, `locale: OG_LOCALES[locale]` и `images` (собствена снимка или `DEFAULT_OG_IMAGES`). Всичко е в `src/lib/seo.ts`.
- `openGraph` на страницата **заменя** този от layout-а, затова всяка страница си задава `images`. Twitter таговете Next.js попълва от `openGraph` (layout-ът задава само `card`) — не задавай `twitter.title` в layout.
- `metadataBase` е `SITE_URL` (`https://www.brami.shop`) — **никога** `*.vercel.app`
- JSON-LD в `<script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(data)} />` (виж layout за Organization/WebSite и продуктовата страница за Product)
- `<html lang={locale}>`
- Страници, които не трябва да се индексират (количка, профил), имат `robots: { index: false }`, но **не** се блокират в `robots.txt` — иначе търсачката не вижда noindex.

## Нов Компонент — Чеклист

- [ ] Server component по default; `"use client"` само ако е нужно
- [ ] Данни от Context hooks, не от директен fetch
- [ ] Продукт към client компонент → `toClientProduct(product)`
- [ ] `type Props` дефиниран явно
- [ ] UI текст в `messages/bg` + `messages/en`, не в кода
- [ ] Връзки през `@/i18n/navigation`
- [ ] Tailwind utility класове; шрифт променливи ако е нужно
- [ ] Форми: обработка на `{ error }` + loading state
- [ ] Файл `kebab-case.tsx` в `src/components/`
