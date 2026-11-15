---
name: brami-admin-panel
description: Brami админ панел — структура на страниците, guard-ване, налични секции (продукти, поръчки, потребители, мърчанти, промокодове, блог, AI агенти, статистики). Използвай при добавяне на нова админ страница, API route за администрация, или разбиране на съществуващи админ функции.
---

# Brami — Админ Панел

> Всички страниците в `src/app/[locale]/admin-panel/` изискват **admin сесия**. API routes в `src/app/api/admin/` изискват `requireAdminSession()` или `requireFullAdminSession()` на първи ред.
>
> Админът е двуезичен: `/admin-panel` (bg) и `/en/admin-panel` (en). Текстовете са в `messages/{bg,en}/admin.json` (namespaces `Admin*`, `AgentChat*`). `src/app/[locale]/admin-panel/layout.tsx` задава `noindex` и собствен `NextIntlClientProvider` с всички текстове (root layout-ът не подава админските към публичните страници). Без вход `requireAdminSession()` пренасочва към входа на същия език (`/profil` или `/en/account`).

## Guard Pattern

**Страница (Server Component):**
```ts
// src/app/[locale]/admin-panel/some-page/page.tsx
import { requireAdminSession } from "@/lib/admin-auth";

export default async function SomePage() {
  await requireAdminSession(); // пренасочва към входа на текущия език, ако не е admin
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
src/app/[locale]/admin-panel/
├── layout.tsx                  # noindex + NextIntlClientProvider с всички текстове
├── page.tsx                    # Dashboard / начало
├── products/                   # Управление на продукти (+ SEO и английски полета)
├── orders/                     # Поръчки
│   └── [id]/                   # Детайл + промяна на статус
├── users/                      # Потребители
│   └── [id]/                   # Профил, промяна на роля
├── merchants/                  # Мърчанти + комисиони
├── promo-codes/                # Промокодове
├── blog/                       # Блог статии (TipTap редактор + английска версия)
│   ├── new/
│   └── [id]/
├── faq/                        # Въпроси и отговори (+ английски полета)
├── stats/                      # Статистики (вкл. посещения от AI асистенти)
├── marketing/                  # Маркетинг имейли
├── agent-chat/                 # AI Agent Chat
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

Прозорецът за редакция има и:
- **SEO (bg)** — `admin-product-seo-fields.tsx`: адрес (slug), SEO заглавие, meta описание, ключова фраза, резюме, FAQ, **баркод (EAN/GTIN)**, alt текстове на снимките.
- **Английски** — име, адрес, описание, разфасовка, акценти, SEO полета → записват се в `translations.en`.

Правила при запис (`saveAdminProduct` в `src/lib/admin-data.ts`):
- смененият slug отива в `old_slugs`, за да пренасочват старите адреси (308);
- английският slug трябва да е уникален (проверка в кода + уникален индекс от миграция 033);
- баркодът се проверява с `isValidGtin()` (`src/lib/gtin.ts`: 8/12/13/14 цифри + контролна цифра); невалиден → грешка;
- `updated_at` се обновява (ползва се в sitemap и schema).

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

**Английска версия:** `admin-blog-english-fields.tsx` под редактора (заглавие, адрес, надзаглавие, резюме, време за четене + HTML превод на всеки текстов блок). PUT на `api/admin/blog/[id]` приема `english` и `blockEnglish` (по id на блок); преводите се сливат през `withEnglish()` от `src/lib/admin-translations.ts` и не се губят при запис. Показва се само за вече записани статии (блоковете трябват id). Английската статия е „готова“ (индексира се), само когато всеки текстов блок има превод.

## FAQ

API: `api/admin/faq/` (POST) + `api/admin/faq/[id]` (PUT, PATCH, DELETE). `admin-faq-manager.tsx` има английски полета (въпрос, отговор, категория, адрес) за вече записани въпроси; PUT приема `english`. Английският адрес се проверява за уникалност (`assertUniqueEnglishSlug`).

## IndexNow (известяване на Bing)

Запис, изтриване или публикуване на продукт, статия или FAQ вика `notifyIndexNow()` (`src/lib/indexnow.ts`) след отговора (`after()`), с адресите на всички готови езици + списъчната страница. Работи само в production (не от localhost/preview). Ключът се отдава на `/indexnow-key.txt` (`INDEXNOW_KEY` или вграден по подразбиране). Нов admin route, който променя публично съдържание, трябва също да вика `notifyIndexNow`.

## AI Агенти (Admin UI)

`src/app/[locale]/admin-panel/ai/` — UI за управление на AI маркетинг системата.

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
- Данни в `site_visits` / `site_visitors`
- **Посещения от AI асистенти** (`admin-stats.tsx`): `detectAiSource()` от `src/lib/ai-referrals.ts` разпознава ChatGPT, Perplexity, Gemini, Copilot, Claude, DeepSeek, Grok, Meta AI, Mistral по referrer или `utm_source` на началната страница. Два блока: по асистент и по страница на кацане. Нов асистент → добави го в `AI_SOURCES`.

## Admin Auth (допълнение)

Виж `brami-auth-roles` за пълни детайли. Обобщено:
- `requireAdminSession()` — `src/lib/admin-auth.ts` — redirect ако не е admin
- `requireFullAdminSession()` — за особено чувствителни операции
- `api/admin/logout` — изход от админ сесия

## Добавяне на Нова Админ Страница

```
1. src/app/[locale]/admin-panel/<name>/page.tsx  →  await requireAdminSession() в началото
2. src/app/api/admin/<name>/route.ts             →  export const runtime = "nodejs"; export const dynamic = "force-dynamic"; await requireAdminSession();
3. Адрес: добави "/admin-panel/<name>" в pathnames в src/i18n/routing.ts
4. Навигация: добави елемент в navItems в admin-shell.tsx + ключ nav.<key> в AdminShell (messages/bg/admin.json и messages/en/admin.json)
5. Заглавие: ключ в AdminPages; текстовете на страницата в нов namespace Admin<Name> (bg + en)
6. Грешки от API: { error: await localizeApiError(...) }
```
