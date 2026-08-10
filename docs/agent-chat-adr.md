# AI Agent Chat — ADR & Implementation Plan

> Architecture Decision Record + фазиран план за имплементация. Продължение на
> [agent-system-audit.md](agent-system-audit.md) (Phase 0). **Този документ се одобрява преди код.**
>
> Дата: 2026-07-25 · Base: Next.js `15.5.9`, React `19.2.4`, Supabase, Vercel, Anthropic + OpenAI.

---

## Част A — Architecture Decision Record

Всяко решение: **контекст → решение → следствие**.

### ADR-1 — Надграждане, не дублиране
Съществуващата `src/lib/ai/` система (manager/influencer/editor/marketing) се **обвива** в новия
task/registry слой. Функционалните сигнатури на агентите остават; извикват се от task runner.
→ *Следствие:* нулева загуба на текуща функционалност; кампаниите продължават да работят.

### ADR-2 — Един Next.js app; MCP като route segment (засега)
Проектът е single app. MCP сървърът се имплементира в `src/app/(mcp)/mcp/` (Route Handler с MCP
transport), **не** отделен `/apps/mcp`. Изнасяне в monorepo само ако порасне.
→ *Следствие:* по-малко инфраструктура; един deploy; споделен код за auth/schemas.

### ADR-3 — Durable task state в Postgres + Supabase Realtime
Цялото състояние на task/run/event живее в Postgres (не в памет). UI слуша Supabase Realtime за
статуси, stream chunks, artifact readiness. Reconnect чрез повторно четене на persisted events.
→ *Следствие:* устойчивост след refresh/disconnect; realtime за пръв път в проекта.

### ADR-4 — Queue отложен; Phase 1–2 синхронни, Phase 3 въвежда worker
Phase 1–2 работят в API route с `maxDuration` (както днешната кампания). **Контролът
(pause/stop/redirect) и дългите runs изискват durable queue** — изборът (Supabase-табличен vs
QStash) се прави **преди Phase 3**. Дизайнът на таблиците вече го предвижда (`current_run_id`,
`cancel_requested_at`, `agent_interventions`).
→ *Следствие:* бърз старт без блокер; ясна граница къде queue става задължителен.

### ADR-5 — Provider Adapter Layer
Всички AI извиквания минават през `ModelProviderAdapter`. Стартови адаптери: **Anthropic**
(обвива днешния `runStructured`, добавя streaming/cancel) и **OpenAI** (текст + `gpt-image`).
Модел per-agent идва от Model Registry, не hardcoded.
→ *Следствие:* „различен модел за всеки агент" става възможно; fallback модели; usage logging на едно място.

### ADR-6 — Изображения: OpenAI `gpt-image`; text overlay = deterministic слой
Генериране/edit на изображения през OpenAI `gpt-image` (адаптер `generateImage`/`editImage`).
Текстът върху рекламите **не** разчита на image модела — рендерира се програмно (SVG →
растеризация). Оценяваме `sharp` vs чист `@resvg/resvg-js`/Canvas по Vercel-съвместимост в Phase 6.
→ *Следствие:* качествен, четим текст; оригиналните изображения се пазят, всяка трансформация = нова версия.

### ADR-7 — Unified artifacts модел + bridge към старите таблици
Нов `artifacts` + `artifact_versions` + `approvals` за preview/approval/versioning. Съществуващите
`social_posts`/`ai_editor_suggestions`/`marketing_strategies` се **мапват** към artifact (bridge),
но остават източник на истина за published state.
→ *Следствие:* единен preview/approval flow без миграция на стари данни разрушително.

### ADR-8 — RLS policies, роли и MCP scopes
Реални RLS policies по роля (Owner/Admin/Editor/Reviewer/Viewer). Service-role само server-side.
MCP: token per client, scopes, `artifacts:publish` е отделен high-risk scope. Audit log за всички writes.
→ *Следствие:* multi-user и външен достъп са безопасни; least privilege.

### ADR-9 — Shared Zod schemas + TS strict
Всички API/MCP входове и изходи се валидират със Zod схеми в `src/lib/agent-chat/schemas/`
(single source of truth, преизползвани от UI, API и MCP).
→ *Следствие:* типова и runtime безопасност; по-малко дублиране.

