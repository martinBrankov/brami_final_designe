// Offline regression tests: no real database, IndexNow or provider calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');

function load(file, imports) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports, URL, Request, Response, crypto: { randomUUID }, console,
    require: name => {
      if (name.startsWith('@/assets/')) return { src: '/image.jpg' };
      assert.ok(name in imports, `Unexpected dependency: ${name}`);
      return imports[name];
    },
  }, { filename: file });
  return exports;
}

const routing = { defaultLocale: 'bg', locales: ['bg', 'en'] };
const translations = load('src/lib/i18n-content.ts', { '@/i18n/routing': routing });
const readiness = load('src/lib/content-locales.ts', {
  '@/i18n/routing': routing, '@/lib/i18n-content': translations,
});
assert.equal(readiness.translatedLocales({}, ['title', 'slug']).join(), 'bg');
assert.equal(readiness.translatedLocales({ en: { title: 'Hello', slug: 'hello' } }, ['title', 'slug']).join(), 'bg,en');
assert.equal(readiness.translatedLocales({ en: { title: 'Hello', slug: '  ' } }, ['title', 'slug']).join(), 'bg');
assert.equal(readiness.hasTranslatedBlock({ type: 'text', content: 'BG' }, 'en'), false);
assert.equal(readiness.hasTranslatedBlock({ type: 'text', content: 'BG', translations: { en: { content: 'English' } } }, 'en'), true);
assert.equal(readiness.hasTranslatedBlock({ type: 'image', content: '{"url":"/image.jpg"}' }, 'en'), true);
assert.equal(readiness.hasTranslatedBlock({ type: 'image', content: '{"url":"/image.jpg","alt":"BG"}' }, 'en'), false);

const seo = load('src/lib/seo.ts', {
  '@/i18n/routing': routing,
  '@/lib/site-url': { SITE_URL: 'https://brami.shop' },
  '@/i18n/navigation': { getPathname: ({ locale, href }) => `${locale === 'en' ? '/en' : ''}${href}` },
});
const alternates = seo.buildAlternates('en', '/article', ['bg']);
assert.equal(alternates.canonical, 'https://brami.shop/article');
assert.equal(alternates.languages.en, undefined);
assert.equal(alternates.languages['x-default'], 'https://brami.shop/article');

const slug = load('src/lib/faq-slug.ts', {});
const products = load('src/data/products.ts', {
  react: { cache: fn => fn }, '@/lib/supabase': {}, '@/lib/faq-slug': slug,
  '@/lib/i18n-content': translations, '@/lib/content-locales': readiness,
  '@/i18n/routing': routing, '@/data/product-images': { productImages: {} },
});
const product = { id: 1, slug: 'new', slugs: { bg: 'new', en: 'new-en' }, oldSlugs: ['original-1'] };
assert.equal(products.findProductByUrlKey([product], 'original-1'), product);
assert.equal(products.findProductByUrlKey([product], '1'), product);
assert.equal(products.findProductByUrlKey([product], 'does-not-exist'), undefined);

