# Agent System Audit — AI Agent Chat

> Phase 0 deliverable (раздел 2.3 от requirements). Технически одит на съществуващата
> система преди имплементацията на многоагентния чат.
>
> Актуално към: 2026-07-25 · Модел: `claude-opus-4-8` · Next.js `15.5.9` · React `19.2.4`

---

## 0. Резюме (TL;DR)

Проектът **вече има** работеща многоагентна маркетинг система (`src/lib/ai/`) с 4 агента,
Supabase persistence, admin API routes, cron и Meta публикуване. Тя обаче е изградена като
**синхронен, еднократен campaign run** — а не като контролируем, наблюдаем чат с task
lifecycle.

За да покрием requirements-а трябва да **надградим**, не да дублираме:

| Област | Състояние | Действие |
|--------|-----------|----------|
| Специализирани агенти (influencer/editor/marketing) | ✅ Има | Adapt (обвиване в Agent Registry + task runner) |
| Manager/оркестрация | 🟡 Частично (синхронен for-loop) | Rewrite като контролируем orchestrator |
| Chat / conversations | ❌ Липсва | Create |
| Task lifecycle (tasks/runs/events/plans) | ❌ Липсва | Create |
| Agent/Model Registry | ❌ Липсва (hardcoded) | Create |
| Realtime | ❌ Не се ползва | Create (Supabase Realtime) |
| Job queue / worker | ❌ Липсва (Vercel serverless) | **Архитектурно решение — виж §7 (главен риск)** |
| Image **generation** / edit / text overlay | ❌ Липсва напълно | Create + външен provider |
| Provider adapter layer | ❌ Anthropic е hardcoded | Create |
| MCP сървър | ❌ Липсва | Create |
| Approvals / artifacts / versions | 🟡 Ad-hoc (per-table status) | Unify |

**Двата най-големи риска:** (1) Vercel serverless не е дълготраен worker → нужен durable
queue; (2) Claude не генерира изображения → нужен отделен image provider. И двете изискват
решение **преди** Phase 4–6.

---

## 1. Открити агенти (раздел 2.1)

Всички живеят в `src/lib/ai/` и ползват **Anthropic Claude** през общ клиент. Отделен и
несвързан е старият блог генератор `src/lib/blog-generate.ts` (OpenAI `gpt-4o-mini`).

### 1.1 Инвентар

| Агент | Файл | Категория (нова) | Вход | Изход | Записва в |
|-------|------|------------------|------|-------|-----------|
| **Manager** | `agents/manager.ts` | orchestration | `goal: string` | `CampaignResult` | `ai_campaigns` |
| **Influencer** | `agents/influencer.ts` | content / ads | `instruction`, `campaignId?` | `SavedSocialPost[]` | `social_posts` |
| **Editor** | `agents/editor.ts` | content | `postId?`, `instruction` | `SavedSuggestion` | `ai_editor_suggestions` |
| **Marketing** | `agents/marketing.ts` | planning | `instruction` | `SavedStrategy` | `marketing_strategies` |

Стар/несвързан за референция: **Blog generator** (`blog-generate.ts`, OpenAI) — генерира
статии като блокове; използва се от editor-а само за типа `GeneratedBlock`.

### 1.2 Как работят (общ модел)

- **Стартиране:** директно през admin API route (`POST /api/admin/ai/<agent>`) или през
  Manager, който извиква функциите последователно в `for` цикъл. Cron `/api/cron/ai-marketing`
  вика `generateCampaign` със `source:"cron"`.
- **AI извикване:** единично `runStructured<T>()` (`src/lib/ai/client.ts`) —
  `messages.create` с `thinking:{type:"adaptive"}` + `output_config.format = json_schema`.
  Синхронно, **без streaming, без tool use, без cancellation**.
- **Модел:** hardcoded `AI_MODEL = "claude-opus-4-8"`. Няма избор на модел per-agent.
- **Статус:** няма реален статус на агент. Само `ai_campaigns.status`
  (`planning → completed/failed`) и per-artifact status колони.
- **Резултати:** директен `INSERT` през **service-role** клиент
  (`createSupabaseAdminClient`, `src/lib/supabase-admin.ts`) — заобикаля RLS.
