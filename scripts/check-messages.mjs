/**
 * Lists message keys that exist in messages/bg but not in another locale
 * (and keys that only exist in the other locale). Missing keys fall back to
 * Bulgarian on the site, so this is the translation to-do list.
 *
 * Usage: node scripts/check-messages.mjs [en]
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../messages");
const locale = process.argv[2] || "en";

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

let problems = 0;
for (const file of readdirSync(resolve(root, "bg")).filter((f) => f.endsWith(".json"))) {
  const bg = new Set(flatten(JSON.parse(readFileSync(resolve(root, "bg", file), "utf8"))));
  let other = new Set();
  try {
    other = new Set(flatten(JSON.parse(readFileSync(resolve(root, locale, file), "utf8"))));
  } catch {
    // file not created yet
  }
  for (const key of bg) if (!other.has(key)) { console.log(`missing in ${locale}/${file}: ${key}`); problems++; }
  for (const key of other) if (!bg.has(key)) { console.log(`only in ${locale}/${file}: ${key}`); problems++; }
}
console.log(problems ? `\n${problems} differences` : "All keys match.");
process.exit(problems ? 1 : 0);
