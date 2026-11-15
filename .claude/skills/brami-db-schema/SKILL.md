---
name: brami-db-schema
description: Brami база данни — точна референция на Supabase таблиците, колони, връзки и RLS политики (продукти, поръчки, потребители, промокоди, блог, маркетинг, AI). Използвай при писане на заявка, нова колона/таблица, миграция, или проверка на точни имена на колони.
---

# Brami — Схема на Базата Данни (Supabase Postgres)

> Точна референция от `supabase/migrations/001..033`. Колони са **snake_case**, TS типове **camelCase** — маппингът е в `mapX()` функции. За patterns на достъп (клиенти, миграции, скриптове) виж skill `brami-data-supabase`.

## Преводи (миграция 032) — общо правило

Българският текст е в обикновените колони. Английският е в колона **`translations JSONB NOT NULL DEFAULT '{}'`** във формат `{ "en": { "<поле>": "..." } }` (имената на полетата са като на колоните, напр. `name`, `slug`, `description`, `seo_title`). Липсващо поле → показва се българското. `pickTranslation()` (`src/lib/i18n-content.ts`) избира превода; `withEnglish()` (`src/lib/admin-translations.ts`) го записва, като пази непратените полета и маха празните.

## Продукти (миграции 001, 032, 033)

Нормализирана схема с релации. `getProducts(locale)` прави един nested select и мапва към `Product` на дадения език.

```
products (id INTEGER PK, name, brand, badge, discount_percent, price_eur,
          price_bgn, packaging, weight, rating, description, updated_at,
          -- SEO (032):
          slug UNIQUE,                 -- адрес на bg, латиница; NULL → авто „<име>-<id>“
          old_slugs TEXT[],            -- стари адреси → 308 към текущия
          seo_title, meta_description, focus_keyword,
          summary,                     -- 2–3 изречения „отговор първо“ под H1
          faq JSONB,                   -- [{ question, answer }]
          gtin,                        -- EAN/GTIN/ISBN; валидира се при запис
          translations JSONB)          -- en: name, slug, description, packaging, seo_*, summary, faq…
categories (id SERIAL PK, slug UNIQUE)          -- 'hair' | 'body' | 'face'
audiences  (id SERIAL PK, slug UNIQUE)          -- 'women' | 'men' | 'unisex' | 'kids'

product_categories (product_id, category_id)    -- M:N
product_audiences  (product_id, audience_id)    -- M:N
product_images     (id, product_id, image_src, sort_order, alt, translations)   -- alt + en.alt (032)
product_highlights (id, product_id, text, sort_order, translations)            -- checkboxInfo; en.text (032)
product_comments   (id, product_id, author_name, comment, rating, comment_date, sort_order)
related_products   (product_id, related_product_id, sort_order)
```

- **`products.id` е INTEGER** (не uuid) — фиксирани id-та; след ръчен insert пусни `npm run sync-sequences`. Числовите адреси `/products/<id>` (QR кодове) пренасочват към slug-а.
- Уникални индекси: `products_slug_key` (bg slug), `products_en_slug_key` върху `translations->'en'->>'slug'` (033).
- Цени се пазят **и в EUR, и в BGN** (`price_eur`, `price_bgn`); показва се само EUR.
- RLS: всички имат `public_read` политика (`FOR SELECT USING (true)`).

## Потребители (миграции 003, 010-014, 017, 020, 021)

```
user_profiles (
  id UUID PK, username UNIQUE, email UNIQUE, password_hash,
  phone, country, city, postal_code, address,
  role,                    -- 'user' | 'merchant' | 'admin' (виж 017)
  marketing_subscription BOOLEAN,
  -- OAuth (010):
  oauth_provider, oauth_subject,
  -- full_name (011), speedy (012-013):
  full_name, preferred_office, preferred_locker,
  -- merchant (014, 020, 021):
  merchant_discount_percent,
  merchant_terms_accepted_at,     -- NULL = не е приел условията
  merchant_bank_*,                -- банкови детайли
  created_at, updated_at
)
```

- Роля `super_user` беше **заменена с `merchant`** в миграция 017. Не ползвай `super_user`.
- **Forward-compatible select:** `getUserProfile()` опитва от най-нов към най-стар select и пада назад ако колона липсва. Пази този pattern при нова колона.
- OAuth потребители може да нямат `password_hash` (`hasPassword=false`).

## Поръчки (миграции 005, 016, 018)

> ⚠️ Таблиците са `customer_orders` / `customer_order_items` (НЕ `orders`).

```
customer_orders (
  id UUID PK, order_number UNIQUE,
  status TEXT DEFAULT 'Потвърдена',        -- статус на български!
  customer_full_name, customer_email, customer_phone,
  delivery_method_label, delivery_destination, delivery_notes,
  subtotal, shipping, total,               -- NUMERIC(10,2), в EUR
  order_created_at TEXT,
  raw_payload JSONB,                        -- пълната поръчка
  -- промо (016):
  promo_code, promo_merchant_id, promo_discount_percent, promo_commission_percent,
  -- комисиона payout (018):
  promo_commission_paid_at, promo_commission_paid_by,
  created_at, updated_at
)

customer_order_items (
  id UUID PK, order_id → customer_orders(id) CASCADE,
  product_id → products(id) SET NULL,       -- може да е NULL ако продуктът е изтрит
  product_name, packaging, image_url, product_url,
  quantity CHECK (> 0), unit_price, total_price
)
```

