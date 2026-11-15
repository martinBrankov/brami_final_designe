"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

const COOKIE_CONSENT_KEY = "cookie-consent-accepted";

export function CookieConsentBanner() {
  const t = useTranslations("CookieBanner");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    setIsVisible(consent !== "true");
  }, []);

  function handleAccept() {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4 sm:bottom-6 sm:px-6 lg:px-14">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-[28px] border border-[#ddd3e4] bg-[rgba(253,253,253,0.96)] px-5 py-5 shadow-[0_20px_60px_rgba(67,40,85,0.18)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-[#432855]">
            {t("title")}
          </p>
          <p className="text-sm leading-6 text-[#6b587f]">
            {t("text")}
          </p>
          <p className="text-xs leading-5 text-[#8a739c]">
            {t("read")}{" "}
            <Link
              href="/privacy-policy"
              className="font-medium text-[#432855] underline decoration-[#cbb7d8] underline-offset-4"
            >
              {t("privacy")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              href="/terms"
              className="font-medium text-[#432855] underline decoration-[#cbb7d8] underline-offset-4"
            >
              {t("terms")}
            </Link>
            .
          </p>
        </div>

        <button
          type="button"
          onClick={handleAccept}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold uppercase tracking-[0.06em] text-white"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
