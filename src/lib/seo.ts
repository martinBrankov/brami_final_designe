import type { Metadata } from "next";

import { getPathname } from "@/i18n/navigation";
import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";
import defaultOgImage from "@/assets/images/brami-naturalna-kozmetika-s-shafran-og.jpg";

export type LocalizedHref = Parameters<typeof getPathname>[0]["href"];

export const OG_LOCALES: Record<AppLocale, string> = { bg: "bg_BG", en: "en_US" };

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

/**
 * Share image for pages without their own (products and articles have one).
 * A page's openGraph replaces the layout's, so each page has to list it.
 */
export const DEFAULT_OG_IMAGES = [
  {
    url: absoluteUrl(defaultOgImage.src),
    width: defaultOgImage.width,
    height: defaultOgImage.height,
    alt: "Brami – Saffron Adela Sunny",
  },
];

/** Public path of an internal route in `locale` (with the /en prefix where needed). */
export function localizedPath(locale: AppLocale, href: LocalizedHref): string {
  return getPathname({ locale, href });
}

export function localizedUrl(locale: AppLocale, href: LocalizedHref): string {
  return absoluteUrl(localizedPath(locale, href));
}

/**
 * canonical + hreflang for a page. Pass one href per locale when the URL has
 * a locale-specific slug (products, articles, FAQ).
 */
export function buildAlternates(
  locale: AppLocale,
  href: LocalizedHref | Record<AppLocale, LocalizedHref>,
  availableLocales: readonly AppLocale[] = locales,
): NonNullable<Metadata["alternates"]> {
  const isPerLocale = typeof href === "object" && href !== null && defaultLocale in href;
  const hrefFor = (l: AppLocale) =>
    isPerLocale ? (href as Record<AppLocale, LocalizedHref>)[l] : (href as LocalizedHref);

  const languages: Record<string, string> = Object.fromEntries(
    availableLocales.map((l) => [l, localizedUrl(l, hrefFor(l))]),
  );
  languages["x-default"] = languages[defaultLocale];

  return { canonical: languages[locale] ?? languages[defaultLocale], languages };
}

/** Shortens text to `maxLength` without cutting a word in half; adds "…" when shortened. */
export function truncateAtWord(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–—-]+$/, "")}…`;
}

export function jsonLdScript(data: unknown): { __html: string } {
  // "<" is escaped so user-provided text can never close the script tag.
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
