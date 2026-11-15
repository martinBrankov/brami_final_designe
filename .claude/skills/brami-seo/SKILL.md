---
name: brami-seo
description: Техническо SEO и оптимизация за AI търсачки (GEO) на brami.shop — адреси и пренасочвания, метаданни (canonical, hreflang, Open Graph), JSON-LD schema, sitemap, robots.txt, llms.txt, IndexNow, проследяване на посещения от AI, снимки и тежест на страниците. Използвай при нова/променена публична страница, промяна на адреси, schema, sitemap/robots, или при проверка защо страница не се индексира/цитира.
---

# Brami — техническо SEO + AI търсене (GEO)

Подробният план и решенията са в `docs/seo-geo-plan.md`; последният одит — `docs/seo-review-2026-11-15.md`. За текстовете на продукти/статии виж skill `brami-seo-content`.

## Принципи
- **Приоритет на фразите: първо „козметика с шафран“, после „натурална козметика“.** Важи навсякъде, където двете се срещат: заглавие, H1, meta описание, alt текст, schema, `llms.txt` и редът на връзките. „Козметика с шафран“ стои първа; „натурална (българска) козметика“ е втората фраза, не водещата. На английски: „saffron cosmetics“, после „natural cosmetics“.
- **Нито едно SEO подобрение не трябва да вреди на AI търсенето и обратно.** ~80% е общо: уникално съдържание, пълна schema, HTML от сървъра, бърз сайт.
- **Само HTML-ът от сървъра се брои.** Повечето AI ботове не изпълняват JS. Съдържанието, което трябва да се цитира (описание, таблица, FAQ, отзиви), се рендерира на сървъра. Табовете на продукта рендерират **и двата** панела; неактивният е с `hidden` (`product-detail-tabs.tsx`).
- ChatGPT и Copilot търсят през **Bing** → Bing Webmaster Tools + IndexNow са толкова важни, колкото Google.
- **Каноничен хост: `https://www.brami.shop`** (`SITE_URL` от `src/lib/site-url.ts`). Всички абсолютни адреси минават през `absoluteUrl()` / `localizedUrl()`. Никога `*.vercel.app`.
- Само истински данни в schema-та. Без измислени дати, рейтинги или баркодове.

## Адреси
- Карта на адресите: `pathnames` в `src/i18n/routing.ts`. bg е **български на латиница** (`/produkti`, `/za-nas`, `/kozmetika-s-shafran`), en е на английски под `/en` (`/en/products`, `/en/about`).
- Slug-ове: `slugifyQuestion()` (`src/lib/faq-slug.ts`, официална българска транслитерация). Английският slug е отделен (`translations.en.slug`) и уникален (индекси от миграция 033).
- **Не сменяй адрес без пренасочване.** Смененият slug на продукт отива в `old_slugs`; страницата прави `permanentRedirect` за числово id, чужд/стар slug (`findProductByUrlKey`).
- Статиите и FAQ пренасочват само slug от **другия език** (`redirectSlug`). **Нямат история на стари адреси** — смяна на slug на публикувана статия или въпрос води до 404 на стария адрес. Не сменяй такива slug-ове; ако се наложи, първо добави `old_slugs` по модела на продуктите.
- QR кодовете на етикетите са `/products/<id>` → `src/middleware.ts` ги пренасочва (308) към текущия адрес. **Не чупи този формат.**
- Middleware-ът превръща 307 от next-intl в **308**. Пренасочванията за постоянни промени са 308 (`permanentRedirect`), никога 307/302.
- Стари параметри: `/produkti?category=hair` → 308 към колекцията (`CATEGORY_COLLECTIONS`). Проверка за ключ от потребителски вход: `Object.hasOwn`, не `in`.

## Метаданни на страница
```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "SomePage" });
  const alternates = buildAlternates(locale, "/some-page"); // canonical + hreflang bg/en/x-default
  return {
    title: t("metaTitle"),                 // layout добавя " | Brami"
    description: t("metaDescription"),     // ≤ 155 знака
    alternates,
    openGraph: {
      title: `${t("metaTitle")} | Brami`,
      description: t("ogDescription"),
      url: alternates.canonical as string,
      locale: OG_LOCALES[locale],
      images: DEFAULT_OG_IMAGES,           // или собствена снимка 1200×630
    },
  };
}
```
- `openGraph` на страницата **заменя** този от layout-а → всяка страница си задава `images`.
- **Не задавай `twitter.title/description`** — layout-ът задава само `card`, а Next.js ги взима от `openGraph` на страницата.
- Страници с адрес по език (продукт, статия, FAQ): `buildAlternates(locale, { bg: href, en: href }, item.availableLocales)`. Ако английският превод не е готов → английската страница е `noindex`, canonical към bg, без hreflang към en.
- Частни/служебни страници (количка, профил, поръчки, отписване, формуляр): `robots: { index: false, follow: false }`. Админът е noindex от своя layout.

