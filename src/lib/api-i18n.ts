import "server-only";

import { cookies, headers } from "next/headers";

import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import enApiErrors from "../../messages/en/api-errors.json";

// API routes and the libraries behind them produce Bulgarian messages. They
// are translated on the way out using messages/<locale>/api-errors.json,
// which maps the Bulgarian text to the translation.
const API_ERRORS: Partial<Record<AppLocale, Record<string, string>>> = {
  en: enApiErrors,
};

/** Language of the visitor that made the API request (cookie, then Referer). */
export async function getRequestLocale(): Promise<AppLocale> {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const referer = (await headers()).get("referer");
  if (referer) {
    try {
      const firstSegment = new URL(referer).pathname.split("/")[1];
      if (isAppLocale(firstSegment)) return firstSegment;
    } catch {
      // ignore malformed referers
    }
  }
  return defaultLocale;
}

export function translateApiMessage(message: string, locale: AppLocale): string {
  if (locale === defaultLocale) return message;
  const translations = API_ERRORS[locale];
  if (!translations) return message;
  if (translations[message]) return translations[message];

  // Some errors include a provider, amount or diagnostic detail. Match the
  // fixed Bulgarian text and retain those values in the English translation.
  for (const [template, translation] of Object.entries(translations)) {
    const names: string[] = [];
    let cursor = 0;
    let pattern = "^";
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const match of template.matchAll(/\{([\w.]+)\}/g)) {
      pattern += escape(template.slice(cursor, match.index)) + "([\\s\\S]+?)";
      names.push(match[1]);
      cursor = match.index! + match[0].length;
    }
    if (!names.length) continue;
    pattern += escape(template.slice(cursor)) + "$";
    const match = new RegExp(pattern).exec(message);
    if (!match) continue;
    const values = Object.fromEntries(names.map((name, index) => [name, match[index + 1]]));
    return translation.replace(/\{([\w.]+)\}/g, (token, name: string) => values[name] ?? token);
  }
  return message;
}

/** Translates a Bulgarian API message into the requester's language. */
export async function localizeApiError(message: string): Promise<string> {
  return translateApiMessage(message, await getRequestLocale());
}
