import { getRequestConfig } from "next-intl/server";

import { isAppLocale, routing } from "./routing";

// One JSON file per area in messages/<locale>/. Each file holds one or more
// top-level namespaces; they are merged into a single messages object.
export const MESSAGE_FILES = [
  "common",
  "home",
  "products",
  "cart",
  "account",
  "content",
  "legal",
  "admin",
  "email",
] as const;

type Messages = Record<string, unknown>;

async function loadLocaleFiles(locale: string): Promise<Messages> {
  const parts = await Promise.all(
    MESSAGE_FILES.map(
      (file) => import(`../../messages/${locale}/${file}.json`).then((m) => m.default),
    ),
  );
  return Object.assign({}, ...parts) as Messages;
}

function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] =
      value && typeof value === "object" && !Array.isArray(value) &&
      current && typeof current === "object" && !Array.isArray(current)
        ? deepMerge(current as Messages, value as Messages)
        : value;
  }
  return result;
}

/**
 * Messages of `locale` on top of the Bulgarian ones, so a key that is not yet
 * translated shows the Bulgarian text instead of breaking the page. New keys
 * are therefore added to messages/bg first; `node scripts/check-messages.mjs`
 * lists what is still missing in other languages.
 */
export async function loadMessages(locale: string) {
  const base = await loadLocaleFiles(routing.defaultLocale);
  return locale === routing.defaultLocale ? base : deepMerge(base, await loadLocaleFiles(locale));
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isAppLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    timeZone: "Europe/Sofia",
    messages: await loadMessages(locale),
  };
});