## JSON-LD (`jsonLdScript()` от `src/lib/seo.ts`)
| Къде | Типове |
|---|---|
| layout | `OnlineStore` (`@id: ${SITE_URL}/#organization`, legalName Brami Trade, адрес, ЕИК, brand Saffron Adela Sunny), `WebSite` |
| продукт | `Product` (+ `Book` при ISBN): brand/manufacturer (`getProductBrandName`, `getProductManufacturer`), `countryOfOrigin` за собствените, `sku`, `gtin`/`isbn` само ако `isValidGtin()`, `offers` (EUR, наличност от `stock`, `shippingDetails`, `MerchantReturnPolicy` 14 дни, връщането за сметка на клиента), `aggregateRating`, `review[]`, `additionalProperty`; плюс `FAQPage` и `BreadcrumbList` |
| колекция | `CollectionPage` + `ItemList`, `FAQPage`, `BreadcrumbList` |
| статия | `BlogPosting` (`dateModified` от `updated_at`), `BreadcrumbList` |
| FAQ | `FAQPage` (+ `BreadcrumbList` на отделен въпрос) |
| за нас / контакти | `AboutPage`, `ContactPage` |

Правила: препращай към организацията с `@id`, вместо да я дублираш. **Без `priceValidUntil`**, освен ако има реална дата на промоцията. Цената е `toFixed(2)` в EUR.

## Вътрешни връзки и икони
- Статиите и отделните FAQ страници завършват с `RelatedProductsSection` (`src/components/related-products-section.tsx`): продукти и колекции, избрани по текста от `pickRelatedProducts` / `pickRelatedCollections` (`src/lib/related-content.ts`). Нов вид продукт или категория → допълни `CATEGORY_PATTERNS`.
- Всяка колекция има връзка от началната страница (`HomeCollections`) и от футъра (`collectionLinks` в `bottom-bar.tsx`). Нова колекция → добави я и на двете места.
- Икони: `src/app/favicon.ico`, `icon.png`, `apple-icon.png` (цветето от логото). Next.js сам добавя `<link rel="icon">`.
- Заглавие и описание на FAQ страница се съкращават с `truncateAtWord()` (60 / 155 знака); `<h1>` и `og:title` пазят целия въпрос.
- Hero снимките на началната имат `sizes`, за да не се тегли скритата в пълен размер. Не махай `sizes`.

- Ред на колекциите навсякъде (`COLLECTION_KEYS`, `COLLECTION_PAGES`, футър, начална): **шафран → шафран за лице → шафран за коса → шафран за тяло → българска натурална → натурална за лице**. Колекциите „hair“ и „body“ са „Козметика с шафран за коса/тяло“ (всичките им продукти са с шафран; старите адреси `/kozmetika-za-kosa`, `/kozmetika-za-tyalo` пренасочват с 308 от `next.config.ts`). Лицето е разделено на `saffron-face` и `face`, защото има и продукти без шафран — не прави две колекции с едни и същи продукти. Иконите на картите са в `COLLECTION_ICONS` (`home-collections.tsx`). В свързаните продукти линията Saffron Adela Sunny излиза преди другите марки при близко съвпадение (`rankProducts`).
- Блокът „Виж още“ (`SeeAlsoLinks` / `SeeAlsoPills` в `see-also-links.tsx`) стои в края на списъчните и служебните страници; продуктът и колекцията ползват `RelatedReadingSection` (статии по категорията, въпроси за продукта, колекции). Нова публична страница → добави я в `SEE_ALSO_PAGES` и сложи блок с подходящите връзки.

## Sitemap, robots, llms.txt
- `src/app/sitemap.ts` (`force-dynamic`): всеки адрес на всеки готов език с `alternates.languages`, `lastModified` от `updated_at`, снимки за продуктите. **Нова публична страница → добави я тук.**
- `public/robots.txt`: разрешени са всички търсачки и AI ботове (търсене **и** обучение: GPTBot, ClaudeBot, Google-Extended, CCBot, Meta-ExternalAgent…). Блокирани са само `/api/`, админът и отписването (лични токени). **Не блокирай страници с noindex** — тогава търсачката не вижда noindex. Ботовете са изброени в две групи с еднакви правила — при промяна обнови и двете.
- `src/app/llms.txt/route.ts`: генерирана карта за AI (факти за марката, продукти, ключови страници, английска секция). При нов вид страници или промяна на фактите го обнови.
- Vercel Firewall / Bot protection не трябва да блокира тези user-agent-и.

## IndexNow (Bing → ChatGPT/Copilot)
- `notifyIndexNow(getUrls)` от `src/lib/indexnow.ts` — праща адресите след отговора (`after()`), само в production.
- Готови функции: `getProductUrls(id)`, `getBlogPostUrls(id)`, `getFaqEntryUrls(id)` (всички готови езици + списъчната страница).
- **Всеки admin route, който създава/променя/трие публично съдържание, вика `notifyIndexNow`.** При изтриване/смяна на адрес изчисли адресите **преди** промяната (`urlsBefore`) и прати и старите, и новите.
- Ключ: `/indexnow-key.txt` (`INDEXNOW_KEY` или вграденият). Резултатът се вижда в Bing Webmaster Tools → IndexNow.