- **Комисионите НЕ са отделна таблица** — те са колони върху `customer_orders` (`promo_merchant_id`, `promo_commission_percent`, `promo_commission_paid_at`). Изплащане = попълване на `promo_commission_paid_at`.
- Статусът е текст на български (`'Потвърдена'`, ...).

## Промокоди (миграция 015)

> ⚠️ Промокодите са **само мърчант-базирани** — няма `type`/`max_uses`/`used_count`/`expires_at`.

```
promo_codes (
  id UUID PK, code UNIQUE,
  merchant_id → user_profiles(id) CASCADE,   -- задължителен, всеки код е на мърчант
  discount_percent NUMERIC(5,2) CHECK (0..100),   -- отстъпка за клиента
  commission_percent NUMERIC(5,2) CHECK (0..100), -- комисиона за мърчанта
  is_active BOOLEAN,
  created_at, updated_at
)
```

Използване на код при поръчка → записва се в `customer_orders.promo_*` колоните.

## Блог (миграции 006, 007, 032, 033)

```
blog_posts (
  id UUID PK, title, slug UNIQUE, eyebrow, excerpt, cover_image,
  read_time, published_at DATE, is_featured BOOLEAN, published BOOLEAN,
  created_at,
  translations JSONB,          -- en: title, slug, eyebrow, excerpt, read_time (032)
  updated_at TIMESTAMPTZ       -- 032; поддържа се от тригери (033)
)
blog_blocks (
  id UUID PK, post_id → blog_posts(id) CASCADE,
  type TEXT CHECK (type IN ('text', 'image')),   -- само text|image в DB
  content TEXT, position INTEGER,
  translations JSONB           -- en.content (HTML) (032)
)
```

- RLS: публично четене само на `published = true` статии (и техните блокове).
- **Тригери (033):** `blog_posts_updated_at` (BEFORE UPDATE) и `blog_blocks_updated_at` (AFTER INSERT/UPDATE/DELETE на блок) обновяват `blog_posts.updated_at` при всяка реална промяна — и от админа, и от импорт или Supabase Studio. Не задавай `updated_at` ръчно.
- Уникален индекс `blog_posts_en_slug_key` върху английския slug (033).
- Английската версия на статия е „готова“ само ако има заглавие, slug и превод на **всеки** текстов блок.

## FAQ (миграции 031, 032, 033)

```
faq_entries (
  id UUID PK, question, answer, slug UNIQUE, category,
  status ('pending' | 'draft' | 'published'), source ('admin' | 'user'),
  asker_name, asker_email, position, published_at, created_at, updated_at,
  translations JSONB           -- en: question, answer, category, slug (032)
)
```

- Уникален индекс `faq_entries_en_slug_key` върху английския slug (033).
- **Storage bucket `blog-images`** (public, 5MB лимит, jpeg/png/webp/gif/avif) — за cover + block изображения.
- `blog_blocks.type` в DB е `text`/`image`; AI editor работи с `heading`/`paragraph` на приложно ниво (виж `brami-ai-agents`).

## Аналитика (миграции 008, 009)

```
site_visits    (посещения — page views)
site_visitors  (уникални посетители)
```
IP/гео през `x-vercel-*` хедъри; хешове за IP (виж `visit-geo.ts`).

## Маркетинг Абонати (миграция 019)

```
marketing_subscribers (
  id UUID PK, email UNIQUE (lowercase, ≤254),
  source, user_id → user_profiles(id) SET NULL,
  subscribed_at, unsubscribed_at,             -- NULL unsubscribed_at = активен
  unsubscribe_token_hash, last_request_ip_hash, last_user_agent,
  created_at, updated_at
)
marketing_subscription_attempts (               -- rate-limit лог
  id BIGSERIAL PK, email_hash, ip_hash,
  action CHECK (action IN ('subscribe','unsubscribe')), created_at
)
```

## AI Маркетинг (миграции 022-025)

```
ai_campaigns          (id UUID PK, goal, rationale, plan JSONB, status, source, created_by, created_at)
social_posts          (id UUID PK, platform, caption, hashtags[], image_prompt, image_url,
                       call_to_action, target_type, target_ref, status, external_post_id,
                       publish_error, campaign_id → ai_campaigns, created_at)
marketing_strategies  (id UUID PK, title, content JSONB, status, campaign_id → ai_campaigns, created_at)
ai_editor_suggestions (id UUID PK, post_id → blog_posts, suggested_blocks JSONB, excerpt,
                       notes, status, campaign_id → ai_campaigns, created_at)
```

Детайли за статуси и workflow → skill `brami-ai-agents`.

## Общи Правила

- **Нова таблица/колона = нов файл** `supabase/migrations/NNN_описание.sql` (текущо до 033). Не редактирай приложени миграции.
- Прилагане: собственикът ги пуска **ръчно в Supabase Studio** (SQL Editor) — първо prod, после dev. Пиши ги идемпотентни (`IF NOT EXISTS`, `CREATE OR REPLACE`) и в `BEGIN; … COMMIT;`.
- Текстово съдържание, което се показва на сайта → добави `translations JSONB NOT NULL DEFAULT '{}'` вместо отделни `_en` колони.
- Всички таблици имат `ENABLE ROW LEVEL SECURITY`. Публично четими: продукти + публикувани блог статии. Всичко останало минава през `createSupabaseAdminClient()` (service-role, заобикаля RLS) от `server-only` lib файл.
- `pgcrypto` extension за `gen_random_uuid()`.
- При добавяне на колона, която код чете → пази forward-compatible select pattern (виж `getUserProfile`).
