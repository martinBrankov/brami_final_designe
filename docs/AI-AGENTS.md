# Brami AI Агентна Система — Детайлна Документация

> Актуално към: 2026-07-23 | Модел: `claude-opus-4-8`

---

## Обзор

Brami разполага с **две независими AI системи**:

| Система | Файлове | Модел | Цел |
|---------|---------|-------|-----|
| **Блог генератор** | `src/lib/blog-generate.ts` | OpenAI `gpt-4o-mini` | Авто-генериране на блог статии |
| **AI Маркетинг агенти** | `src/lib/ai/` | Anthropic `claude-opus-4-8` | Маркетинг кампании, социални постове, блог редакции |

Тази документация покрива **AI Маркетинг агентната система**.

---

## Архитектура

```
src/lib/ai/
├── client.ts          # Anthropic SDK wrapper — runStructured()
├── brand.ts           # Бранд контекст + продуктов каталог
├── marketing-data.ts  # Read-only функции за admin UI
└── agents/
    ├── manager.ts     # Координатор — планира и dispatch-ва задачи
    ├── influencer.ts  # Генерира Facebook/Instagram постове
    ├── editor.ts      # Подобрява блог статии
    └── marketing.ts   # Изготвя маркетинг стратегии
```

```
src/app/api/admin/ai/
├── campaign/route.ts              # POST → Manager агент
├── influencer/route.ts            # POST → Influencer директно
├── editor/route.ts                # POST → Editor директно
├── marketing/route.ts             # POST → Marketing директно
├── social-posts/[id]/route.ts     # PATCH → одобрение/публикуване
├── editor-suggestions/[id]/
│   ├── route.ts                   # GET/PATCH → преглед
│   └── apply/route.ts             # POST → прилагане към блог
└── campaign/route.ts              # GET → история

src/app/api/cron/
└── ai-marketing/route.ts          # Cron → автоматична кампания
```

---

## Компонент 1: Claude Клиент (`client.ts`)

### Конфигурация
```ts
export const AI_MODEL = "claude-opus-4-8";
// Singleton Anthropic client
// Изисква: ANTHROPIC_API_KEY в .env.local
```

### Главна функция: `runStructured<T>()`

```ts
type RunStructuredOptions = {
  system: string;          // System prompt с роля и правила
  user: string;            // Потребителска задача + контекст
  schema: Record<string, unknown>; // JSON Schema за output
  effort?: Effort;         // "low"|"medium"|"high"|"xhigh"|"max"
  maxTokens?: number;      // default 16000
};
```

Използва **adaptive thinking** (`thinking: { type: "adaptive" }`) и **structured JSON output** (`output_config.format.type = "json_schema"`).

**Критично изискване за JSON Schema:**
```ts
// ВСЯКО object трябва да има:
{
  type: "object",
  additionalProperties: false,   // задължително
  required: ["field1", "field2"], // задължително — всички ключове
  properties: { ... }
}
```

---

## Компонент 2: Бранд Контекст (`brand.ts`)

### `BRAND_CONTEXT` (константа)
Вграден в system prompt на всеки агент:
- Brami = натурална козметика на базата на шафран
- Тон: топъл, експертен, без агресивна продажба
- Строго: без медицински обещания, само реални продукти

### `getProductContext(limit = 30)` (async)
Взима продукти от Supabase и ги форматира за AI контекст:
```
#prod-id Продукт | марка: Brand | категории: hair,face | 100ml | €X/Yлв. | акценти: A; B; C
```

---

## Компонент 3: Manager Агент (`agents/manager.ts`)

**Роля:** Координатор — получава маркетингова цел и изгражда план.

### Поток
```
goal (string)
  ↓
runStructured() → CampaignPlan { rationale, tasks[] }
  ↓
INSERT ai_campaigns (status: "planning")
  ↓
for each task → dispatch(task, campaignId)
  ├── "influencer" → generateSocialPosts()
  ├── "editor"     → generateEditorSuggestion()
  └── "marketing"  → generateMarketingStrategy()
  ↓
UPDATE ai_campaigns (status: "completed"/"failed")
  ↓
CampaignResult { campaignId, goal, rationale, outcomes[] }
```

