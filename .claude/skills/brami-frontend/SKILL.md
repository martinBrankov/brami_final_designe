---
name: brami-frontend
description: Brami фронтенд — React 19 компоненти, provider верига, Server/Client разделение, Tailwind стилове, форми и hooks. Използвай при създаване/промяна на UI компонент, страница, стилизиране или работа с клиентско състояние (количка, потребител, любими).
---

# Brami — Фронтенд

Next.js 15.5.9 App Router + React 19.2 + Tailwind CSS 3.4. UI език: **български**.

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

## Provider Верига (`src/app/layout.tsx`)

Root layout е `force-dynamic`, зарежда данни на сървъра и ги подава на веригата:

```
ProductsProvider (products)
  └─ UserProvider (initialUser, initialProfile, initialDiscount)
      └─ CartProvider
          └─ FavoritesProvider
              └─ SiteChrome → Navbar + children + BottomBar
```

### Hooks за четене на състояние
| Hook | Provider | Файл | Данни |
|------|----------|------|-------|
| `useProducts()` | ProductsProvider | `products-context.tsx` | `Product[]` |
| `useUser()` | UserProvider | `user-provider.tsx` | текущ потребител, профил, отстъпка |
| `useCart()` | CartProvider | `cart-provider.tsx` | количка, промокод, доставка |
| `useFavorites()` | FavoritesProvider | `favorites-provider.tsx` | любими продукти |

`SiteChrome` (`site-chrome.tsx`) скрива Navbar/BottomBar за `/admin-panel/*` route-ове (`pathname.startsWith("/admin-panel")`).

## Конвенции за Компоненти

- **Именуване:** `kebab-case.tsx` файлове; provider файлове завършват на `-provider.tsx` (или `-context.tsx`)
- **Импорти:** external → `@/...` → relative, разделени с празни редове
- **Props:** явен `type Props = { ... }` над компонента
- **Client компоненти** започват с `"use client";` на първи ред
- **Целият UI текст на български**; имена на компоненти/променливи на английски

```tsx
"use client";

import { useState } from "react";

import { useCart } from "@/components/cart-provider";

type Props = {
  productId: number;
  label?: string;
};

export function AddToCartButton({ productId, label = "Добави в количката" }: Props) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  // ...
}
```

## Стилизиране (Tailwind)

- Tailwind CSS 3.4 през PostCSS; глобални стилове в `src/app/globals.css`
- Шрифтове: `Geist` / `Geist_Mono` през `next/font/google` → CSS променливи `--font-geist-sans`, `--font-geist-mono` (задават се на `<html>`)
- `content-protected` клас — обвивка на съдържанието (виж `SiteChrome`)
- Ползвай utility класове inline; избягвай отделни CSS файлове освен глобалните

## Форми

Форми са client компоненти. Pattern:
1. `useState` за полетата + грешки
2. `onSubmit` → `fetch("/api/...", { method: "POST", body: JSON.stringify(...) })`
3. Обработка на `{ error }` отговор → показване на грешка на **български**
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

Формат: `"€X/Yлв."` (двойно EUR/BGN). Курс `BGN_TO_EUR = 1.95583`. Продуктовият `price` вече идва форматиран от `products.ts`. За изчисления ползвай числовите стойности от cart логиката, не парсвай стринга.

## Admin UI

Admin компонентите (`admin-*.tsx`) са в `SiteChrome` без Navbar/BottomBar. `admin-shell.tsx` е обвивката на админ панела. Виж skill `brami-admin-panel`.

## Аналитика/Tracking (client)

- `visit-tracker.tsx` — вътре в `<Suspense>`, POST-ва към `api/track`
- `recently-viewed-tracker.tsx` — localStorage
- `cookie-consent-banner.tsx` — GDPR банер
- `interaction-guard.tsx` — защита от копиране/интеракции

## SEO / Metadata

- `generateMetadata()` в page.tsx (server) — виж `src/app/layout.tsx` за pattern
- `metadataBase` от `resolveSiteUrl()` — **никога** `*.vercel.app`
- JSON-LD structured data в `<script type="application/ld+json">` (виж layout)
- `lang="bg"` на `<html>`

## Нов Компонент — Чеклист

- [ ] Server component по default; `"use client"` само ако е нужно
- [ ] Данни от Context hooks, не от директен fetch
- [ ] `type Props` дефиниран явно
- [ ] UI текст на български
- [ ] Tailwind utility класове; шрифт променливи ако е нужно
- [ ] Форми: обработка на `{ error }` + loading state
- [ ] Файл `kebab-case.tsx` в `src/components/`
