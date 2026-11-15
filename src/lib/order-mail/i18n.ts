import "server-only";

import { createTranslator } from "next-intl";

import { loadMessages } from "@/i18n/request";
import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";

export type EmailTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Translator for the "Email" namespace in messages/<locale>/email.json. */
export async function getEmailTranslator(locale: AppLocale): Promise<EmailTranslator> {
  const messages = await loadMessages(locale);
  const t = createTranslator({ locale, messages, namespace: "Email" });
  return (key, values) => (t as unknown as EmailTranslator)(key, values);
}

/** Language of an order: stored with the cart payload (raw_payload.locale). */
export function getOrderLocale(rawPayload: unknown): AppLocale {
  const locale = (rawPayload as { locale?: unknown } | null)?.locale;
  return isAppLocale(locale) ? locale : defaultLocale;
}
