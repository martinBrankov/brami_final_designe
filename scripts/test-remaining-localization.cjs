// Offline behaviour checks: no SMTP, database or provider requests are made.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createTranslator } = require('next-intl');

function load(file, imports, extras = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, URL, Request, Response,
    console: { ...console, error() {} },
    require: name => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...extras,
  }, { filename: file });
  return exports;
}
const messages = locale => JSON.parse(fs.readFileSync(`messages/${locale}/email.json`, 'utf8'));
let locale = 'en';
let cookieLocale = 'en';
let referer = 'https://brami.shop/en/account';
const api = load('src/lib/api-i18n.ts', {
  'server-only': {},
  'next/headers': {
    cookies: async () => ({ get: () => cookieLocale ? { value: cookieLocale } : undefined }),
    headers: async () => ({ get: () => referer }),
  },
  '@/i18n/routing': { defaultLocale: 'bg', isAppLocale: value => ['bg', 'en'].includes(value) },
  '../../messages/en/api-errors.json': JSON.parse(fs.readFileSync('messages/en/api-errors.json', 'utf8')),
});

async function main() {
  assert.equal(api.translateApiMessage('Неподдържан доставчик.', 'en'), 'Unsupported provider.');
  assert.equal(api.translateApiMessage('Доставчикът google не е конфигуриран.', 'en'), 'The google provider is not configured.');
  assert.equal(api.translateApiMessage('Неуспешно зареждане на чат: db (42): $&\nnext', 'en'), 'Could not load the chat: db (42): $&\nnext');
  assert.equal(api.translateApiMessage('Meta Graph грешка 403: denied', 'en'), 'Meta Graph error 403: denied');
  assert.equal(api.translateApiMessage('Одобрено.', 'bg'), 'Одобрено.');
  assert.equal(api.translateApiMessage('Unrecognised diagnostic', 'en'), 'Unrecognised diagnostic');
  assert.equal(await api.getRequestLocale(), 'en');
  cookieLocale = undefined;
  assert.equal(await api.getRequestLocale(), 'en');
  referer = 'invalid-url';
  assert.equal(await api.getRequestLocale(), 'bg');

  let sent;
  let deliveries = 0;
  let failDelivery = false;
  const cancellation = load('src/app/api/cancellation/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/api-i18n': {
      getRequestLocale: async () => locale,
      localizeApiError: async message => api.translateApiMessage(message, locale),
    },
    '@/lib/order-mail/i18n': {
      getEmailTranslator: async current => createTranslator({ locale: current, messages: messages(current), namespace: 'Email' }),
    },
    '@/lib/order-mail/mailer': {
      createMailer: () => ({ sendMail: async mail => {
        if (failDelivery) throw new Error('SMTP unavailable');
        deliveries++;
        sent = mail;
      } }),
      getSender: () => 'test@example.com',
      getMailRecipient: value => value,
    },
  });
  const payload = { products: 'Test cream', orderInfo: '123', customerName: '<b>Alice</b>', customerAddress: '1 Test Street', phone: '0888123456', email: 'alice@example.com', date: '15/11/2026' };
  const request = body => new Request('https://brami.shop/api/cancellation', { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await cancellation.POST(request(payload))).status, 202);
  assert.match(sent.subject, /Brami withdrawal form/);
  assert.match(sent.text, /I hereby give notice/);
  assert.ok(!/[\u0400-\u04ff]/u.test(sent.text + sent.html));
  assert.ok(sent.html.includes('&lt;b&gt;Alice&lt;/b&gt;'));
  assert.ok(!sent.html.includes('<b>Alice</b>'));
  locale = 'bg';
  assert.equal((await cancellation.POST(request(payload))).status, 202);
  assert.match(sent.subject, /формуляр за отказ/);
  assert.match(sent.text, /С настоящото уведомявам/);
  assert.equal((await cancellation.POST(request({}))).status, 400);
  assert.equal(deliveries, 2);
  failDelivery = true;
  assert.equal((await cancellation.POST(request(payload))).status, 500);

  let response;
  const hook = load('src/lib/use-json-fetch.ts', {
    'react': { useCallback: fn => fn },
    'next-intl': { useTranslations: namespace => createTranslator({
      locale, namespace,
      messages: JSON.parse(fs.readFileSync(`messages/${locale}/common.json`, 'utf8')),
    }) },
  }, { fetch: async () => response });
  for (locale of ['bg', 'en']) {
    response = new Response('not JSON', { status: 502 });
    await assert.rejects(hook.useJsonFetch()('/test'), error => error.message.includes('502') && (locale === 'en' ? !/[\u0400-\u04ff]/u.test(error.message) : /Грешка/.test(error.message)));
  }
  response = Response.json({ error: 'Specific translated error' }, { status: 400 });
  await assert.rejects(hook.useJsonFetch()('/test'), /Specific translated error/);
  console.log('PASS: API templates and locale detection; BG/EN withdrawal mail, escaped customer input and failure paths; BG/EN HTTP fallbacks. No real email sent.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
