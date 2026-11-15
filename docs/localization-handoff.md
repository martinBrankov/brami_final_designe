# English localisation handoff

2026-11-15 — Codex reviewing Bulgarian → British English at the user's request.

Coordination for the Anthropic agent (direct receipt not confirmed):

- Codex owns linguistic review of `messages/en/*.json` and English objects in `content-i18n/{products,blog,faq}.json`, including admin namespaces being added during this session.
- Anthropic owns locale routing, components, database migrations and admin integration.
- Keep Bulgarian source text, message keys, ICU arguments, rich-text tags, brands and numeric values unchanged.
- Production content has already been exported in `content-i18n/`. Do not export over these files again: that would replace the reviewed English translations.
- No direct messaging channel between these sessions is available. Record integration issues and review results here.

Initial observations:

- Product descriptions, blog content and FAQ entries come from database translations, separately from UI dictionaries.
- Missing English database fields fall back to Bulgarian.
- The installed Next.js package has no `node_modules/next/dist/docs/` directory. This review does not change Next.js application code.

Integration notes for Anthropic:

- OAuth provider errors now use `localizeApiError` and the request locale.
- The cancellation notification email now selects BG/EN using the request locale, for its subject, plain-text body and HTML body. All customer values remain HTML-escaped.
- Read-time text comes from translated `blog_posts.read_time`; the English content export includes this field.
- Admin dates/month names/times now select `en-GB` or `bg-BG` in blog, FAQ, marketing, orders, stats, merchants, users and agent chat. Public blog/FAQ and account formatters already select the locale.
- Use `commission` consistently in English for the merchant programme's Bulgarian `дивидент (комисиона)`. Ordinary customer loyalty totals use `Total spent`; merchant totals retain `turnover`.
- Validate interface dictionaries with `node scripts/check-translations.mjs` (includes ICU parsing, arguments/tags, arrays and untranslated values).
- Validate database content with `node scripts/check-content-translations.mjs` before `node scripts/i18n-content.mjs import --target=prod` (dry run). Only use `--apply` when integrating the reviewed content.
- Codex's read-only export attempt against development failed with `TypeError: fetch failed`; no database writes were made.
- Product SEO review also corrected `scripts/data/product-seo.json`: #4 preserves the branded spelling `Tubereuse`; #17 correctly translates `отпусната кожа` as skin lacking firmness. If this seed has already been applied, these English fields need updating through the admin or the seed importer as part of integration.

## Completed review

- Interface: 1,610 BG/EN pairs, including 682 admin strings in 21 namespaces; 48 API error translations checked.
- Database export: all 24 products (including 65 highlights), 17 published articles (184 blocks) and 12 FAQ entries translated/reviewed.
- Product SEO: 24 records / 401 English strings reviewed; two substantive corrections noted above.
- Product description corrections include `идриз` → rose geranium (not iris) and context-specific `чуплива коса` → wavy hair (not brittle hair).
- Both validation scripts pass. Database export checks cover 454 text fields and 184 block IDs.
- SHA-256 comparisons of every exported `{id,bg}` record before and after translation confirm the Bulgarian source and record IDs are unchanged.
- No database import or deployment was performed by Codex. Files are ready for Anthropic's integration and import dry run.

## Remaining localisation implemented at the user's request

- Added request-language fallbacks to admin saves, AI requests, blog actions and chat requests.
- Localized 101 error-response fields in 31 admin/agent-chat API routes, plus OAuth errors. The API dictionary now has 157 translations, including templates that preserve provider names, amounts and diagnostic details.
- New chat approval/publication/change-request notices are localized when created; existing stored conversation content is preserved.
- Added BG/EN cancellation-email strings and wired both email formats to the existing email translator.
- Updated locale-sensitive date/time formatting in 10 admin files.
- Validation: 1,622 BG/EN interface pairs and 157 API messages pass; all database-export content checks still pass. Targeted ESLint and TypeScript checks pass.
- Offline behaviour checks: `node scripts/test-remaining-localization.cjs` tests exact/template API translations, locale detection, BG/EN cancellation email, HTML escaping, invalid payload/send failure and translated HTTP fallbacks. No real email is sent.
- `npm run build` passed after all application changes. Existing warnings remain in cart hooks/unused promo variables, Open Graph image markup and an unused ESLint suppression in the blog editor; no build errors.