### ADR-10 — Тестова стека: Vitest + Playwright
Днес няма test runner. Добавяме Vitest (unit: orchestration rules, synthesis, adapters) и
Playwright (E2E: основните workflow-и).
→ *Следствие:* покрива acceptance §24–25.

---

## Част B — Data Model (миграции)

Additive, продължаваща номерация (последна е `025`). Всяка миграция: таблици + indexes +
`updated_at` тригер (по конвенцията) + RLS enable + policies.

| Миграция | Таблици | Цел |
|----------|---------|-----|
| `026_agent_chat_registry` ✅ | `model_configs`, `agents` (+ seed на 4-те агента) | Registry (secrets като `secret_ref`) |
| `027_agent_chat_core` ✅ | `conversations`, `conversation_members`, `messages` | Чат ядро |
| `028_agent_chat_tasks` | `tasks`, `task_plans`, `task_runs`, `task_events`, `agent_interventions` | Task lifecycle + audit |
| `029_agent_chat_artifacts` | `artifacts`, `artifact_versions`, `approvals` (+ storage bucket `ai-artifacts`, private) | Preview/approval/versioning |

> Registry е преди core (026→027) заради FK целостта: `conversation_members` реферира
> `agents` и `model_configs`. Tasks/artifacts се изместват на 028/029.

Колоните следват точно requirements §13. `messages.message_type ∈
{text,activity,question,artifact,error,approval}`; `tasks.status` = пълния lifecycle enum от §8.

---

## Част C — Кодова структура

```
src/lib/agent-chat/
├── registry/         agents.ts, models.ts        # Agent & Model Registry
├── providers/        types.ts, anthropic.ts, openai.ts, index.ts  # Adapter Layer (ADR-5/6)
├── orchestrator/     orchestrator.ts, planner.ts, synthesis.ts     # §5 нови системни агенти
├── tasks/            runner.ts, lifecycle.ts, events.ts            # task execution + emit
├── artifacts/        store.ts, overlay.ts                          # artifacts + text overlay
├── channels/         presets.ts                                    # Channel Preset Registry (§11)
├── schemas/          *.ts                                          # споделени Zod схеми (ADR-9)
└── realtime.ts       # Supabase Realtime helpers

src/app/agent-chat/                 # новият three-panel UI (§4, §22)
src/app/api/agent-chat/...          # REST endpoints (§21)
src/app/(mcp)/mcp/route.ts          # MCP сървър (ADR-2, §17)
```

Съществуващите агенти в `src/lib/ai/agents/*` остават; получават тънък адаптер в `registry`.

---

## Част D — Wireframes (три панела, §4.1)

```
┌──────────────┬─────────────────────────────────────┬────────────────────────┐
│ CONVERSATIONS│           CHAT TIMELINE             │     TASK INSPECTOR     │
│  (ляв панел) │          (централен)               │      (десен панел)     │
├──────────────┼─────────────────────────────────────┼────────────────────────┤
│ [+ Нов чат]  │  👤 Напиши статия за OLED тв...     │ Задача: Статия+снимка  │
│              │                                     │ Статус: running        │
│ ▸ OLED статия│  🧭 Planner: Разделих на research,  │ Активен: Writer        │
│   Реклама FB │     писане, изображение, проверка.  │ Модел: claude-opus-4-8 │
│   Продукт X  │     [Виж план]                      │────────────────────────│
│              │                                     │ ▸ План (DAG)           │
│─── АГЕНТИ ───│  ✍️ Writer: Структурата и уводът    │   research ✓           │
│ 🧭 Planner ●│     са готови. Разработвам секциите. │   write   ⟳            │
│ ✍️ Writer  ⟳│     [Виж вход][Виж резултат]        │   image   ⏸            │
│ 🖼 Image   ⏸│                                     │   review  ·            │
│ ✅ QA      ·│  🖼 Image: Създавам hero 1200×630.  │────────────────────────│
│ [+ Добави]   │                                     │ Controls:              │
│              │  ┌─ PreviewCard ────────────┐      │ [⏸ Pause][⏹ Stop]     │
│  всеки агент │  │ [thumb] Статия · v1      │      │ [↻ Retry][➦ Redirect] │
│  → model     │  │ QA: ok  [Отвори preview] │      │────────────────────────│
│  badge +     │  └──────────────────────────┘      │ Logs / Usage:          │
│  status badge│  [Approve & Publish][Промени]      │ 12.3s · 8k in/2k out   │
│              │  ─────────────────────────────      │ ~$0.14 · retries: 0    │
│              │  [ InterventionComposer........... ]│ [Виж лог]              │
└──────────────┴─────────────────────────────────────┴────────────────────────┘
Mobile: панелите стават drawers (ляв=☰, десен=ⓘ).
```

