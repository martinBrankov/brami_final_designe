"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/** JSON requests with a translated fallback when the API returns no message. */
export function useJsonFetch() {
  const t = useTranslations("RequestErrors");
  return useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    const data = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || t("requestFailed", { status: response.status }));
    return data;
  }, [t]);
}
