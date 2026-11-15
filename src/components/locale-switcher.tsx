"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";

type LocaleSwitcherProps = {
  className?: string;
  iconClassName?: string;
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

  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      href={{ pathname, params } as any}
      locale={targetLocale}
      hrefLang={targetLocale}
      aria-label={t("label", { language: t(`names.${targetLocale}`) })}
      onClick={onNavigate}
      className={className}
    >
      <span className={iconClassName}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">
          {targetLocale}
        </span>
      </span>
      <span className={labelClassName}>{t(`names.${targetLocale}`)}</span>
    </Link>
  );
}