## Посещения от AI
- `detectAiSource(referrer, landingPath)` в `src/lib/ai-referrals.ts` разпознава асистента по referrer хост или `utm_source` (ChatGPT добавя `utm_source=chatgpt.com`).
- Показва се в админ → Статистики. Нов асистент → добави го в `AI_SOURCES` (хостове + utm).
- Цитиранията в Copilot/Bing: Bing Webmaster Tools → **AI Performance**.

## Снимки
- Описателни имена на латиница: `src/assets/images/products/<име>/<име>.jpg` и `<име>-og.jpg` (напр. `shampoan-s-shafran-saffron-adela-sunny-250-ml`). Next.js пази името в адреса → стига до Google Images.
- Ключовете в базата (`product_images.image_src = "idNN"`) не се сменят; сменят се само import пътищата.
- Alt текст за всяка продуктова снимка (`product_images.alt` + `translations.en.alt`), различен за всеки продукт. Декоративни икони: `alt=""`.
- `next.config.ts` сервира AVIF/WebP. OG снимките са ~1200×630.

## Кеширане на публичните страници (ISR)
- Публичните страници са статични и се сервират от кеша (`revalidate = 600` и `generateStaticParams` в `src/app/[locale]/layout.tsx`). Продуктите, статиите и въпросите се рендерират при build от `generateStaticParams` на съответната страница.
- **Публична страница не чете заявката**: без `cookies()`, `headers()`, `getUserSession()`, `searchParams` и без `force-dynamic` — иначе пак става динамична и бавна. Потребителят идва от браузъра (`UserProvider` → `/api/auth/session`, `useUser()`); параметри от адреса се четат в client компонент с `useSearchParams` в `<Suspense>` (`UrlFilterSync`, `LegalBackButton`); пренасочвания по параметър са в `src/middleware.ts` (`legacyQueryRedirect`).
- Лични страници (профил, поръчки, админ) са с `force-dynamic`.
- **Всеки route, който променя публично съдържание, вика `revalidatePublicContent()`** (`src/lib/revalidate.ts`) до `notifyIndexNow` — продукти, статии, FAQ, отзиви, публикуване от Agent Chat. Без него промяната се вижда чак след 10 минути.
- Нов slug на български, създаден след build, се рендерира при всяка заявка до следващия deploy (локално `next start` не кешира пренаписани от middleware адреси). След добавяне на много ново съдържание пусни нов deploy.
- Проверка: `curl -sI URL` → `x-nextjs-cache: HIT` и `Cache-Control: s-maxage=600`.

## Тежест на страниците
- Към браузъра отива `ClientProduct` (`toClientProduct()`), не пълният `Product`. Server страница, която подава продукт на client компонент, подава `toClientProduct(product)`.
- `NextIntlClientProvider` получава само текстовете за client компонентите (`getPublicClientMessages`). Нов namespace само за сървъра → `SERVER_ONLY_NAMESPACES` в `src/i18n/client-messages.ts`.
- Ориентир (production build, 15.11.2026): начална ~146 KB HTML, продукт ~190 KB. Ако страница стане много по-тежка, провери какво се сериализира към клиента.

## Проверка
- `npm run test:seo` (`tests/seo-regressions.cjs`) и `npx tsc --noEmit`.
- **Не пускай `next build`, докато върви `next dev` в същата папка** — пишат в една `.next` и dev сървърът започва да връща 500.
- Бърза проверка на страница:
  ```bash
  curl -s URL | grep -o '<link rel="canonical"[^>]*>\|<link rel="alternate" hrefLang="[^"]*" href="[^"]*"\|<meta name="robots"[^>]*>\|<meta property="og:image"[^>]*>'
  curl -sI URL   # пренасочванията трябва да са 308
  ```
- Rich Results Test на Google за schema-та; Bing Webmaster Tools (Sitemaps, IndexNow, AI Performance); Google Search Console (Индексиране → Страници, Подобрения).

## Чеклист: нова публична страница
- [ ] Папка под `src/app/[locale]/` + локализиран адрес в `routing.ts` (bg на латиница, en на английски)
- [ ] `setRequestLocale`, `generateMetadata` с `buildAlternates` и `openGraph.images`
- [ ] Един `<h1>`; съдържанието е в HTML от сървъра
- [ ] Фразите са в реда „козметика с шафран“ → „натурална козметика“; има връзки към и от свързаните страници
- [ ] JSON-LD, ако има смисъл (FAQPage, BreadcrumbList…)
- [ ] Добавена в `sitemap.ts` (и в `llms.txt`, ако е ключова)
- [ ] Не е блокирана в `robots.txt`
- [ ] Текстовете са в `messages/bg` + `messages/en`