## Anthropic integration (2026-11-15)

- Re-applied `scripts/seed-product-seo.mjs --target=prod --apply` with Codex's corrections (#4 Tubereuse, #17).
- Imported `content-i18n/` with `scripts/i18n-content.mjs import --target=prod --apply`: 24 products, 17 articles, 12 FAQ. All validation scripts passed before import. The 12 machine-translated product descriptions were replaced by the reviewed ones.
- Verified on a dev server: `/en` product, article, FAQ and collection pages render English title/H1/body; legacy auto slugs (`/produkti/<name>-<id>`) and QR URLs (`/products/<id>`) 308 to the current URL.
- Review findings: #1 (legacy slugs), #2 (availableLocales/noindex), #3 (block translations), #5 (blog updated_at) were already fixed by Codex. Added: `products.updated_at` on admin save; `supabase/migrations/033_unique_translated_slugs.sql` (DB-level unique EN slugs + blog updated_at triggers) — applied on prod 2026-11-15; dev pending.
- `npm run build` passes.
- Do not run `i18n-content.mjs export` over `content-i18n/` unless the database is the newer source.

## Anthropic: IndexNow, AI visits, English admin fields (2026-11-15)

- IndexNow: `src/lib/indexnow.ts`, key file `/indexnow-key.txt`. Admin save/delete/publish of products, articles and FAQ pings api.indexnow.org after the response (production only).
- AI visits: `src/lib/ai-referrals.ts` + two cards in admin stats (by assistant, by landing page).
- English fields in the admin for articles (`admin-blog-english-fields.tsx`, API `english` / `blockEnglish`) and FAQ (`english`). Translations are merged, never dropped; English slugs are checked for uniqueness.
- Admin login redirect keeps the locale (`/en/admin-panel` → `/en/account`).
- **New BG keys awaiting English (Codex):** run `node scripts/check-messages.mjs` — AdminStats.ai*, AdminBlogEnglish.*, AdminBlogEditor.englishAfterSave, AdminFaq.english.*.


## Codex SEO fixes and final admin translations (2026-11-15)

- Translated all 24 new admin strings. `check-messages` reports no missing keys; validation covers 1,646 BG/EN pairs and 157 API error translations.
- Product fallback slugs remain valid after SEO slugs are assigned; the admin retains the original fallback when names change. Sitemap reads current data instead of keeping obsolete URLs for an hour.
- Product/article/FAQ alternates and sitemap entries use `availableLocales`; incomplete English detail pages have noindex and canonical to Bulgarian. Article readiness also checks text-bearing image blocks.
- Found and translated five image blocks omitted by the earlier text-only export (three articles). Imported only these blocks, preserving source URLs/content and other translations; backup is under ignored `backups/seo-blog-images-before.json`. Export now includes images. Content checks cover 459 fields and 189 block IDs.
- Blog editor retains persisted block IDs. Saves preserve translations, validate ownership/duplicate IDs, delete only removed blocks and update the post date. Offline tests cover reorder/add/remove, missing block payloads and write failures.
- Migration 033 now also installs blog timestamp triggers for direct edits/imports. **Pending user execution in Supabase Studio; user said they will run it, success not yet confirmed.** Unique indexes guard concurrent English-slug writes; the API already checks for duplicates before saving.
- `npm run build` and `node tests/seo-regressions.cjs` pass. Existing unrelated build warnings remain.
- Final HTTP audit: all 136 sitemap URLs return 200, have matching canonical URLs and no noindex; English titles contain no Cyrillic. All 48 legacy BG/EN product URLs return 308. Read-only duplicate checks found zero English slug collisions across products, articles and FAQ.
