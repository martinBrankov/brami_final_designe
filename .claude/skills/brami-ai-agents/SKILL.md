---
name: brami-ai-agents
description: AI multi-agent маркетинг система на Brami — Claude-базирани агенти (manager/influencer/editor/marketing), Supabase таблици, API routes и cron. Използвай при добавяне/промяна на AI агент, нова кампания, социални постове, блог редакция или маркетинг стратегия.
---

# Brami — AI Агентна Система

> Отделна от `src/lib/blog-generate.ts` (OpenAI/gpt-4o-mini). Тези агенти използват **Claude (Anthropic)** и живеят в `src/lib/ai/`.

## Модел и клиент

`src/lib/ai/client.ts`

- Модел: `claude-opus-4-8` (константа `AI_MODEL`)
- Клиент: `createAnthropicClient()` — singleton, изисква `ANTHROPIC_API_KEY` в `.env.local`
- Главна функция: `runStructured<T>({ system, user, schema, effort, maxTokens })` — един Claude call с `adaptive` thinking и JSON Schema constrained output. Парира + хвърля грешка при невалиден JSON.
- `effort`: `"low" | "medium" | "high" | "xhigh" | "max"` — подава се на `output_config.effort`

```ts
// Пример за извикване
const result = await runStructured<MyType>({
  system: "Ти си...",
  user: "Задача...",
  schema: MY_SCHEMA,  // additionalProperties: false + required за всеки обект!
  effort: "high",
});
```

> **Критично за JSON Schema:** всяко `object` трябва да има `additionalProperties: false` и всички ключове в `required`. Без това Claude може да върне невалиден JSON.

## Бранд контекст

`src/lib/ai/brand.ts`

- `BRAND_CONTEXT` — константен стринг с бранд гласа и строги правила (без медицински обещания, без измислени цени, само на български)
- `getProductContext(limit?)` — async, взема продукти от Supabase и връща компактен каталог като текст (`#id name | brand | categories | ...`). Използва `getProducts()` (cached React `cache()`).

## Агенти

### Manager (`src/lib/ai/agents/manager.ts`)
**Координатор** — получава `goal: string`, планира кои агенти да ангажира и ги dispatch-ва последователно.

```
goal → [runStructured план] → [dispatch influencer/editor/marketing] → CampaignResult
```

- Записва `ai_campaigns` в Supabase (status: `"planning"` → `"completed"/"failed"`)
- `generateCampaign(goal, { source?, createdBy? })` → `CampaignResult`
- `source`: `"manual"` (от UI) или `"cron"` (от автоматичен cron)

### Influencer (`src/lib/ai/agents/influencer.ts`)
Генерира постове за **Facebook/Instagram** и ги записва като drafts.

- `generateSocialPosts(instruction, campaignId?)` → `SavedSocialPost[]`
- Записва в `social_posts` таблица (status: `"draft"`)
- Типове: `platform`, `caption`, `hashtags[]`, `imagePrompt`, `callToAction`, `targetType` (`product/brand/site`), `targetRef`

### Editor (`src/lib/ai/agents/editor.ts`)
Подобрява **съществуваща блог статия** и предлага редакция.

- `generateEditorSuggestion(postId | null, instruction, campaignId?)` → `SavedSuggestion`
- Ако `postId = null` → взема последно създадената статия
- Записва в `ai_editor_suggestions` (status: `"pending"`)
- Output: `{ blocks: GeneratedBlock[], excerpt, notes }`

### Marketing (`src/lib/ai/agents/marketing.ts`)
Изготвя **маркетинг стратегия** с channels, contentCalendar, kpis.

- `generateMarketingStrategy(instruction, campaignId?)` → `SavedStrategy`
- Записва в `marketing_strategies` (status: `"draft"`)
- Типове: `title, summary, audienceInsights[], channels[{name, tactics[]}], contentCalendar[{period, theme, ideas[]}], kpis[]`

## Supabase таблици

| Таблица | Описание |
|---------|----------|
| `ai_campaigns` | Кампании (goal, rationale, plan, status, source) |
| `social_posts` | Постове (draft→published); `campaign_id` FK |
| `ai_editor_suggestions` | Блог редакции (suggested_blocks, excerpt, notes, status); `post_id` FK |
| `marketing_strategies` | Маркетинг стратегии (title, content JSON, status); `campaign_id` FK |

## API Routes

Всички под `src/app/api/admin/ai/` — изискват `requireAdminSession()`:

| Route | Method | Функция |
|-------|--------|---------|
| `api/admin/ai/campaign` | POST | `generateCampaign(goal)` |
| `api/admin/ai/influencer` | POST | `generateSocialPosts(instruction)` |
| `api/admin/ai/editor` | POST | `generateEditorSuggestion(postId?, instruction)` |
| `api/admin/ai/marketing` | POST | `generateMarketingStrategy(instruction)` |
| `api/admin/ai/social-posts/[id]` | PATCH | Одобрение/отхвърляне/публикуване на пост |
| `api/admin/ai/editor-suggestions/[id]` | GET/PATCH | Преглед на редакция |
| `api/admin/ai/editor-suggestions/[id]/apply` | POST | Прилагане на редакция към статията |

**Cron:** `api/cron/ai-marketing` — автоматична кампания по schedule (source: `"cron"`).

## Четене на данни (admin)

`src/lib/ai/marketing-data.ts` — `server-only` функции:
- `getSocialPosts()` → `AdminSocialPost[]`
- `getMarketingStrategies()` → `AdminStrategy[]`
- `getEditorSuggestions()` → `AdminSuggestion[]`
- `getCampaigns()` → `AdminCampaign[]`

## Env

- `ANTHROPIC_API_KEY` — задължителна за AI агентите
- `OPENAI_API_KEY` — само за стария блог генератор (`blog-generate.ts`)

## Workflow при добавяне на нов агент

1. Нов файл `src/lib/ai/agents/<name>.ts` с `import "server-only"` и `runStructured`
2. Добави тип в `AgentName` union в `manager.ts` + case в `dispatch()`
3. Нов API route `src/app/api/admin/ai/<name>/route.ts` с `requireAdminSession()`
4. Нова Supabase таблица + миграция ако е необходимо
5. UI в `src/app/admin-panel/`