### Типове
```ts
type AgentName = "influencer" | "editor" | "marketing";

type CampaignTask = {
  agent: AgentName;
  instruction: string; // конкретна задача за агента
  targetRef: string;   // напр. blog post id; "" ако не е приложимо
};

type CampaignResult = {
  campaignId: string;
  goal: string;
  rationale: string;
  outcomes: { agent: AgentName; ok: boolean; detail: string }[];
};
```

### Извикване
```ts
const result = await generateCampaign("Промотирай шафрановата серия за лице", {
  source: "manual",    // или "cron"
  createdBy: userId,   // или null
});
```

---

## Компонент 4: Influencer Агент (`agents/influencer.ts`)

**Роля:** Генерира социални медийни постове (Facebook/Instagram).

### Output структура
```ts
type GeneratedSocialPost = {
  platform: "facebook" | "instagram";
  caption: string;        // 1-3 изречения на български
  hashtags: string[];     // 4-8 хаштага
  imagePrompt: string;    // описание за дизайнер/AI
  callToAction: string;   // "Поръчай в brami.shop"
  targetType: "product" | "brand" | "site";
  targetRef: string;      // product #id, brand name, или "brami.shop"
};
```

### Supabase: `social_posts` таблица
```
status: "draft" → "approved" → "published" | "rejected"
campaign_id: FK към ai_campaigns (nullable)
```

### Workflow за одобрение
1. Агентът записва с `status: "draft"`
2. Админ преглежда в `/admin-panel/ai/social-posts/`
3. PATCH `status: "approved"` → готов за публикуване
4. При публикуване: `external_post_id` + `publish_error` се записват

---

## Компонент 5: Editor Агент (`agents/editor.ts`)

**Роля:** Подобрява съществуваща блог статия.

### Как избира статия
```ts
generateEditorSuggestion(
  postId: string | null, // null → последно създадената статия
  instruction: string,
  campaignId: string | null
)
```

### Output блокове
```ts
type GeneratedBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; html: string };

// Структура на suggestion:
{
  suggested_blocks: GeneratedBlock[],
  excerpt: string,  // под 200 символа
  notes: string,    // какво е подобрено
}
```

### Supabase: `ai_editor_suggestions` таблица
```
status: "pending" → "applied" | "rejected"
post_id: FK към blog_posts
campaign_id: FK към ai_campaigns (nullable)
```

### Прилагане на редакция
`POST api/admin/ai/editor-suggestions/[id]/apply` → презаписва `blog_blocks` на статията.

---

## Компонент 6: Marketing Агент (`agents/marketing.ts`)

**Роля:** Изготвя структурирана маркетинг стратегия.

### Output структура
```ts
type MarketingStrategy = {
  title: string;
  summary: string;               // 2-4 изречения
  audienceInsights: string[];    // 3-5 наблюдения
  channels: {
    name: string;                // "Facebook", "Имейл", etc.
    tactics: string[];           // 2-4 конкретни тактики
  }[];
  contentCalendar: {
    period: string;              // "Седмица 1", "Август"
    theme: string;
    ideas: string[];             // 2-4 идеи
  }[];
  kpis: string[];                // 3-5 показателя
};
```

### Supabase: `marketing_strategies` таблица
```
status: "draft" (само четене от админ UI)
content: JSON (пълният MarketingStrategy обект)
campaign_id: FK към ai_campaigns (nullable)
```

---

## Supabase Схема (AI таблици)

### `ai_campaigns`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
goal        text NOT NULL
rationale   text
plan        jsonb          -- масив от CampaignTask
status      text           -- 'planning' | 'completed' | 'failed'
source      text           -- 'manual' | 'cron'
created_by  uuid REFERENCES user_profiles(id)
created_at  timestamptz DEFAULT now()
```

### `social_posts`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
platform        text    -- 'facebook' | 'instagram'
caption         text
hashtags        text[]
image_prompt    text
image_url       text    -- след качване
call_to_action  text
target_type     text    -- 'product' | 'brand' | 'site'
target_ref      text
status          text    -- 'draft' | 'approved' | 'published' | 'rejected'
external_post_id text
publish_error   text
campaign_id     uuid REFERENCES ai_campaigns(id)
created_at      timestamptz DEFAULT now()
```

