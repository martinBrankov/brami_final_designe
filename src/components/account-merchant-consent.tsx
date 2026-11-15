"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";

export type BankDetailsInput = {
  bankAccountHolder: string;
  bankIban: string;
  bankBic: string;
};

async function postConsent(
  fallbackError: string,
  accepted: boolean,
  bank?: BankDetailsInput,
): Promise<string | null> {
  const response = await fetch("/api/account/merchant/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accepted, ...(bank ?? {}) }),
  });
  const result = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;
  if (!response.ok || !result?.ok) {
    return result?.error || fallbackError;
  }
  return null;
}

const inputClass =
  "mt-1 h-11 w-full rounded-[14px] border border-[#d9cfe2] bg-[#fcfbfd] px-4 text-sm text-[#432855]";
const labelClass =
  "block text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]";

function BankFields({
  value,
  onChange,
}: {
  value: BankDetailsInput;
  onChange: (next: BankDetailsInput) => void;
}) {
  const t = useTranslations("MerchantConsent");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className={labelClass}>{t("accountHolder")}</span>
        <input
          value={value.bankAccountHolder}
          onChange={(e) =>
            onChange({ ...value, bankAccountHolder: e.target.value })
          }
          placeholder={t("accountHolderPlaceholder")}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>IBAN</span>
        <input
          value={value.bankIban}
          onChange={(e) =>
            onChange({ ...value, bankIban: e.target.value.toUpperCase() })
          }
          placeholder="BG00XXXX00000000000000"
          className={`${inputClass} font-mono tracking-[0.06em]`}
        />
      </label>
      <label className="block">
        <span className={labelClass}>BIC / SWIFT</span>
        <input
          value={value.bankBic}
          onChange={(e) =>
            onChange({ ...value, bankBic: e.target.value.toUpperCase() })
          }
          placeholder="XXXXBGSF"
          className={`${inputClass} font-mono tracking-[0.06em]`}
        />
      </label>
    </div>
  );
}

