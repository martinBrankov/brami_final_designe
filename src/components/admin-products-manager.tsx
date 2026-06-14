"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { AdminProductRecord } from "@/lib/admin-data";

type ProductDraft = {
  id: string;
  name: string;
  brand: AdminProductRecord["brand"];
  badge: AdminProductRecord["badge"];
  discountPercent: string;
  priceEur: string;
  priceBgn: string;
  packaging: string;
  weight: string;
  rating: string;
  stock: string;
  description: string;
  categories: string;
  audiences: string;
  imageKeys: string;
  highlights: string;
  relatedProductIds: string;
};

const emptyDraft: ProductDraft = {
  id: "",
  name: "",
  brand: "brami",
  badge: "none",
  discountPercent: "",
  priceEur: "",
  priceBgn: "",
  packaging: "",
  weight: "",
  rating: "",
  stock: "",
  description: "",
  categories: "",
  audiences: "",
  imageKeys: "",
  highlights: "",
  relatedProductIds: "",
};

function toDraft(product: AdminProductRecord): ProductDraft {
  return {
    id: String(product.id),
    name: product.name,
    brand: product.brand,
    badge: product.badge,
    discountPercent: product.discountPercent == null ? "" : String(product.discountPercent),
    priceEur: String(product.priceEur),
    priceBgn: String(product.priceBgn),
    packaging: product.packaging,
    weight: String(product.weight),
    rating: String(product.rating),
    stock: String(product.stock),
    description: product.description,
    categories: product.categories.join(", "),
    audiences: product.audiences.join(", "),
    imageKeys: product.imageKeys.join(", "),
    highlights: product.highlights.join("\n"),
    relatedProductIds: product.relatedProductIds.join(", "),
  };
}

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineList(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const BADGE_LABELS: Record<string, string> = {
  bestseller: "Bestseller",
  sale: "Sale",
  new: "Ново",
  favorite: "Любимо",
  featured: "Featured",
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="h-4 w-4" viewBox="0 0 20 20" fill={i <= Math.round(rating) ? "#d8b36b" : "#e5e0d8"}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-[#8a9099]">{Number(rating).toFixed(1)}</span>
    </div>
  );
}

function ProductPreview({ draft }: { draft: ProductDraft }) {
  const priceEur = Number(draft.priceEur) || 0;
  const priceBgn = Number(draft.priceBgn) || 0;
  const discount = Number(draft.discountPercent) || 0;
  const rating = Number(draft.rating) || 0;
  const highlights = draft.highlights.split(/\r?\n/).map((h) => h.trim()).filter(Boolean);
  const imageKeys = draft.imageKeys.split(",").map((k) => k.trim()).filter(Boolean);
  const categories = draft.categories.split(",").map((c) => c.trim()).filter(Boolean);
  const audiences = draft.audiences.split(",").map((a) => a.trim()).filter(Boolean);
  const badgeLabel = BADGE_LABELS[draft.badge];

  const originalEur = discount > 0 ? priceEur / (1 - discount / 100) : null;

  return (
    <div className="border-t border-[#e7dfd1] pt-6">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6f45]">Преглед на продукта</p>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          {imageKeys.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {imageKeys.map((key) => (
                <div key={key} className="flex aspect-square items-center justify-center rounded-[16px] bg-[#f4eef8] text-xs font-mono text-[#8f72a7]">
                  {key}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-[20px] bg-[#f4eef8] text-sm text-[#9e8aae]">
              Без снимки
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-2">
            {badgeLabel && (
              <span className="inline-flex rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-3 py-1 text-xs font-semibold text-white">
                {badgeLabel}
              </span>
            )}
            <span className="inline-flex rounded-full border border-[#d8d0de] px-3 py-1 text-xs font-medium text-[#6b587f]">
              {draft.brand}
            </span>
          </div>

          <h2 className="font-serif text-3xl leading-tight text-[#432855]">
            {draft.name || <span className="opacity-30">Без заглавие</span>}
          </h2>

          {rating > 0 && <StarRow rating={rating} />}

          {draft.packaging && (
            <p className="text-sm text-[#6b587f]">
              <span className="font-semibold text-[#432855]">Опаковка:</span> {draft.packaging}
              {draft.weight ? ` · ${draft.weight} кг` : ""}
            </p>
          )}

          {highlights.length > 0 && (
            <ul className="space-y-1.5">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#5f4b73]">
                  <span className="mt-0.5 text-[#68b27b]">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          )}

          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#432855]">€ {priceEur.toFixed(2)}</span>
              {originalEur && (
                <span className="text-lg text-[#9e8aae] line-through">€ {originalEur.toFixed(2)}</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-[#8f72a7]">{priceBgn.toFixed(2)} лв.</p>
          </div>

          <div className="h-11 w-full rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] flex items-center justify-center text-sm font-semibold text-white">
            Добави в количката
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-[#eadde4] pt-5">
        <div className="mb-5 flex gap-1 border-b border-[#eadde4]">
          <span className="inline-flex cursor-default items-center border-b-2 border-[#432855] px-4 pb-3 text-sm font-semibold text-[#432855]">
            Описание
          </span>
          <span className="inline-flex cursor-default items-center border-b-2 border-transparent px-4 pb-3 text-sm font-medium text-[#9e8aae]">
            Отзиви
          </span>
        </div>
        {draft.description ? (
          <div
            className="text-sm leading-7 text-[#5f4b73] [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:leading-6 [&_p]:mb-2 [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-[#432855] [&_a]:text-[#6c3f8d] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: draft.description }}
          />
        ) : (
          <p className="text-sm text-[#9e8aae]">Няма описание.</p>
        )}
      </div>

      {(categories.length > 0 || audiences.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="rounded-full border border-[#d8d0de] px-2.5 py-0.5 text-xs text-[#6b587f]">{c}</span>
          ))}
          {audiences.map((a) => (
            <span key={a} className="rounded-full border border-[#c8d8e8] px-2.5 py-0.5 text-xs text-[#3d6080]">{a}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminProductsManager({
  products,
}: {
  products: AdminProductRecord[];
}) {
  const router = useRouter();
  const [modalDraft, setModalDraft] = useState<ProductDraft | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.id - b.id),
    [products],
  );

  function openEdit(product: AdminProductRecord) {
    setFeedback(null);
    setShowPreview(false);
    setModalDraft(toDraft(product));
  }

  function openNew() {
    setFeedback(null);
    setShowPreview(false);
    setModalDraft(emptyDraft);
  }

  function closeModal() {
    setModalDraft(null);
    setFeedback(null);
    setShowPreview(false);
  }

  function updateDraft<Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) {
    setModalDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalDraft) return;
    setFeedback(null);

    const payload = {
      id: Number.parseInt(modalDraft.id, 10),
      name: modalDraft.name.trim(),
      brand: modalDraft.brand,
      badge: modalDraft.badge,
      discountPercent: modalDraft.discountPercent.trim() ? Number(modalDraft.discountPercent) : null,
      priceEur: Number(modalDraft.priceEur),
      priceBgn: Number(modalDraft.priceBgn),
      packaging: modalDraft.packaging.trim(),
      weight: Number(modalDraft.weight),
      rating: Number(modalDraft.rating),
      stock: Math.max(0, Math.trunc(Number(modalDraft.stock) || 0)),
      description: modalDraft.description.trim(),
      categories: parseCsvList(modalDraft.categories),
      audiences: parseCsvList(modalDraft.audiences),
      imageKeys: parseCsvList(modalDraft.imageKeys),
      highlights: parseLineList(modalDraft.highlights),
      relatedProductIds: parseCsvList(modalDraft.relatedProductIds).map((value) => Number(value)),
    };

    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !result?.ok) {
      setFeedback(result?.error || "Неуспешен запис.");
      return;
    }

    setFeedback("Продуктът е записан.");
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete(id: number) {
    const shouldDelete = window.confirm(`Изтриване на продукт #${id}?`);
    if (!shouldDelete) return;

    setDeletingId(id);

    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    setDeletingId(null);

    if (!response.ok || !result?.ok) {
      alert(result?.error || "Неуспешно изтриване.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#7c6f61]">
            {sortedProducts.length} продукта
          </h2>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#1d2733] px-4 text-sm font-semibold text-white transition hover:bg-[#2b3847]"
          >
            + Нов продукт
          </button>
        </div>

        <div className="divide-y divide-[#e7dfd1]">
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
            >
              <div className="min-w-0 flex-1 lg:order-first">
                <p className="text-sm font-semibold text-[#1d2733]">
                  #{product.id} {product.name}
                </p>
                <p className="mt-0.5 text-xs text-[#67727d]">
                  {product.brand} · {product.badge} · €{product.priceEur.toFixed(2)}
                </p>
              </div>

              <div className="order-first flex shrink-0 items-center justify-end gap-1 lg:order-last">
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  title="Редактирай"
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#d2c8b8] text-[#1d2733] transition hover:bg-[#f8f4ec]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(product.id)}
                  disabled={deletingId === product.id}
                  title="Изтрий"
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-red-200 text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {deletingId === product.id
                    ? <span className="text-xs">…</span>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalDraft !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-8">
            <form onSubmit={handleSave}>
            <div className="mb-5 space-y-2">
              <div className="flex items-center justify-end gap-2">
                {feedback && <p className="mr-auto text-xs font-medium text-red-600">{feedback}</p>}
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  title={showPreview ? "Скрий преглед" : "Преглед"}
                  className={`flex h-8 w-8 items-center justify-center rounded-[8px] border transition ${
                    showPreview
                      ? "border-[#d8b36b] bg-[#fdf8ee] text-[#8a6f45]"
                      : "border-[#d2c8b8] bg-white text-[#1d2733] hover:bg-[#f8f4ec]"
                  }`}
                >
                  {showPreview
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  title="Запази продукта"
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#1d2733] text-white transition hover:bg-[#2b3847] disabled:opacity-60"
                >
                  {isPending
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d2c8b8] bg-white text-[#5f6b76] transition hover:bg-[#f8f4ec]"
                  aria-label="Затвори"
                >
                  ✕
                </button>
              </div>
              <h2 className="text-lg font-semibold text-[#1d2733]">
                {modalDraft.id ? `Продукт #${modalDraft.id}` : "Нов продукт"}
              </h2>
            </div>
              <div className={`border-t border-[#e7dfd1] pt-5${showPreview ? " hidden" : ""}`}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">ID</span>
                  <input
                    value={modalDraft.id}
                    onChange={(e) => updateDraft("id", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Име</span>
                  <input
                    value={modalDraft.name}
                    onChange={(e) => updateDraft("name", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Brand</span>
                  <select
                    value={modalDraft.brand}
                    onChange={(e) => updateDraft("brand", e.target.value as ProductDraft["brand"])}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                  >
                    <option value="brami">brami</option>
                    <option value="Voditsa">Voditsa</option>
                    <option value="other">other</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Badge</span>
                  <select
                    value={modalDraft.badge}
                    onChange={(e) => updateDraft("badge", e.target.value as ProductDraft["badge"])}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                  >
                    <option value="none">none</option>
                    <option value="featured">featured</option>
                    <option value="bestseller">bestseller</option>
                    <option value="sale">sale</option>
                    <option value="new">new</option>
                    <option value="favorite">favorite</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Цена EUR</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={modalDraft.priceEur}
                    onChange={(e) => {
                      const eur = e.target.value;
                      const parsed = parseFloat(eur);
                      updateDraft("priceEur", eur);
                      updateDraft("priceBgn", Number.isNaN(parsed) ? "" : (parsed * 1.95583).toFixed(2));
                    }}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">
                    Цена BGN <span className="ml-1 text-xs font-normal text-[#9aa4ac]">(изчислява се автоматично)</span>
                  </span>
                  <input
                    type="number"
                    value={modalDraft.priceBgn}
                    readOnly
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-[#f4f2ef] px-4 text-[#7c8a94] cursor-default select-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Discount %</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={modalDraft.discountPercent}
                    onChange={(e) => updateDraft("discountPercent", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Опаковка</span>
                  <input
                    value={modalDraft.packaging}
                    onChange={(e) => updateDraft("packaging", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Тегло</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={modalDraft.weight}
                    onChange={(e) => updateDraft("weight", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Rating</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={modalDraft.rating}
                    onChange={(e) => updateDraft("rating", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Количество (наличност)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={modalDraft.stock}
                    onChange={(e) => updateDraft("stock", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    required
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Категории</span>
                  <input
                    value={modalDraft.categories}
                    onChange={(e) => updateDraft("categories", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    placeholder="face, body, hair"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Аудитории</span>
                  <input
                    value={modalDraft.audiences}
                    onChange={(e) => updateDraft("audiences", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    placeholder="women, men, unisex"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Image keys</span>
                  <input
                    value={modalDraft.imageKeys}
                    onChange={(e) => updateDraft("imageKeys", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    placeholder="id01, id02"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Свързани продукти</span>
                  <input
                    value={modalDraft.relatedProductIds}
                    onChange={(e) => updateDraft("relatedProductIds", e.target.value)}
                    className="h-11 w-full rounded-[16px] border border-[#d9d4ca] bg-white px-4"
                    placeholder="2, 5, 9"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Highlights</span>
                  <textarea
                    value={modalDraft.highlights}
                    onChange={(e) => updateDraft("highlights", e.target.value)}
                    rows={5}
                    className="w-full rounded-[18px] border border-[#d9d4ca] bg-white px-4 py-3"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#25313d]">Описание</span>
                  <textarea
                    value={modalDraft.description}
                    onChange={(e) => updateDraft("description", e.target.value)}
                    rows={8}
                    className="w-full rounded-[18px] border border-[#d9d4ca] bg-white px-4 py-3"
                  />
                </label>
              </div>
              </div>

              {showPreview && <ProductPreview draft={modalDraft} />}

            </form>
          </div>
        </div>
      )}
    </>
  );
}