### `ai_editor_suggestions`
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
post_id          uuid REFERENCES blog_posts(id) NOT NULL
suggested_blocks jsonb   -- GeneratedBlock[]
excerpt          text
notes            text
status           text    -- 'pending' | 'applied' | 'rejected'
campaign_id      uuid REFERENCES ai_campaigns(id)
created_at       timestamptz DEFAULT now()
```

### `marketing_strategies`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
title       text
content     jsonb   -- MarketingStrategy JSON
status      text    -- 'draft'
campaign_id uuid REFERENCES ai_campaigns(id)
created_at  timestamptz DEFAULT now()
```

---

## API Reference

### Cron Автоматизация
`api/cron/ai-marketing` (GET, protected by `CRON_SECRET` header):
```ts
const DEFAULT_GOAL = "Изготви маркетингова кампания за тази седмица...";
await generateCampaign(DEFAULT_GOAL, { source: "cron" });
```
Конфигурира се в `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/ai-marketing", "schedule": "0 9 * * 1" }]
}
```

### Admin API Routes (изискват admin сесия)

```
POST /api/admin/ai/campaign
Body: { goal: string }
Returns: CampaignResult

POST /api/admin/ai/influencer  
Body: { instruction: string, campaignId?: string }
Returns: { posts: SavedSocialPost[] }

POST /api/admin/ai/editor
Body: { instruction: string, postId?: string, campaignId?: string }
Returns: SavedSuggestion

POST /api/admin/ai/marketing
Body: { instruction: string, campaignId?: string }
Returns: SavedStrategy

PATCH /api/admin/ai/social-posts/[id]
Body: { status: "approved" | "rejected" }

POST /api/admin/ai/editor-suggestions/[id]/apply
→ Прилага suggested_blocks към blog_posts

PATCH /api/admin/ai/editor-suggestions/[id]
Body: { status: "applied" | "rejected" }
```

---

## Env Переменливи

```bash
# Задължително за AI агентите
ANTHROPIC_API_KEY=sk-ant-...

# За стария блог генератор (не за Claude агентите)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # по подразбиране
```

---

## Добавяне на Нов Агент — Пример

```ts
// 1. src/lib/ai/agents/seo-agent.ts
import "server-only";
import { runStructured } from "@/lib/ai/client";
import { BRAND_CONTEXT, getProductContext } from "@/lib/ai/brand";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "metaDescription", "keywords"],
  properties: {
    title: { type: "string" },
    metaDescription: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
} as const;

type SeoResult = { title: string; metaDescription: string; keywords: string[] };

export async function generateSeoMeta(
  productId: string,
  campaignId: string | null = null,
): Promise<{ id: string } & SeoResult> {
  const catalog = await getProductContext();
  
  const result = await runStructured<SeoResult>({
    system: `${BRAND_CONTEXT}\n\nТи си SEO специалист на Brami.`,
    user: `Продукт: #${productId}\n\nКаталог:\n${catalog}\n\nГенерирай SEO мета.`,
    schema: SCHEMA,
    effort: "medium",
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("seo_suggestions")
    .insert({ product_id: productId, ...result, campaign_id: campaignId })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) throw new Error(`Запис неуспешен: ${error?.message}`);
  return { id: data.id, ...result };
}

// 2. В manager.ts добави "seo" към AgentName и case в dispatch()
// 3. API: src/app/api/admin/ai/seo/route.ts
// 4. Миграция: supabase/migrations/022_seo_suggestions.sql
```

---

## Диагностика и Дебъгване

### Проверка на API ключ
```bash
node -e "console.log(process.env.ANTHROPIC_API_KEY ? 'OK' : 'MISSING')" 
```

### Типични Грешки

| Грешка | Причина | Fix |
|--------|---------|-----|
| `ANTHROPIC_API_KEY не е конфигуриран` | Липсва в `.env.local` | Добави ключа |
| `Claude върна невалиден JSON` | Schema не е правилна | Провери `additionalProperties: false` + `required` |
| `Claude отказа (refusal)` | Prompt нарушава правила | Провери `BRAND_CONTEXT` |
| `Неуспешно създаване на кампания` | Supabase грешка | Провери миграциите |
| `Няма блог статия за редактиране` | Няма posts в DB | Създай поне 1 статия |

### Лог на кампании
```ts
// В admin UI: /admin-panel/ai/campaigns/
// Или директно:
const { data } = await supabase
  .from("ai_campaigns")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(10);
```