/** Shown to a merchant who has not yet accepted the terms — blocks the dashboard. */
export function MerchantConsentGate({
  initialBank,
}: {
  initialBank: BankDetailsInput;
}) {
  const t = useTranslations("MerchantConsent");
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [bank, setBank] = useState<BankDetailsInput>(initialBank);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  const bankFilled =
    bank.bankAccountHolder.trim() !== "" &&
    bank.bankIban.trim() !== "" &&
    bank.bankBic.trim() !== "";

  async function accept() {
    setSubmitting(true);
    setError(null);
    const err = await postConsent(t("saveError"), true, bank);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function confirmDecline() {
    setDeclining(true);
    setError(null);
    const err = await postConsent(t("saveError"), false);
    setDeclining(false);
    if (err) {
      setError(err);
      return;
    }
    setDeclineOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-2xl rounded-[18px] border border-[#e6dcef] bg-white p-6 sm:p-8">
      <h2 className="font-serif text-2xl text-[#432855]">
        {t("gateTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#6b587f]">
        {t("gateText")}
      </p>

      <Link
        href="/merchant-terms"
        target="_blank"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7a4f95] underline-offset-2 hover:underline"
      >
        {t("readTerms")}
      </Link>

      <div className="mt-6 rounded-[16px] border border-[#e6dcef] bg-[#faf7fc] p-5">
        <h3 className="text-sm font-semibold text-[#432855]">
          {t("bankTitle")}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#6b587f]">
          {t("bankText")}
        </p>
        <div className="mt-4">
          <BankFields value={bank} onChange={setBank} />
        </div>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm text-[#432855]">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#bca5cc] accent-[#432855]"
        />
        <span>
          {t("agreePrefix")}{" "}
          <Link
            href="/merchant-terms"
            target="_blank"
            className="font-semibold text-[#7a4f95] underline-offset-2 hover:underline"
          >
            {t("agreeLink")}
          </Link>{" "}
          {t("agreeSuffix")}
        </span>
      </label>

      {error ? (
        <p className="mt-4 text-sm font-medium text-[#9a3f3f]">{error}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={accept}
          disabled={!agreed || !bankFilled || submitting || isPending || declining}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t("activating") : t("activate")}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDeclineOpen(true);
          }}
          disabled={submitting || declining || isPending}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#e8c7c7] px-6 text-sm font-semibold text-[#9a3f3f] transition hover:bg-[#fff6f6] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("decline")}
        </button>
      </div>

      {declineOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl">
            <h4 className="font-serif text-xl text-[#432855]">{t("declineTitle")}</h4>
            <p className="mt-2 text-sm text-[#6b587f]">{t("declineIntro")}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[#5b4a6b]">
              <li>{t("effects.regularUser")}</li>
              <li>{t.rich("effects.dataKeptShort", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t("effects.reactivate")}</li>
            </ul>

            {error ? (
              <p className="mt-4 text-sm font-medium text-[#9a3f3f]">{error}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeclineOpen(false)}
                disabled={declining}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#d9cfe2] px-4 text-sm font-semibold text-[#6b587f] transition hover:bg-[#f8f4fc] disabled:opacity-60"
              >
                {t("back")}
              </button>
              <button
                type="button"
                onClick={confirmDecline}
                disabled={declining || isPending}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#9a3f3f] px-4 text-sm font-semibold text-white transition hover:bg-[#82302f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {declining ? t("declining") : t("confirmDecline")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Shown inside the dashboard for a consented merchant — bank details, terms, withdraw. */
export function MerchantConsentManager({
  acceptedAt,
  initialBank,
}: {
  acceptedAt: string | null;
  initialBank: BankDetailsInput;
}) {
  const t = useTranslations("MerchantConsent");
  const locale = useLocale();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [bank, setBank] = useState<BankDetailsInput>(initialBank);
  const [bankFeedback, setBankFeedback] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);
  const [savingBank, setSavingBank] = useState(false);

  const acceptedLabel = acceptedAt
    ? new Date(acceptedAt).toLocaleDateString(locale === "en" ? "en-GB" : "bg-BG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  async function saveBank() {
    setSavingBank(true);
    setBankFeedback(null);
    const response = await fetch("/api/account/merchant/bank", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bank),
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    setSavingBank(false);
    if (!response.ok || !result?.ok) {
      setBankFeedback({ kind: "error", message: result?.error || t("saveError") });
      return;
    }
    setBankFeedback({ kind: "success", message: t("bankSaved") });
    startTransition(() => router.refresh());
  }

  async function withdraw() {
    setSubmitting(true);
    setError(null);
    const err = await postConsent(t("saveError"), false);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setConfirmOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-[18px] border border-[#e6dcef] bg-white p-5 sm:p-6">
      <h3 className="font-serif text-xl text-[#432855]">{t("managerTitle")}</h3>
      <p className="mt-1 text-sm text-[#6b587f]">
        {acceptedLabel
          ? t("acceptedOn", { date: acceptedLabel })
          : t("accepted")}
      </p>

      <div className="mt-5 rounded-[16px] border border-[#e6dcef] bg-[#faf7fc] p-5">
        <h4 className="text-sm font-semibold text-[#432855]">
          {t("bankManagerTitle")}
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-[#6b587f]">
          {t("bankManagerText")}
        </p>
        <div className="mt-4">
          <BankFields value={bank} onChange={setBank} />
        </div>
        {bankFeedback ? (
          <p
            className={`mt-3 text-sm font-medium ${
              bankFeedback.kind === "success" ? "text-[#2e6b3a]" : "text-[#9a3f3f]"
            }`}
          >
            {bankFeedback.message}
          </p>
        ) : null}
        <div className="mt-4">
          <button
            type="button"
            onClick={saveBank}
            disabled={savingBank}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingBank ? t("saving") : t("saveBank")}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/merchant-terms"
          target="_blank"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#d9cfe2] px-4 text-sm font-semibold text-[#432855] transition hover:bg-[#f8f4fc]"
        >
          {t("viewTerms")}
        </Link>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#e8c7c7] px-4 text-sm font-semibold text-[#9a3f3f] transition hover:bg-[#fff6f6]"
        >
          {t("withdraw")}
        </button>
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-xl">
            <h4 className="font-serif text-xl text-[#432855]">
              {t("withdrawTitle")}
            </h4>
            <p className="mt-2 text-sm text-[#6b587f]">
              {t("withdrawIntro")}
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[#5b4a6b]">
              <li>{t("effects.regularUser")}</li>
              <li>{t("effects.noAccess")}</li>
              <li>{t("effects.codesInactive")}</li>
              <li>{t.rich("effects.dataKept", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t("effects.duePaid")}</li>
              <li>{t("effects.reactivate")}</li>
            </ul>

            {error ? (
              <p className="mt-4 text-sm font-medium text-[#9a3f3f]">{error}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#d9cfe2] px-4 text-sm font-semibold text-[#6b587f] transition hover:bg-[#f8f4fc] disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={withdraw}
                disabled={submitting || isPending}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#9a3f3f] px-4 text-sm font-semibold text-white transition hover:bg-[#82302f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t("withdrawing") : t("confirmWithdraw")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
