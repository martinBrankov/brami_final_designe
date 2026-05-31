"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminBlogEditor, type DbPost } from "@/components/admin-blog-editor";

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  eyebrow: string | null;
  published: boolean;
  is_featured: boolean;
  show_in_list: boolean;
  published_at: string | null;
  read_time: string | null;
  created_at: string;
};

type EditModal =
  | { kind: "loading"; id: string }
  | { kind: "ready"; id: string | "new"; post: DbPost | null };

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("bg-BG", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminBlogList({ posts: initialPosts }: { posts: BlogPostRow[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [featuring, setFeaturing] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [togglingList, setTogglingList] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<EditModal | null>(null);

  async function handleOpenEdit(id: string) {
    setEditModal({ kind: "loading", id });
    try {
      const res = await fetch(`/api/admin/blog/${id}`);
      const body = await res.json().catch(() => ({})) as { post?: DbPost };
      setEditModal({ kind: "ready", id, post: body.post ?? null });
    } catch {
      setEditModal(null);
    }
  }

  function handleOpenNew() {
    setEditModal({ kind: "ready", id: "new", post: null });
  }

  function handleCloseModal() {
    setEditModal(null);
    router.refresh();
  }

  async function handleTogglePublished(id: string, current: boolean) {
    setPublishing(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !current }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        alert(body.error ?? "Грешка.");
        return;
      }
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, published: !current } : p));
    } finally {
      setPublishing(null);
    }
  }

  async function handleToggleFeatured(id: string, current: boolean) {
    setFeaturing(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !current }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        alert(body.error ?? "Грешка.");
        return;
      }
      setPosts((prev) =>
        prev.map((p) => ({
          ...p,
          is_featured: p.id === id ? !current : !current ? false : p.is_featured,
          show_in_list: p.id === id && !current ? false : p.show_in_list,
        })),
      );
    } finally {
      setFeaturing(null);
    }
  }

  async function handleToggleShowInList(id: string, current: boolean) {
    setTogglingList(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showInList: !current }),
      });
      if (!res.ok) { alert("Грешка."); return; }
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, show_in_list: !current } : p));
    } finally {
      setTogglingList(null);
    }
  }

  async function handleCleanupImages() {
    setCleaning(true);
    setCleanResult(null);
    try {
      const res = await fetch("/api/admin/blog/cleanup-images", { method: "POST" });
      const body = await res.json().catch(() => ({})) as { deleted?: number; error?: string };
      if (!res.ok) { setCleanResult(`Грешка: ${body.error ?? "неизвестна"}`); return; }
      setCleanResult(body.deleted === 0 ? "Няма неизползвани снимки." : `Изтрити ${body.deleted} файла.`);
    } finally {
      setCleaning(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        alert(body.error ?? "Грешка при изтриване.");
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
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
          <p className="text-sm text-[#5f6b76]">{posts.length} статии</p>
          <div className="flex flex-wrap items-center gap-2">
            {cleanResult && (
              <span className="text-xs text-[#5f6b76]">{cleanResult}</span>
            )}
            <button
              type="button"
              onClick={handleCleanupImages}
              disabled={cleaning}
              className="inline-flex h-10 items-center rounded-[10px] border border-[#d2c8b8] bg-white px-4 text-sm font-medium text-[#5f6b76] transition hover:bg-[#f8f4ec] disabled:opacity-60"
            >
              {cleaning ? "Почиства…" : "Почисти снимки"}
            </button>
            <button
              type="button"
              onClick={handleOpenNew}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1d2733] px-5 text-sm font-semibold text-white transition hover:bg-[#2d3a47]"
            >
              + Нова статия
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#5f6b76]">Няма статии. Създай първата.</p>
        ) : (
          <div className="divide-y divide-[#e7dfd1]">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex flex-col-reverse gap-3 py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#1d2733]">{post.title}</span>
                    {post.is_featured && (
                      <span className="rounded-full bg-[#d8b36b]/20 px-2 py-0.5 text-xs font-semibold text-[#8a6f45]">
                        Акцент
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        post.published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {post.published ? "Публикувана" : "Чернова"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#8a9099]">
                    <span className="font-mono">{post.slug}</span>
                    {post.eyebrow && <span>{post.eyebrow}</span>}
                    {post.read_time && <span>{post.read_time} четене</span>}
                    <span>{formatDate(post.published_at ?? post.created_at)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => handleTogglePublished(post.id, post.published)}
                    disabled={publishing === post.id || (post.published && post.is_featured)}
                    title={post.published && post.is_featured ? "Смени акцента преди да скриеш статията" : post.published ? "Скрий от сайта" : "Публикувай"}
                    className={`flex h-8 w-8 items-center justify-center rounded-[8px] border transition disabled:opacity-50 ${
                      post.published
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        : "border-[#d2c8b8] bg-white text-[#8a9099] hover:bg-[#f8f4ec] hover:text-emerald-600"
                    }`}
                  >
                    {publishing === post.id
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      : post.published
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
                  </button>

                  <button
                    onClick={() => handleToggleFeatured(post.id, post.is_featured)}
                    disabled={featuring === post.id || !post.published || post.is_featured}
                    title={!post.published ? "Публикувай статията, за да я маркираш като акцент" : post.is_featured ? "Маркирай друга статия за да смениш акцента" : "Маркирай като акцент"}
                    className={`flex h-8 w-8 items-center justify-center rounded-[8px] border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      post.is_featured
                        ? "border-[#d8b36b] bg-[#fdf8ee] text-[#8a6f45] hover:bg-[#faefd6]"
                        : "border-[#d2c8b8] bg-white text-[#8a9099] hover:bg-[#f8f4ec] hover:text-[#8a6f45]"
                    }`}
                  >
                    {featuring === post.id
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill={post.is_featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  </button>

                  {post.is_featured && (
                    <button
                      onClick={() => handleToggleShowInList(post.id, post.show_in_list)}
                      disabled={togglingList === post.id}
                      title={post.show_in_list ? "Скрий от списъка" : "Показвай и в списъка"}
                      className={`flex h-8 w-8 items-center justify-center rounded-[8px] border transition disabled:opacity-50 ${
                        post.show_in_list
                          ? "border-[#b8d8b8] bg-[#eef8ee] text-[#4a7a4a] hover:bg-[#dff0df]"
                          : "border-[#d2c8b8] bg-white text-[#8a9099] hover:bg-[#f8f4ec]"
                      }`}
                    >
                      {togglingList === post.id
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        : post.show_in_list
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEdit(post.id)}
                    title="Редактирай"
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#d2c8b8] text-[#1d2733] transition hover:bg-[#f8f4ec]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>

                  {confirmId === post.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting === post.id}
                        className="inline-flex h-8 items-center rounded-[8px] bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {deleting === post.id ? "…" : "Потвърди"}
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
                      onClick={() => setConfirmId(post.id)}
                      title="Изтрий"
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

      {editModal !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-8">
            {editModal.kind === "loading" ? (
              <div className="py-20 text-center text-sm text-[#8a9099]">Зарежда се…</div>
            ) : (
              <AdminBlogEditor post={editModal.post} onClose={handleCloseModal} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
