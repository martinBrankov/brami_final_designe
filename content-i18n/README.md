# Translations (bg → en)

The site is Bulgarian first; English lives under `/en`. Two kinds of text need translating.

Review completed on 2026-11-15: 24 products, 17 articles (189 blocks, including 5 image blocks) and 12 FAQ entries have English translations. Both validation commands below pass. The reviewed content has been imported into the production database. Codex also imported the five image-block translations after checking their source content and saving a backup.

**Do not run export over this directory after translation:** export replaces the local English content with the database version. Use the import dry run to review the completed local translations.

## 1. Interface texts – `messages/en/*.json`

- `messages/bg/*.json` is the source and must not be edited by the translator.
- Every key in `messages/bg/<file>.json` needs the same key in `messages/en/<file>.json`.
- Run `node scripts/check-messages.mjs` to list missing keys. Until a key is translated, the English site shows the Bulgarian text.
- Keep `{placeholders}`, ICU plurals (`{count, plural, ...}`) and tags such as `<strong>…</strong>` exactly as in Bulgarian.

## 2. Database content – `content-i18n/*.json`

The content is exported with `node scripts/i18n-content.mjs export --target=prod`:

| File | Content |
|---|---|
| `products.json` | product name, packaging, description (HTML) and highlights |
| `blog.json` | published articles: title, eyebrow, excerpt, read time and text blocks (HTML) and image blocks (JSON with translated alt/caption) |
| `faq.json` | published FAQ: question, answer, category |

Rules:

- **Fill in only the `en` objects.** Never change `bg`, `id` or block `id`s.
- Keep every HTML tag and attribute; translate only the text.
- Keep brand names: Brami, Brami Trade, Saffron Adela Sunny, Voditsa, Shafpol Beauty, Speedy. Keep INCI names, ISO 3632 and numbers. Write units in English: „мл“ → ml, „г/гр“ → g.
- British English, natural and search-friendly, with no claims that are not in the Bulgarian text (no medical promises).
- `slug`: lowercase English words joined with hyphens (a–z, 0–9). If it is left empty, it is generated from the title or question.
- An empty `en` value means "not translated", and the site then shows the Bulgarian text.
- All 24 English product descriptions and 65 highlights have been translated/reviewed against Bulgarian. Product SEO fields (title, meta description, summary, FAQ) are edited in the admin or seeded from `scripts/data/product-seo.json`; corrections to this seed are listed in `docs/localization-handoff.md`.

After translating, import with a dry run first:

```
node scripts/i18n-content.mjs import --target=prod
node scripts/i18n-content.mjs import --target=prod --apply
```

The import writes only non-empty `en` values into the `translations` columns. Bulgarian content is never changed.

Validate before importing:

```
node scripts/check-translations.mjs
node scripts/check-content-translations.mjs
```

These checks cover interface key parity, ICU arguments and rich-text tags, English content completeness, preserved HTML tags/attributes and block IDs, unique English slugs, and untranslated Cyrillic values.