**Статус badges:** Idle · Planning · Working · Waiting · Paused · Failed · Completed.
**Синтезирани съобщения:** ~160–240 символа, с expand опции ([Виж план/вход/резултат/лог]).

---

## Част E — Фазиран план (deliverables + acceptance)

Всяка фаза: миграция → backend → UI → tests → docs. Директно публикуване само с approval+permission.

### Phase 1 — Chat инфраструктура ✅ имплементирано (чака миграции + ръчен тест)
- Миграции `026` (registry) + `027` (chat core + RLS).
- Agent Registry + Model Registry (таблици + seed от 4-те агента) + `src/lib/agent-chat/`.
- REST: `GET /api/agent-chat/agents`, `GET|POST /api/agent-chat/conversations`,
  `GET /conversations/:id`, `POST /conversations/:id/messages`,
  `POST /conversations/:id/agents`, `PATCH|DELETE /conversations/:id/agents/:memberId`.
- UI: `/admin-panel/agent-chat` (admin-guarded), ConversationList, AgentRoster, AgentPicker,
  ChatTimeline, Composer, StatusBadge.
- **Realtime решение:** приложението не ползва Supabase Auth (custom cookie сесии), затова
  browser клиентът е анонимен и Realtime RLS не може да идентифицира потребителя. За да не
  отваряме широка anon SELECT policy, Phase 1 ползва **optimistic UI + refetch** след действие
  (данните оцеляват refresh чрез server-load). Истински multi-client Realtime се добавя, когато
  вкараме authorized канал (Phase 2, заедно с task events).
- **Acceptance §24.1/§24.2:** добавяне/премахване на idle агент, избор на модел, badges,
  съобщения оцеляват refresh. ✅

### Phase 2 — Task orchestration ✅ имплементирано (чака миграция 028 + ръчен тест)
- Миграция `028` (tasks/task_plans/task_runs/task_events/agent_interventions + RLS).
- Provider Adapter Layer (`src/lib/agent-chat/providers/`): Anthropic adapter обвива Claude call
  с usage capture; `getAdapter(provider)`. OpenAI adapter се добавя в Phase 5.
- Orchestrator (`orchestrator/orchestrator.ts`): plan → topo-execute на DAG → ready_for_approval.
  Detailed Planning Agent (`planner.ts`, DAG с `dependsOn`, enum от наличните агенти).
  Activity Synthesis (`synthesis.ts`, template-based, ≤240 символа). Всяка стъпка пише
  `task_runs` + `task_events` + кратко activity съобщение в чата.
- REST: `POST /conversations/:id/tasks` (стартира през `after()` bg run) + `GET /tasks/:id`.
- UI: композер с бутон „▶ Задача", TaskInspector (десен панел: план, runs+usage, събития),
  polling на 1.5s за жив прогрес; agent activity/error съобщения в timeline-а.
- **Известни ограничения (за следващи фази):**
  1. Per-agent модел се записва на run-овете, но legacy специалистите (influencer/editor/
     marketing) все още викат `runStructured` с hardcoded `claude-opus-4-8` вътрешно — само
     планирането ползва конфигурируемия adapter/модел. Пълното per-agent wiring идва, когато
     специалистите се преместят върху adapter-а (Phase 4).
  2. Живият прогрес разчита на `after()` bg execution на serverless — дълги задачи може да
     надхвърлят function limit → durable queue е Phase 3.
  3. Pause/stop/redirect още не са свързани (таблицата `agent_interventions` е готова) — Phase 3.
