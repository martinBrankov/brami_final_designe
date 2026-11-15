import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@formatjs/icu-messageformat-parser';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (locale, file) => JSON.parse(readFileSync(resolve(root, 'messages', locale, file), 'utf8'));
function flatten(value, path = '', result = {}) {
  for (const [key, child] of Object.entries(value)) {
    const next = path ? `${path}.${key}` : key;
    if (child !== null && typeof child === 'object') flatten(child, next, result);
    else result[next] = child;
  }
  return result;
}
function signature(message) {
  const tokens = new Set();
  function visit(nodes) {
    for (const node of nodes) {
      if (node.type === 8) {
        tokens.add(`tag:${node.value}`);
        visit(node.children);
      } else if (node.type !== 0 && node.type !== 7) {
        tokens.add(`argument:${node.value}:${node.type}`);
        if (node.options) for (const option of Object.values(node.options)) visit(option.value);
      }
    }
  }
  visit(parse(message));
  return [...tokens].sort().join('|');
}
let checked = 0;
const errors = [];
for (const file of readdirSync(resolve(root, 'messages/bg')).filter(name => name.endsWith('.json'))) {
  const bg = flatten(read('bg', file));
  const en = flatten(read('en', file));
  for (const key of new Set([...Object.keys(bg), ...Object.keys(en)])) {
    const label = `${file}:${key}`;
    if (!(key in bg) || !(key in en)) {
      errors.push(`${label}: missing ${key in bg ? 'English' : 'Bulgarian'} key`);
      continue;
    }
    if (typeof bg[key] !== 'string' || typeof en[key] !== 'string' || !en[key].trim()) {
      errors.push(`${label}: expected non-empty message strings`);
      continue;
    }
    if (/[\u0400-\u04ff]/u.test(en[key]) && key !== 'LocaleSwitcher.names.bg') {
      errors.push(`${label}: Cyrillic text in English value`);
    }
    try {
      if (signature(bg[key]) !== signature(en[key])) errors.push(`${label}: ICU arguments or rich-text tags differ`);
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
    checked++;
  }
}
const apiErrors = read('en', 'api-errors.json');
for (const [key, value] of Object.entries(apiErrors)) {
  if (typeof value !== 'string' || !value.trim() || /[\u0400-\u04ff]/u.test(value)) {
    errors.push(`api-errors.json:${key}: missing English error message`);
  }
}
console.log(`Checked ${checked} BG/EN message pairs and ${Object.keys(apiErrors).length} API error translations.`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('PASS: matching keys, valid ICU syntax, matching arguments/tags and no untranslated Cyrillic values.');
