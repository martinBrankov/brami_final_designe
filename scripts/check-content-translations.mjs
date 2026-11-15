import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const directory = new URL('../content-i18n/', import.meta.url);
const errors = [];
const htmlTags = text => text.match(/<[^>]*>/g) ?? [];
const plainText = text => text.replace(/<[^>]*>/g, '');
let fields = 0;
let blocks = 0;
for (const file of ['products', 'blog', 'faq']) {
  const rows = JSON.parse(readFileSync(fileURLToPath(new URL(`${file}.json`, directory)), 'utf8'));
  const ids = new Set();
  const slugs = new Set();
  function check(bg, en, label) {
    if (typeof bg === 'string') {
      if (typeof en !== 'string' || (bg.trim() && !en.trim())) {
        errors.push(`${label}: missing English translation`);
        return;
      }
      fields++;
      if (/[\u0400-\u04ff]/u.test(plainText(en))) errors.push(`${label}: untranslated Cyrillic text`);
      if (JSON.stringify(htmlTags(bg)) !== JSON.stringify(htmlTags(en))) errors.push(`${label}: HTML tags or attributes changed`);
    } else if (Array.isArray(bg)) {
      if (!Array.isArray(en) || bg.length !== en.length) {
        errors.push(`${label}: array length differs`);
        return;
      }
      bg.forEach((value, index) => check(value, en[index], `${label}[${index}]`));
    } else if (bg && typeof bg === 'object') {
      if (!en || typeof en !== 'object') {
        errors.push(`${label}: missing English object`);
        return;
      }
      for (const [key, value] of Object.entries(bg)) {
        if (key === 'id') {
          blocks++;
          if (value !== en.id) errors.push(`${label}: block ID changed`);
        } else check(value, en[key], `${label}.${key}`);
      }
    }
  }
  for (const row of rows) {
    if (ids.has(row.id)) errors.push(`${file}: duplicate record ID ${row.id}`);
    ids.add(row.id);
    check(row.bg, row.en, `${file}:${row.id}`);
    if ('slug' in row.en) {
      const slug = row.en.slug;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) errors.push(`${file}:${row.id}: invalid English slug`);
      if (slugs.has(slug)) errors.push(`${file}:${row.id}: duplicate English slug`);
      slugs.add(slug);
    }
  }
  console.log(`${file}: ${rows.length} records checked`);
}
console.log(`${fields} text fields and ${blocks} block IDs checked.`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('PASS: complete English text, matching HTML/attributes and block IDs, valid unique slugs.');