- **Acceptance §24.2:** вижда се кой агент работи (status badges + activity съобщения); кратки
  синтезирани съобщения; планът е достъпен в инспектора. ✅ (live realtime → Phase 3)

### Phase 3 — Agent controls ✅ имплементирано (cooperative, без queue)
- **Решение за queue:** отложеният durable queue се заобикаля с **cooperative control** —
  pause/stop/redirect се записват в `agent_interventions` и оркестраторът ги **консумира между
  стъпките** (`consumePendingControl`). Работи на Vercel през `after()`, без нова инфраструктура.
  Ограничение: спирането влиза в сила на граница между стъпки (не прекъсва текущ Claude call —
  legacy специалистите не приемат `AbortSignal`); true mid-call cancel идва с adapter refactor.
- `src/lib/agent-chat/interventions.ts` (record/consume/checkpoint); orchestrator рефакторван на
  `executeSteps` + `resumeTask` (resume/retry продължават от succeeded-step checkpoint).
- REST: `POST /api/agent-chat/tasks/:id/control` (`pause|resume|stop|redirect|retry`);
  resume/retry re-trigger-ват през `after()`.
- UI: **ControlBar** в TaskInspector (Пауза/Продължи/Стоп/Опитай пак) + **InterventionComposer**
  (redirect); polling се рестартира при resume/retry.
- **Acceptance §24.3:** pause/resume/stop/redirect работят; partial outputs се пазят (succeeded
  runs + artifacts); историята е в `task_events`/`agent_interventions`. ✅
- **Забележка:** durable queue (QStash/Upstash или Supabase-табличен) остава за Phase 8 hardening,
  ако дълги задачи започнат да надхвърлят serverless лимита.

### Phase 4 — Article workflow
- Нови агенти: Metadata, QA/Review, Publisher (обвиват blog-generate + editor + storage + Meta).
- Миграция `028` (artifacts) + bridge на старите таблици. Image агент = OpenAI `gpt-image` (hero).
- UI: ArticlePreview (responsive), ApprovalBar, PublishResultCard.
- **Acceptance §24.4:** една команда → текст+изображение+metadata+QA+preview+approval→published URL.

### Phase 5 — Product images
- Upload flow (преизползва storage pattern) → `gpt-image` generate/edit (background remove/replace,
  lifestyle, shadow, resize). Versioning: оригиналът се пази, всяка трансформация = нова версия.
- UI: ImageComparisonPreview (before/after), варианти.
- **Acceptance §24.5.**

### Phase 6 — Social ads
- Channel Preset Registry (размери/safe areas, конфиг). Copy agent + Image agent + **deterministic
  text-overlay engine** (SVG rendering, ADR-6) + validation (contrast/safe area/clipping).
- UI: SocialAdPreview (per-канал, точен aspect ratio).
- **Acceptance §24.6.**

### Phase 7 — MCP сървър
- `(mcp)/mcp/route.ts` с MCP SDK. Tools от §17.3. Token auth + scopes + rate limit + audit log.
- `artifacts:publish` е отделен scope; publish не работи без него.
- **Acceptance §24.7.**

### Phase 8 — Hardening
- Тестове (Vitest + Playwright), monitoring/structured logging, budget/cost controls (§19),
  security review, performance, документация.

---

## Част F — Отворени точки (не блокират старта)
1. **Queue избор** — преди Phase 3 (Supabase-табличен vs QStash/Upstash).
2. **Text-overlay lib** — `sharp` vs `@resvg/resvg-js` (Vercel bundling) — решаваме в Phase 6.
3. **Роли mapping** — Owner/Admin/Editor/Reviewer/Viewer върху текущите `user/merchant/admin`.
4. **MCP token storage** — таблица + hashing; уточнява се в Phase 7.

---

## Одобрение
При одобрение започвам **Phase 1**: миграция `026` + Agent/Model Registry (`029`) + chat backend +
базов realtime UI. Нищо няма да се публикува автоматично без approval и permission checks.