- **Grounding контекст:** `BRAND_CONTEXT` + `getProductContext()` (`src/lib/ai/brand.ts`)
  вкарват бранд гласа и компактен продуктов каталог от Supabase.
- **API / external:** Anthropic API (текст), Meta Graph API (`src/lib/social/meta.ts`,
  само при admin approve+publish), Supabase Storage (само upload на изображения).
  **Няма** локални модели, няма image-generation модел.

### 1.3 Съществуваща инфраструктура

**Supabase таблици (релевантни):** `ai_campaigns` (022), `social_posts` (023),
`marketing_strategies` (024), `ai_editor_suggestions` (025). Плюс: `blog_posts`,
`blog_blocks`, `products`, `user_profiles` (роли: `user`/`merchant`/`admin`).

- RLS е **ENABLED** на AI таблиците, но миграциите **не дефинират policies** — достъпът
  минава изцяло през service-role. Това ще трябва да се промени за multi-user + MCP.

**Storage:** bucket `blog-images` (public, 5MB, MIME whitelist), създаван on-demand с
`storage.createBucket` в `api/admin/blog/upload/route.ts`. Няма отделен bucket за AI artifacts.

**Realtime:** ❌ не се използва никъде (`.channel(` не се среща).

**Queues / background workers / edge functions:** ❌ няма. Всичко е синхронно в API route с
`maxDuration` (кампанията — 90s). Deploy на **Vercel** (serverless).

**Cron:** `vercel.json` → `/api/cron/ai-marketing` (седмично), защитен с `CRON_SECRET`.

**MCP SDK:** ❌ не е инсталиран (няма `@modelcontextprotocol/*` в `package.json`).

**Auth:** cookie-базирана сесия (`getUserSession`) + роля от DB; `requireAdminSession()`,
`requireFullAdminSession()`, `isFullAdmin()` в `src/lib/admin-auth.ts`.

### 1.4 Преизползваеми UI компоненти

- `src/app/admin-panel/ai/page.tsx` — единствен AI admin екран (кампании/постове/редакции).
  Ще служи като база, но новият чат е нов layout (три панела).
- Admin panel shell, guard-ване и navigation (skill `brami-admin-panel`).
- TipTap редактор (`@tiptap/*`) — за preview/edit на статия.
- Storage upload flow (`api/admin/blog/upload`) — директно преизползваем за artifacts.

---

## 2. Agent Registry (раздел 2.2)

Съществуващите агенти се **регистрират**, не се пренаписват. Предложена начална
регистрация (`packages`/`src/lib/ai/registry/agents.ts`), съвместима с `AgentDefinition`
от requirements-а:

```ts
export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: "influencer", name: "Influencer", category: "content",
    description: "Facebook/Instagram постове (drafts).",
    modelProvider: "anthropic", modelId: "claude-opus-4-8",
    capabilities: ["social_copy", "hashtags", "image_prompt"],
    inputSchema: { instruction: "string", campaignId: "string?" },
    outputSchema: { posts: "SavedSocialPost[]" },
    canBeStopped: false,   // днес: синхронен, single-shot
    canBeRedirected: false,
    supportsStreaming: false,
    implementationRef: "src/lib/ai/agents/influencer.ts#generateSocialPosts",
    enabled: true,
  },
  // editor → category:"content", marketing → "planning",
  // manager → "orchestration" (ще бъде заменен от новия Orchestrator)
];
```

> `canBeStopped/canBeRedirected/supportsStreaming = false` за всички днес — това е честната
> отправна точка. Контролируемостта идва в Phase 2–3, когато агентите се обвият в task runs.

**Model Registry** (`registry/models.ts`) стартира с един запис (`claude-opus-4-8`,
capabilities `["text","tool_use","structured_output"]`) и се разширява при добавяне на
provider adapters. **Без hardcode на модели в UI** — идват от Registry (§16 от requirements).

---

## 3. Gap анализ — какво липсва и трябва да се създаде

