"use client";

import { useLocale, useTranslations } from "next-intl";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { slugifyQuestion } from "@/lib/faq-slug";

export type AdminFaqEntry = {
  id: string;
  question: string;
  answer: string | null;
  slug: string | null;
  category: string | null;
  status: "pending" | "draft" | "published";
  source: "admin" | "user";
  askerName: string | null;
  askerEmail: string | null;
  position: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  english: { question: string; answer: string; category: string; slug: string };
};

type StatusFilter = "all" | AdminFaqEntry["status"];

type Draft = {
  id: string | null;
  question: string;
  answer: string;
  slug: string;
  category: string;
  status: AdminFaqEntry["status"];
  position: number;
  en: AdminFaqEntry["english"];
};


const STATUS_BADGE: Record<AdminFaqEntry["status"], string> = {
  pending: "bg-[#d8b36b]/20 text-[#8a6f45]",
  draft: "bg-gray-100 text-gray-500",
  published: "bg-emerald-100 text-emerald-700",
};

// Label: AdminFaq.filters.<key>
const FILTERS: StatusFilter[] = ["pending", "draft", "published", "all"];

const inputClassName =
  "w-full rounded-[8px] border border-[#e0dbd2] px-3 py-2 text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40";

function emptyDraft(): Draft {
  return {
    id: null,
    question: "",
    answer: "",
    slug: "",
    category: "",
    status: "draft",
    position: 0,
    en: { question: "", answer: "", category: "", slug: "" },
  };
}

