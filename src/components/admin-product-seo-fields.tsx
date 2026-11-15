"use client";

import { useTranslations } from "next-intl";

import type { AdminFaqItem } from "@/lib/admin-data";

// SEO / AI-search fields and the English version of a product, edited inside
// the product modal of the admin panel.

export type SeoDraft = {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  summary: string;
  faq: string;
  gtin: string;
  imageAlts: string;
};

export type EnglishDraft = {
  name: string;
  slug: string;
  packaging: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  summary: string;
  faq: string;
  highlights: string;
  imageAlts: string;
};

export const emptySeoDraft: SeoDraft = {
  slug: "",
  seoTitle: "",
  metaDescription: "",
  focusKeyword: "",
  summary: "",
  faq: "",
  gtin: "",
  imageAlts: "",
};

export const emptyEnglishDraft: EnglishDraft = {
  name: "",
  slug: "",
  packaging: "",
  description: "",
  seoTitle: "",
  metaDescription: "",
  focusKeyword: "",
  summary: "",
  faq: "",
  highlights: "",
  imageAlts: "",
};

/** FAQ in a textarea: question on the first line, answer below, blank line between items. */
export function faqToText(faq: AdminFaqItem[]): string {
  return faq.map((item) => `${item.question}\n${item.answer}`).join("\n\n");
}

export function textToFaq(text: string): AdminFaqItem[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const [question = "", ...answer] = block.trim().split(/\r?\n/);
      return { question: question.trim(), answer: answer.join(" ").trim() };
    })
    .filter((item) => item.question && item.answer);
}

export function linesToList(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim());
}

const SEO_TITLE_LIMIT = 60;
const META_DESCRIPTION_LIMIT = 155;

const inputClass = "h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4";
const textareaClass = "w-full rounded-[18px] border border-[#d9d4ca] bg-white px-4 py-3";

function Counter({ value, limit }: { value: string; limit: number }) {
  return (
    <span className={`text-xs ${value.length > limit ? "text-[#b04f4f]" : "text-[#8a9099]"}`}>
      {value.length}/{limit}
    </span>
  );
}

function Field({
  label,
  hint,
  counter,
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  counter?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block${wide ? " md:col-span-2" : ""}`}>
      <span className="mb-2 flex items-center justify-between gap-3 text-sm font-medium text-[#25313d]">
        <span>{label}</span>
        {counter}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#8a9099]">{hint}</span> : null}
    </label>
  );
}

export function AdminProductSeoFields({
  seo,
  en,
  onSeoChange,
  onEnglishChange,
}: {
  seo: SeoDraft;
  en: EnglishDraft;
  onSeoChange: (next: SeoDraft) => void;
  onEnglishChange: (next: EnglishDraft) => void;
}) {
  const t = useTranslations("AdminProductSeo");
  const setSeo = (key: keyof SeoDraft, value: string) => onSeoChange({ ...seo, [key]: value });
  const setEn = (key: keyof EnglishDraft, value: string) => onEnglishChange({ ...en, [key]: value });

  return (
    <>
      <section className="mt-6 border-t border-[#e7dfd1] pt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">{t("seoTitle")}</h3>
        <p className="mt-1 text-xs text-[#8a9099]">{t("seoIntro")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label={t("slug")} hint={t("slugHint")}>
            <input value={seo.slug} onChange={(e) => setSeo("slug", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("focusKeyword")}>
            <input value={seo.focusKeyword} onChange={(e) => setSeo("focusKeyword", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("pageTitle")} counter={<Counter value={seo.seoTitle} limit={SEO_TITLE_LIMIT} />} wide>
            <input value={seo.seoTitle} onChange={(e) => setSeo("seoTitle", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("metaDescription")} counter={<Counter value={seo.metaDescription} limit={META_DESCRIPTION_LIMIT} />} wide>
            <textarea value={seo.metaDescription} onChange={(e) => setSeo("metaDescription", e.target.value)} rows={2} className={textareaClass} />
          </Field>
          <Field label={t("summary")} hint={t("summaryHint")} wide>
            <textarea value={seo.summary} onChange={(e) => setSeo("summary", e.target.value)} rows={3} className={textareaClass} />
          </Field>
          <Field label={t("faq")} hint={t("faqHint")} wide>
            <textarea value={seo.faq} onChange={(e) => setSeo("faq", e.target.value)} rows={6} className={textareaClass} />
          </Field>
          <Field label={t("imageAlts")} hint={t("imageAltsHint")}>
            <textarea value={seo.imageAlts} onChange={(e) => setSeo("imageAlts", e.target.value)} rows={2} className={textareaClass} />
          </Field>
          <Field label={t("gtin")} hint={t("gtinHint")}>
            <input value={seo.gtin} onChange={(e) => setSeo("gtin", e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="mt-6 border-t border-[#e7dfd1] pt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">{t("englishTitle")}</h3>
        <p className="mt-1 text-xs text-[#8a9099]">{t("englishIntro")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label={t("name")}>
            <input value={en.name} onChange={(e) => setEn("name", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("slug")} hint={t("slugHint")}>
            <input value={en.slug} onChange={(e) => setEn("slug", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("packaging")}>
            <input value={en.packaging} onChange={(e) => setEn("packaging", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("focusKeyword")}>
            <input value={en.focusKeyword} onChange={(e) => setEn("focusKeyword", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("pageTitle")} counter={<Counter value={en.seoTitle} limit={SEO_TITLE_LIMIT} />} wide>
            <input value={en.seoTitle} onChange={(e) => setEn("seoTitle", e.target.value)} className={inputClass} />
          </Field>
          <Field label={t("metaDescription")} counter={<Counter value={en.metaDescription} limit={META_DESCRIPTION_LIMIT} />} wide>
            <textarea value={en.metaDescription} onChange={(e) => setEn("metaDescription", e.target.value)} rows={2} className={textareaClass} />
          </Field>
          <Field label={t("summary")} wide>
            <textarea value={en.summary} onChange={(e) => setEn("summary", e.target.value)} rows={3} className={textareaClass} />
          </Field>
          <Field label={t("highlights")} hint={t("highlightsHint")} wide>
            <textarea value={en.highlights} onChange={(e) => setEn("highlights", e.target.value)} rows={3} className={textareaClass} />
          </Field>
          <Field label={t("description")} wide>
            <textarea value={en.description} onChange={(e) => setEn("description", e.target.value)} rows={8} className={textareaClass} />
          </Field>
          <Field label={t("faq")} hint={t("faqHint")} wide>
            <textarea value={en.faq} onChange={(e) => setEn("faq", e.target.value)} rows={6} className={textareaClass} />
          </Field>
          <Field label={t("imageAlts")} hint={t("imageAltsHint")} wide>
            <textarea value={en.imageAlts} onChange={(e) => setEn("imageAlts", e.target.value)} rows={2} className={textareaClass} />
          </Field>
        </div>
      </section>
    </>
  );
}