| # | Компонент | Статус | Бележка |
|---|-----------|--------|---------|
| 1 | `conversations`, `conversation_members`, `messages` | ❌ | Ядро на чата |
| 2 | `tasks`, `task_runs`, `task_events`, `task_plans` | ❌ | Task lifecycle + audit |
| 3 | `artifacts`, `artifact_versions`, `approvals`, `agent_interventions` | ❌ | Unified preview/approval/versioning |
| 4 | `agents`, `model_configs` таблици + Registry слой | ❌ | Днес hardcoded |
| 5 | Controllable Orchestrator (pause/resume/stop/redirect) | 🟡 | Manager е синхронен for-loop |
| 6 | Detailed Planning Agent (DAG с `dependsOn`) | 🟡 | Manager прави само плитък план |
| 7 | Activity Synthesis Agent (+ template fallback) | ❌ | За кратки chat съобщения |
| 8 | Provider Adapter Layer (`ModelProviderAdapter`) | ❌ | Anthropic е директно закачен |
| 9 | Realtime (status/stream/artifact readiness) | ❌ | Supabase Realtime |
| 10 | **Durable job queue / worker** | ❌ | **Главен риск — §7** |
| 11 | **Image generation / edit / text overlay engine** | ❌ | **Нов provider + SVG/Canvas/Sharp — §7** |
| 12 | Metadata / QA / Publisher / Layout агенти | ❌ | Нови за article & ads workflows |
| 13 | Channel Preset Registry (размери/safe areas) | ❌ | Конфигуруеми, не в prompt |
| 14 | MCP сървър (tools, auth, scopes, audit) | ❌ | Phase 7 |
| 15 | Usage/cost tracking + budget controls | ❌ | §19 от requirements |
| 16 | RLS policies за multi-user + MCP scopes | 🟡 | RLS enabled, но без policies |

### Директно преизползваеми (без промяна)
- `runStructured()` клиент, `BRAND_CONTEXT`, `getProductContext()`.
- Storage upload pattern, `admin-auth` guard-ове, Meta publish (`publishFacebook/Instagram`).
- Supabase миграционен модел (`supabase/migrations/NNN_*.sql`, RLS enable, indexes).

### За адаптиране (обвиване, не пренаписване)
- `influencer` / `editor` / `marketing` → извикват се от task runner вместо директно;
  добавя се `run_id`, event emit, usage capture. Функционалните им сигнатури остават.
- Manager → заменя се от новия Orchestrator; логиката за planning се изнася в Planning Agent.

---

## 4. Зависимости и рискове

| Риск | Влияние | Смекчаване |
|------|---------|-----------|
| **Vercel serverless ≠ дълготраен worker** | Pause/resume/stop и дълги multi-agent runs не могат да живеят в един HTTP request (timeout, без cancellation) | Durable queue + worker (§7). Task state в DB, не в памет. |
| **Claude не генерира изображения** | Product images & social ad визуали са невъзможни само с Anthropic | Отделен image provider през adapter (§7). Решение преди Phase 5. |
| **runStructured е single-shot, без cancel/stream** | `canBeStopped/Redirected` = невъзможни днес | Streaming + `AbortController`/`cancel(runId)` в adapter (Phase 2–3). |
| **RLS без policies, всичко през service-role** | Multi-user/MCP биха разчитали на app-level guard-ове само | Реални RLS policies + scopes преди външен достъп. |
| **Anthropic hardcoded** | „различен модел за всеки агент" не работи | Provider Adapter Layer + Model Registry (§16). |
| **Разходи без лимити** | Multi-agent runs = неконтролиран cost | Usage capture в `task_runs.usage_json` + budget gates (§19). |
| **Prompt injection в MCP/tool inputs и външни данни** | Сигурност | Валидация (Zod), sanitization, least-privilege scopes (§17.6). |
| **Секрети** | `model_configs` не бива да пази plain-text ключове | `secret_ref` → env/секрет мениджър, никога в client bundle. |

---

## 5. Migration plan

Текущата структура **е съвместима** с надграждане — новите таблици не конфликтуват със
съществуващите. Стратегия: **additive миграции**, без промяна на `ai_campaigns` и др.

**Продължаваща номерация:** следваща миграция е `026_*` (последна е `025_ai_editor_suggestions`).

