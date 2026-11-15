"use client";

import { useLocale, useTranslations } from "next-intl";

import { useMemo, useState } from "react";

type MarketingSubscriber = {
  id: string;
  email: string;
  source: string;
  userId: string | null;
  subscribedAt: string;
  unsubscribeUrl: string;
};

export function AdminMarketingSubscribersManager({
  subscribers,
}: {
  subscribers: MarketingSubscriber[];
}) {
  const t = useTranslations("AdminMarketing");
  const dateLocale = useLocale() === "en" ? "en-GB" : "bg-BG";
  const [copied, setCopied] = useState<string | null>(null);
  const emailList = useMemo(
    () => subscribers.map((subscriber) => subscriber.email).join(", "),
    [subscribers],
  );

  async function copyValue(value: string, label: string) {
    if (!navigator.clipboard) {
      setCopied(t("kopiranetoNeENalichno"));
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-[180px_1fr] md:items-start">
        <div className="rounded-[18px] border border-[#e7dfd1] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f45]">
            {t("aktivniImeyli")}
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[#1d2733]">
            {subscribers.length}
          </p>
        </div>

        <div className="rounded-[18px] border border-[#e7dfd1] bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1d2733]">{t("spisakZaKampaniya")}</p>
              <p className="mt-1 text-xs text-[#6a7480]">
                {t("kopirayToziSpisakV")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyValue(emailList, t("spisakatSImeyliE"))}
              disabled={!emailList}
              className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#1d2733] px-4 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#2b3847] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("kopiray")}
            </button>
          </div>

          <textarea
            readOnly
            value={emailList}
            className="h-28 w-full resize-none rounded-[14px] border border-[#d9d4ca] bg-[#fbf8f1] p-3 text-sm text-[#25313d] outline-none"
          />
          {copied ? <p className="mt-2 text-xs font-medium text-emerald-700">{copied}</p> : null}
        </div>
      </section>

      <section>
        <div className="hidden grid-cols-[minmax(220px,1fr)_150px_170px_minmax(260px,1.2fr)] gap-3 border-b border-[#e7dfd1] pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61] lg:grid">
          <span>{t("imeyl")}</span>
          <span>{t("iztochnik")}</span>
          <span>{t("aboniran")}</span>
          <span>{t("linkZaOtpisvane")}</span>
        </div>

        {subscribers.length ? (
          <div className="divide-y divide-[#e7dfd1]">
            {subscribers.map((subscriber) => (
              <article
                key={subscriber.id}
                className="grid gap-3 py-4 lg:grid-cols-[minmax(220px,1fr)_150px_170px_minmax(260px,1.2fr)] lg:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1d2733]">
                    {subscriber.email}
                  </p>
                  {subscriber.userId ? (
                    <p className="mt-0.5 text-xs text-[#6a7480]">
                      {t("potrebitel", { userId: subscriber.userId })}
                    </p>
                  ) : null}
                </div>

                <span className="w-fit rounded-full border border-[#d2c8b8] bg-[#f8f4ec] px-2.5 py-0.5 text-xs font-semibold text-[#5f6b76]">
                  {subscriber.source}
                </span>

                <p className="text-sm text-[#4f5b66]">
                  {new Date(subscriber.subscribedAt).toLocaleString(dateLocale)}
                </p>

                <div className="flex min-w-0 items-center gap-2">
                  <input
                    readOnly
                    value={subscriber.unsubscribeUrl}
                    className="h-9 min-w-0 flex-1 rounded-[10px] border border-[#d9d4ca] bg-white px-3 text-xs text-[#4f5b66]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void copyValue(subscriber.unsubscribeUrl, t("linkatZaOtpisvaneE"))
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[#d2c8b8] text-[#1d2733] transition hover:bg-[#f8f4ec]"
                    title={t("kopirayLinkZaOtpisvane")}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-[#5f6b76]">
            {t("vseOshteNyamaAktivni")}
          </p>
        )}
      </section>
    </div>
  );
}
