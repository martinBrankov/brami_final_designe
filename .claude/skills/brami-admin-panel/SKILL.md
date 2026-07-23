---
name: brami-admin-panel
description: Brami админ панел — структура на страниците, guard-ване, налични секции (продукти, поръчки, потребители, мърчанти, промокодове, блог, AI агенти, статистики). Използвай при добавяне на нова админ страница, API route за администрация, или разбиране на съществуващи админ функции.
---

# Brami — Админ Панел

> Всички страниците в `src/app/admin-panel/` изискват **admin сесия**. API routes в `src/app/api/admin/` изискват `requireAdminSession()` или `requireFullAdminSession()` на първи ред.

## Guard Pattern

**Страница (Server Component):**
```ts
// src/app/admin-panel/some-page/page.tsx
import { requireAdminSession } from "@/lib/admin-auth";

export default async function SomePage() {
  await requireAdminSession(); // redirect("/account") ако не е admin
  // ...
}
```

**API Route:**
```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireAdminSession();
  // ...
}
```

За деструктивни действия (изтриване, промяна на роли): `requireFullAdminSession()`.

## Структура на Страниците

```
src/app/admin-panel/
├── page.tsx                    # Dashboard / начало
├── products/                   # Управление на продукти
├── orders/                     # Поръчки
│   └── [id]/                   # Детайл + промяна на статус
├── users/                      # Потребители
│   └── [id]/                   # Профил, промяна на роля
├── merchants/                  # Мърчанти + комисиони
├── promo-codes/                # Промокодове
├── blog/                       # Блог статии (TipTap редактор)
│   ├── new/
│   └── [id]/
└── ai/                         # AI агенти и кампании
    ├── page.tsx                # Dashboard за AI
    ├── campaigns/              # История на кампании
    ├── social-posts/           # Социални постове (review & publish)
    ├── editor-suggestions/     # Блог редакции (review & apply)
    └── marketing-strategies/   # Маркетинг стратегии
```

## Продукти

API: `api/admin/products/` (GET list, POST create) + `api/admin/products/[id]` (PATCH update, DELETE)

Продуктите живеят в Supabase — виж `brami-data-supabase`. Редактирането включва: name, brand, price, category[], badges[], audience, checkboxInfo[], availability, images (Supabase Storage).

## Поръчки

API: `api/admin/orders/[id]` (PATCH status)

Статус: `pending → processing → shipped → delivered` | `cancelled`

При смяна на статус → `sendOrderStatusUpdateEmail()`.

## Потребители

API: `api/admin/users/[id]` (GET профил, PATCH роля/статус)

Операции: преглед, промяна на роля (`user/merchant/admin`), деактивиране.

## Мърчанти

- Преглед на мърчанти + техния статус (активен/неактивен, съгласие с условията)
- Изплащане на комисиони: `api/admin/commissions/mark` (само full admin)
- `src/lib/commission-status.ts` — изчисления

## Промокодове

API: `api/admin/promo-codes/` (GET, POST) + `api/admin/promo-codes/[id]` (PATCH, DELETE)

Полета: code, type (`percent/fixed`), value, maxUses, expiresAt, merchantId (за мърчант кодове), commissionRate.

## Блог

API: `api/admin/blog/` (CRUD) + `api/admin/blog/generate` (AI генериране) + `api/admin/blog/upload` (Supabase Storage) + `api/admin/blog/cleanup-images`

**TipTap редактор** — `src/components/blog-editor.tsx` (`"use client"`). Блоковете се съхраняват в `blog_blocks` таблица.

**AI генериране:** `api/admin/blog/generate` → `generateBlogPost()` от `src/lib/blog-generate.ts` (OpenAI).

## AI Агенти (Admin UI)

`src/app/admin-panel/ai/` — UI за управление на AI маркетинг системата.

Workflow:
1. Администраторът задава **цел** → `/api/admin/ai/campaign` → Manager агент планира и изпълнява
2. Резултатите се появяват като `drafts` в съответните секции
3. Администраторът **преглежда** и **одобрява/отхвърля**:
   - Социални постове → `social-posts/` → PATCH `status: "approved"/"rejected"`
   - Блог редакции → `editor-suggestions/` → POST `.../apply` за прилагане
   - Маркетинг стратегии → `marketing-strategies/` (само четене)

Директни (без Manager):
- `api/admin/ai/influencer` — само социални постове
- `api/admin/ai/editor` — само блог редакция
- `api/admin/ai/marketing` — само маркетинг стратегия

Cron: `api/cron/ai-marketing` — автоматична кампания (добавена в `vercel.json`).

## Статистики / Analytics

`src/lib/visit-tracker.tsx` (client) + `api/track/` + `src/lib/visit-geo.ts`

- Брои уникални посетители и посещения
- Гео данни от `x-vercel-ip-country` хедъри
- Данни в `page_visits` таблица

## Admin Auth (допълнение)

Виж `brami-auth-roles` за пълни детайли. Обобщено:
- `requireAdminSession()` — `src/lib/admin-auth.ts` — redirect ако не е admin
- `requireFullAdminSession()` — за особено чувствителни операции
- `api/admin/logout` — изход от админ сесия

## Добавяне на Нова Админ Страница

```
1. src/app/admin-panel/<name>/page.tsx  →  await requireAdminSession() в началото
2. src/app/api/admin/<name>/route.ts    →  export const runtime = "nodejs"; export const dynamic = "force-dynamic"; await requireAdminSession();
3. Навигация: добави линк в admin nav компонента
```