1. **`026` — chat ядро:** `conversations`, `conversation_members`, `messages` (+ RLS policies,
   indexes, `updated_at` тригери по конвенцията).
2. **`027` — task lifecycle:** `tasks`, `task_plans`, `task_runs`, `task_events`,
   `agent_interventions`.
3. **`028` — artifacts:** `artifacts`, `artifact_versions`, `approvals` + storage bucket
   `ai-artifacts` (private).
4. **`029` — registry:** `agents`, `model_configs` (secrets като `secret_ref`).
5. **Backfill / bridge (без загуба на данни):**
   - Съществуващите `social_posts` / `ai_editor_suggestions` / `marketing_strategies` се
     **мапват** към нов `artifacts` запис (view или lazy миграция), за да минат през unified
     preview/approval. Оригиналните таблици остават източник на истина за published state.
   - `ai_campaigns` става частен случай на `conversations` + root `task`; стари кампании
     остават четими.
6. **RLS:** policies по роля (Owner/Admin/Editor/Reviewer/Viewer) + `artifacts:publish` като
   отделен high-risk scope за MCP.

Няма нужда от destructive промени. Rollback = drop на новите таблици.

---

## 6. Съответствие с фазите на requirements-а

| Phase | Готовност | Какво носи проектът наготово |
|-------|-----------|------------------------------|
| 0 Audit | ✅ този документ | — |
| 1 Chat инфраструктура | 🟢 | Supabase pattern, auth, admin shell |
| 2 Task orchestration | 🟡 | Manager логика за портиране |
| 3 Agent controls | 🔴 | Изисква queue + cancellation първо |
| 4 Article workflow | 🟡 | editor + blog-generate + storage + Meta; липсват QA/metadata/image агенти |
| 5 Product images | 🔴 | Липсва image provider изцяло |
| 6 Social ads | 🔴 | Липсва image + text-overlay engine |
| 7 MCP | 🔴 | Нищо наготово; отделен app |
| 8 Hardening | 🟡 | Няма тестова инфраструктура в `package.json` |

---

## 7. Отворени архитектурни решения (за потвърждение преди код)

Тези избора не могат да се извлекат от кодовата база — искат продуктово/инфраструктурно
решение:

1. **Queue/worker (блокер за Phase 2–3):** опции —
   (a) Supabase (табличен queue) + външен worker; (b) QStash/Upstash + Vercel functions;
   (c) отделен long-running сервис. Vercel сам по себе си не стига.
2. **Image provider (блокер за Phase 5–6):** кой модел/услуга за генериране и edit на
   изображения (напр. хостван image модел, Replicate, Stability, gpt-image и т.н.). Влиза през
   `ModelProviderAdapter.generateImage/editImage`.
3. **Text overlay rendering:** SVG → растеризация. `sharp` (нужна нова зависимост, внимание
   с Vercel bundling) vs. чист SVG/Canvas. Determinstic layer, не image модел.
4. **Monorepo или не:** requirements предлага `/apps/web` + `/apps/mcp` + `/packages/*`.
   Проектът днес е single Next.js app. Препоръка: MCP като route/segment в същия app
   първоначално (§17.1 „алтернативно"), изнасяне в `/apps/mcp` само ако порасне.
5. **Тестова стека:** няма test runner днес. Нужно е добавяне (Vitest + Playwright) за
   acceptance-а в §24–25.

---

## 8. Definition of Done за Phase 0

- [x] Открити и документирани всички налични агенти, входове/изходи, стартиране, persistence.
- [x] Идентифицирани таблици, storage, cron; потвърдена липса на realtime/queue/MCP.
- [x] Предложен Agent Registry + Model Registry със съществуващите агенти.
- [x] Gap анализ: директно преизползваеми / за адаптиране / липсващи.
- [x] Зависимости, рискове и migration plan.
- [x] Маркирани блокерите (queue, image provider) преди съответните фази.

> **Следваща стъпка:** потвърждаване на §7 решенията, след което Phase 1 (миграция `026` +
> chat backend + Agent/Model Registry + базов realtime chat UI).
