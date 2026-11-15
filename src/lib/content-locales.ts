import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";
import { pickTranslation } from "@/lib/i18n-content";

/** Only complete translations may be advertised as indexable language variants. */
export function translatedLocales(translations: unknown, fields: string[]): AppLocale[] {
  return locales.filter((locale) => {
    if (locale === defaultLocale) return true;
    const translation = pickTranslation<Record<string, unknown>>(translations, locale);
    return fields.every((field) => typeof translation[field] === "string" && translation[field].trim());
  });
}

export function hasTranslatedBlock(block: { type: string; content: unknown; translations?: unknown }, locale: AppLocale): boolean {
  if (locale === defaultLocale || !block.content) return true;
  // An image with no caption/alt has no language-specific text to translate.
  if (block.type === "image") {
    try {
      const image = typeof block.content === "string" ? JSON.parse(block.content) : block.content;
      if (!image?.alt && !image?.caption) return true;
    } catch { return true; }
  }
  const translation = pickTranslation<{ content: unknown }>(block.translations, locale).content;
  return typeof translation === "string" ? Boolean(translation.trim()) :
    Boolean(translation && typeof translation === "object" && Object.keys(translation).length);
}
