"use client";

import { useParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";

type LocaleSwitcherProps = {
  className?: string;
  iconClassName?: string;
  /** Classes of the "bg"/"en" code text. */
  codeClassName?: string;
  labelClassName?: string;
  onNavigate?: () => void;
};

/**
 * Links to the current page in the other language. Slug pages (products,
 * articles, FAQ) receive the slug of the current language and redirect to
 * their own slug, so the same params can be reused here.
 */
export function LocaleSwitcher({
  className,
  iconClassName,
  codeClassName = "text-[11px] font-semibold uppercase tracking-[0.06em]",
  labelClassName,
  onNavigate,
}: LocaleSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  // Route params minus the locale segment (e.g. { slug }).
  const params = Object.fromEntries(
    Object.entries(useParams<Record<string, string>>()).filter(([key]) => key !== "locale"),
  );
  const t = useTranslations("LocaleSwitcher");
  const targetLocale = locales.find((l) => l !== locale) ?? locale;

  // The href reuses the current slug and lands via a redirect. Products,
  // articles and FAQ list their translated URL as an hreflang alternate, so
  // on click go there directly.
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const canonical = document.querySelector<HTMLLinkElement>("link[rel=\"canonical\"]");
    const alternate = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${targetLocale}"]`);
    // Skip when the head still belongs to the previous page.
    if (!canonical || !alternate || new URL(canonical.href).pathname !== window.location.pathname) return;
    const target = new URL(alternate.href);
    event.preventDefault();
    window.location.assign(target.pathname + target.search);
  }

  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      href={{ pathname, params } as any}
      locale={targetLocale}
      hrefLang={targetLocale}
      aria-label={t("label", { language: t(`names.${targetLocale}`) })}
      onClick={handleClick}
      className={className}
    >
      <span className={iconClassName}>
        <span className={codeClassName}>{targetLocale}</span>
      </span>
      <span className={labelClassName}>{t(`names.${targetLocale}`)}</span>
    </Link>
  );
}
