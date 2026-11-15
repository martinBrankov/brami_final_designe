"use client";

import { useTranslations } from "next-intl";

// English version of an article, edited under the Bulgarian blocks in the
// admin blog editor. Text blocks are HTML; image blocks are shared.

export type BlogEnglishMeta = {
  title: string;
  slug: string;
  eyebrow: string;
  excerpt: string;
  readTime: string;
};

export type BlogEnglishBlock = {
  id: string;
  /** Bulgarian HTML, shown as a reference. */
  source: string;
  content: string;
};

const inputClass = "h-10 w-full rounded-[10px] border border-[#d9d4ca] bg-white px-3 text-sm";

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function AdminBlogEnglishFields({
  meta,
  blocks,
  hasUnsavedBlocks,
  onMetaChange,
  onBlockChange,
}: {
  meta: BlogEnglishMeta;
  blocks: BlogEnglishBlock[];
  hasUnsavedBlocks: boolean;
  onMetaChange: (next: BlogEnglishMeta) => void;
  onBlockChange: (id: string, content: string) => void;
}) {
  const t = useTranslations("AdminBlogEnglish");
  const set = (key: keyof BlogEnglishMeta, value: string) => onMetaChange({ ...meta, [key]: value });

  return (
    <div className="rounded-[14px] border border-[#e7dfd1] bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">{t("title")}</h3>
      <p className="mt-1 text-xs text-[#8a9099]">{t("intro")}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[#25313d]">{t("postTitle")}</span>
          <input value={meta.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#25313d]">{t("slug")}</span>
          <input value={meta.slug} onChange={(e) => set("slug", e.target.value)} className={inputClass} placeholder={t("slugPlaceholder")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#25313d]">{t("eyebrow")}</span>
          <input value={meta.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={inputClass} />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[#25313d]">{t("excerpt")}</span>
          <textarea value={meta.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} className="w-full rounded-[10px] border border-[#d9d4ca] bg-white px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#25313d]">{t("readTime")}</span>
          <input value={meta.readTime} onChange={(e) => set("readTime", e.target.value)} className={inputClass} placeholder="5 min" />
        </label>
      </div>

      <div className="mt-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5f6b76]">{t("blocks")}</p>
        {blocks.length === 0 ? <p className="text-xs text-[#8a9099]">{t("noBlocks")}</p> : null}
        {blocks.map((block, index) => (
          <div key={block.id} className="rounded-[10px] border border-[#efe9df] p-3">
            <p className="mb-2 line-clamp-2 text-xs text-[#8a9099]">
              {index + 1}. {stripTags(block.source)}
            </p>
            <textarea
              value={block.content}
              onChange={(e) => onBlockChange(block.id, e.target.value)}
              rows={Math.min(10, Math.max(3, Math.ceil(block.content.length / 120)))}
              className="w-full rounded-[10px] border border-[#d9d4ca] bg-white px-3 py-2 font-mono text-xs"
              placeholder={t("blockPlaceholder")}
            />
          </div>
        ))}
        {hasUnsavedBlocks ? <p className="text-xs text-[#8a6f45]">{t("unsavedBlocks")}</p> : null}
      </div>
    </div>
  );
}