let state;
let failUpsert = false;
const db = {
  from(table) {
    let action = 'select', payload, filters = [];
    const query = {
      select() { return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      neq(key, value) { filters.push(row => row[key] !== value); return query; },
      in(key, values) { filters.push(row => values.includes(row[key])); return query; },
      update(value) { action = 'update'; payload = value; return query; },
      upsert(value) { action = 'upsert'; payload = value; return query; },
      delete() { action = 'delete'; return query; },
      maybeSingle() { return query.then(result => ({ ...result, data: result.data?.[0] })); },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          const rows = state[table];
          const selected = rows.filter(row => filters.every(filter => filter(row)));
          if (action === 'upsert' && failUpsert) return { data: null, error: { message: 'write failed' } };
          if (action === 'update') selected.forEach(row => Object.assign(row, payload));
          if (action === 'upsert') payload.forEach(row => {
            const existing = rows.find(item => item.id === row.id);
            if (existing) Object.assign(existing, row); else rows.push(row);
          });
          if (action === 'delete') state[table] = rows.filter(row => !selected.includes(row));
          return { data: selected, error: null };
        }).then(resolve, reject);
      },
    };
    return query;
  },
};
const adminTranslations = load('src/lib/admin-translations.ts', {
  'server-only': {}, '@/lib/faq-slug': slug, '@/lib/supabase-admin': { createSupabaseAdminClient: () => db },
});
const route = load('src/app/api/admin/blog/[id]/route.ts', {
  'next/server': { NextResponse: Response },
  '@/lib/api-i18n': { localizeApiError: async value => value },
  '@/lib/admin-auth': { requireAdminSession: async () => {} },
  '@/lib/supabase-admin': { createSupabaseAdminClient: () => db },
  '@/lib/admin-translations': adminTranslations,
  '@/lib/indexnow': { getBlogPostUrls: async () => [], notifyIndexNow: () => {} },
});
const reset = () => {
  failUpsert = false;
  state = {
    blog_posts: [{ id: 'post', updated_at: '2020-01-01T00:00:00.000Z' }],
    blog_blocks: [
      { id: 'a', post_id: 'post', content: 'Original A', translations: { en: { content: 'English A' }, de: { content: 'German A' } } },
      { id: 'b', post_id: 'post', content: 'Original B', translations: { en: { content: 'English B' } } },
    ],
  };
};
const save = body => route.PUT(new Request('https://brami.shop/api/admin/blog/post', {
  method: 'PUT', body: JSON.stringify(body),
}), { params: Promise.resolve({ id: 'post' }) });

async function main() {
  reset();
  assert.equal((await save({ blocks: [{ id: 'b', content: 'B edited' }, { id: 'a', content: 'A edited' }] })).status, 200);
  assert.equal(state.blog_blocks.find(b => b.id === 'a').translations.en.content, 'English A');
  assert.equal(state.blog_blocks.find(b => b.id === 'a').translations.de.content, 'German A');
  assert.equal(state.blog_blocks.find(b => b.id === 'b').position, 1);
  assert.ok(Date.parse(state.blog_posts[0].updated_at) > Date.parse('2020-01-01'));
  reset();
  assert.equal((await save({ blocks: [{ id: 'a', content: 'A' }, { content: 'New' }] })).status, 200);
  assert.equal(state.blog_blocks.length, 2);
  assert.equal(state.blog_blocks.some(b => b.id === 'b'), false);
  assert.equal(state.blog_blocks.find(b => b.id === 'a').translations.en.content, 'English A');
  reset();
  assert.equal((await save({ title: 'Metadata only' })).status, 200);
  assert.equal(state.blog_blocks.length, 2);
  reset();
  assert.equal((await save({ blocks: [{ id: 'foreign', content: 'Wrong post' }] })).status, 400);
  assert.equal(state.blog_blocks.length, 2);
  assert.equal(state.blog_posts[0].updated_at, '2020-01-01T00:00:00.000Z');
  reset();
  assert.equal((await save({ blocks: [{ id: 'a', content: 'A' }, { id: 'a', content: 'Duplicate' }] })).status, 400);
  reset();
  failUpsert = true;
  assert.equal((await save({ blocks: [{ id: 'a', content: 'A' }] })).status, 500);
  assert.equal(state.blog_blocks.length, 2);
  reset();
  assert.equal((await save({ blocks: [{ id: 'a', content: 'A' }], blockEnglish: { a: 'Updated English' } })).status, 200);
  assert.equal(state.blog_blocks[0].translations.en.content, 'Updated English');
  assert.equal(state.blog_blocks[0].translations.de.content, 'German A');
  console.log('PASS: translation availability, canonical/hreflang, legacy URL resolution, stable block IDs, translation preservation, reorder/add/remove, ownership validation, save errors and updated_at.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
