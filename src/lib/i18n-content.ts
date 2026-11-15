// Helpers for database content translated through a `translations` JSONB
// column ({ "en": { ...fields } }). Bulgarian lives in the regular columns.
// Shared by server and client code — keep free of `server-only`.

import { defaultLocale, type AppLocale } from "@/i18n/routing";

/** Returns the translated fields for `locale`, or `{}` (→ fall back to Bulgarian). */
export function pickTranslation<T extends object>(translations: unknown, locale: AppLocale): Partial<T> {
  if (locale === defaultLocale || !translations || typeof translations !== "object") {
    return {};
  }
  const value = (translations as Record<string, unknown>)[locale];
  return value && typeof value === "object" ? (value as Partial<T>) : {};
}