function toDraft(entry: AdminFaqEntry): Draft {
  return {
    id: entry.id,
    question: entry.question,
    answer: entry.answer ?? "",
    slug: entry.slug ?? "",
    category: entry.category ?? "",
    status: entry.status,
    position: entry.position,
    en: { ...entry.english },
  };
}

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminFaqManager({ entries: initialEntries }: { entries: AdminFaqEntry[] }) {
  const t = useTranslations("AdminFaq");
  const dateLocale = useLocale() === "en" ? "en-GB" : "bg-BG";
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const counts: Record<StatusFilter, number> = useMemo(
    () => ({
      all: entries.length,
      pending: entries.filter((entry) => entry.status === "pending").length,
      draft: entries.filter((entry) => entry.status === "draft").length,
      published: entries.filter((entry) => entry.status === "published").length,
    }),
    [entries],
  );

  const visible = useMemo(
    () => (filter === "all" ? entries : entries.filter((entry) => entry.status === filter)),
    [entries, filter],
  );

  async function refresh() {
    const res = await fetch("/api/admin/faq");
    const body = (await res.json().catch(() => ({}))) as { entries?: AdminFaqEntry[] };
    if (body.entries) setEntries(body.entries);
    router.refresh();
  }

  async function handleSave() {
    if (!draft) return;

    if (!draft.question.trim()) {
      setSaveError(t("vaprosatEZadalzhitelen"));
      return;
    }
    if (draft.status === "published" && !draft.answer.trim()) {
      setSaveError(t("neMozheshDaPublikuvash"));
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        question: draft.question.trim(),
        answer: draft.answer,
        slug: draft.slug.trim() || slugifyQuestion(draft.question),
        category: draft.category,
        status: draft.status,
        position: draft.position,
        // English is saved for existing entries (it needs the entry id).
        ...(draft.id ? { english: draft.en } : {}),
      };

      const res = await fetch(draft.id ? `/api/admin/faq/${draft.id}` : "/api/admin/faq", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSaveError(body.error ?? t("greshkaPriZapis"));
        return;
      }

      setDraft(null);
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("greshkaPriZapis"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublished(entry: AdminFaqEntry) {
    const nextStatus = entry.status === "published" ? "draft" : "published";

    // Publishing needs an answer — open the editor instead of failing silently.
    if (nextStatus === "published" && !entry.answer?.trim()) {
      setSaveError(t("dobaviOtgovorPrediDa"));
      setDraft({ ...toDraft(entry), status: "published" });
      return;
    }

    setPublishing(entry.id);
    try {
      const res = await fetch(`/api/admin/faq/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error ?? t("greshka"));
        return;
      }
      await refresh();
    } finally {
      setPublishing(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        alert(body.error ?? t("greshkaPriIztrivane"));
        return;
      }
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      router.refresh();
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  }

  return (
    <>
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`inline-flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-medium transition ${
                  filter === key
                    ? "border-[#1d2733] bg-[#1d2733] text-white"
                    : "border-[#d2c8b8] bg-white text-[#5f6b76] hover:bg-[#f8f4ec]"
                }`}
              >
                {t(`filters.${key}`)}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    filter === key ? "bg-white/15 text-white" : "bg-[#f0ebe3] text-[#8a6f45]"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft());
              setSaveError(null);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1d2733] px-5 text-sm font-semibold text-white transition hover:bg-[#2d3a47]"
          >
            {t("novVapros")}
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#5f6b76]">
            {t("nyamaVaprosiVTazi")}
          </p>
        ) : (
          <div className="divide-y divide-[#e7dfd1]">
            {visible.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col-reverse gap-3 py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#1d2733]">{entry.question}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[entry.status]}`}
                    >
                      {t(`statusLabels.${entry.status}`)}
                    </span>
                    {entry.source === "user" && (
                      <span className="rounded-full bg-[#e8eef5] px-2 py-0.5 text-xs font-semibold text-[#41648a]">
                        {t("otKlient")}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#8a9099]">
                    {entry.slug && <span className="font-mono">{entry.slug}</span>}
                    {entry.category && <span>{entry.category}</span>}
                    {entry.askerName && <span>{entry.askerName}</span>}
                    {entry.askerEmail && <span>{entry.askerEmail}</span>}
                    <span>{formatDate(entry.publishedAt ?? entry.createdAt, dateLocale)}</span>
                  </div>

                  {entry.answer ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f6b76]">
                      {entry.answer.replace(/<[^>]*>/g, " ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-[#a8792f]">{t("nyamaOtgovor")}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => handleTogglePublished(entry)}
                    disabled={publishing === entry.id}
                    title={entry.status === "published" ? t("skriyOtSayta") : t("publikuvay")}
                    className={`flex h-8 w-8 items-center justify-center rounded-[8px] border transition disabled:opacity-50 ${
                      entry.status === "published"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        : "border-[#d2c8b8] bg-white text-[#8a9099] hover:bg-[#f8f4ec] hover:text-emerald-600"
                    }`}
                  >
                    {publishing === entry.id ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : entry.status === "published" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setDraft(toDraft(entry));
                      setSaveError(null);
                    }}
                    title={t("redaktiray")}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#d2c8b8] text-[#1d2733] transition hover:bg-[#f8f4ec]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>

                  {confirmId === entry.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleting === entry.id}
                        className="inline-flex h-8 items-center rounded-[8px] bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {deleting === entry.id ? "…" : t("potvardi")}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#d2c8b8] text-[#5f6b76] hover:bg-[#f8f4ec]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(entry.id)}
                      title={t("iztriy")}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-red-200 text-red-500 transition hover:bg-red-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
          onClick={() => {
            if (!saving) setDraft(null);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-[14px] bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#1d2733]">
                  {draft.id ? t("redaktsiyaNaVapros") : t("novVapros2")}
                </h2>
                <p className="mt-1 text-xs text-[#7c8a96]">
                  {t.rich("visibleOnlyPublished", { strong: (chunks) => <strong>{chunks}</strong> })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d2c8b8] bg-white text-[#5f6b76] transition hover:bg-[#f8f4ec] disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">{t("vapros")}</label>
                <textarea
                  value={draft.question}
                  rows={2}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, question: event.target.value } : current,
                    )
                  }
                  className={`resize-none ${inputClassName}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">{t("otgovor")}</label>
                <textarea
                  value={draft.answer}
                  rows={9}
                  placeholder={t("razdeliAbzatsiteSPrazen")}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, answer: event.target.value } : current,
                    )
                  }
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">
                  {t("kategoriyaPoZhelanie")}
                </label>
                <input
                  type="text"
                  value={draft.category}
                  placeholder={t("dostavkaPorachkiProdukti")}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, category: event.target.value } : current,
                    )
                  }
                  className={inputClassName}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">Slug (URL)</label>
                <input
                  type="text"
                  value={draft.slug}
                  placeholder={slugifyQuestion(draft.question) || "avtomatichno"}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, slug: event.target.value } : current,
                    )
                  }
                  className={`font-mono ${inputClassName}`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">{t("status")}</label>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, status: event.target.value as AdminFaqEntry["status"] }
                        : current,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="pending">{t("novVaprosBezOtgovor")}</option>
                  <option value="draft">{t("chernova")}</option>
                  <option value="published">{t("publikuvan")}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">
                  {t("orderHint")}
                </label>
                <input
                  type="number"
                  value={draft.position}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, position: Number(event.target.value) || 0 } : current,
                    )
                  }
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="mt-6 border-t border-[#efe9df] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">{t("english.title")}</p>
              {draft.id ? (
                <div className="mt-3 grid gap-3">
                  <p className="text-xs text-[#8a9099]">{t("english.intro")}</p>
                  {(["question", "category", "slug"] as const).map((field) => (
                    <div key={field}>
                      <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">{t(`english.${field}`)}</label>
                      <input
                        value={draft.en[field]}
                        onChange={(event) =>
                          setDraft((current) =>
                            current ? { ...current, en: { ...current.en, [field]: event.target.value } } : current,
                          )
                        }
                        className={inputClassName}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">{t("english.answer")}</label>
                    <textarea
                      value={draft.en.answer}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, en: { ...current.en, answer: event.target.value } } : current,
                        )
                      }
                      rows={6}
                      className={inputClassName}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#8a9099]">{t("english.afterSave")}</p>
              )}
            </div>

            {saveError && <p className="mt-4 text-xs font-medium text-red-600">{saveError}</p>}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-[8px] border border-[#d2c8b8] bg-white px-4 text-sm font-medium text-[#5f6b76] transition hover:bg-[#f8f4ec] disabled:opacity-60"
              >
                {t("otkaz")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-[8px] bg-[#1d2733] px-5 text-sm font-semibold text-white transition hover:bg-[#2d3a47] disabled:opacity-60"
              >
                {saving ? t("zapis") : t("zapazi")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
