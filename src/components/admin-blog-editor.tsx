"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType = "heading" | "paragraph" | "image";

type ImageData = { url: string; alt: string; caption: string };

type EditorBlock = {
  id: string;
  type: BlockType;
  initialText: string;
  initialImage?: ImageData;
};

type PreviewItem = { id: string; type: BlockType; content: string };

type DbBlock = {
  id: string;
  type: string;
  content: string | null;
  position: number;
};

export type DbPost = {
  id: string;
  title: string;
  slug: string;
  eyebrow: string | null;
  excerpt: string | null;
  cover_image: string | null;
  read_time: string | null;
  published_at: string | null;
  is_featured: boolean;
  show_in_list: boolean;
  published: boolean;
  blog_blocks: DbBlock[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BG_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "sht", ъ: "a", ь: "", ю: "yu", я: "ya",
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .split("")
    .map((c) => BG_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function parseDbBlock(b: DbBlock): EditorBlock {
  const raw = (b.content ?? "").trim();

  if (b.type === "image") {
    try {
      const img = JSON.parse(raw) as Partial<ImageData>;
      return {
        id: uid(), type: "image", initialText: "",
        initialImage: { url: img.url ?? "", alt: img.alt ?? "", caption: img.caption ?? "" },
      };
    } catch {
      return { id: uid(), type: "image", initialText: "", initialImage: { url: raw, alt: "", caption: "" } };
    }
  }

  if (raw.startsWith("<h2>")) {
    return { id: uid(), type: "heading", initialText: raw.replace(/^<h2>/, "").replace(/<\/h2>$/, "") };
  }

  return { id: uid(), type: "paragraph", initialText: raw };
}

// ── Image block editor ────────────────────────────────────────────────────────

function ImageBlockEditor({
  blockId,
  initial,
  registerRef,
}: {
  blockId: string;
  initial: ImageData;
  registerRef: (id: string, data: ImageData | null) => void;
}) {
  const [url, setUrl] = useState(initial.url);
  const [alt, setAlt] = useState(initial.alt);
  const [caption, setCaption] = useState(initial.caption);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputId = `img-file-${blockId}`;

  useEffect(() => {
    registerRef(blockId, { url, alt, caption });
    return () => registerRef(blockId, null);
  }, [blockId, url, alt, caption, registerRef]);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (!res.ok) { setUploadError(body.error ?? "Грешка при качване."); return; }
      setUrl(body.url ?? "");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      {url ? (
        <div>
          <div className="relative h-[200px] overflow-hidden rounded-[10px] bg-[#f0ebe3]">
            <Image src={url} alt={alt || "блог снимка"} fill className="object-cover" sizes="700px" />
          </div>
          <button
            type="button"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={uploading}
            className="mt-2 inline-flex h-8 items-center rounded-[7px] border border-[#d2c8b8] bg-white px-3 text-xs font-medium text-[#1d2733] transition hover:bg-[#f8f4ec] disabled:opacity-60"
          >
            {uploading ? "Качва се…" : "Смени снимката"}
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-[#d2c8b8] bg-[#fafaf8] text-[#8a9099] transition hover:border-[#d8b36b] hover:bg-[#fdf8ee]"
        >
          <svg className="h-8 w-8 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5M12 3v9m0 0l-3-3m3 3l3-3" />
          </svg>
          <span className="text-sm font-medium">{uploading ? "Качва се…" : "Избери или пусни снимка"}</span>
          <span className="text-xs opacity-60">JPG, PNG, WebP, GIF · до 5 MB</span>
        </label>
      )}

      <input id={inputId} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {uploadError && <p className="text-xs font-medium text-red-600">{uploadError}</p>}

      <input
        type="text"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="Alt текст / описание за SEO…"
        className="w-full rounded-[8px] border border-[#e0dbd2] px-3 py-2 text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40"
      />

      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Надпис под снимката (по желание)…"
        className="w-full rounded-[8px] border border-[#e0dbd2] px-3 py-2 text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40"
      />
    </div>
  );
}

// ── Paragraph editor (TipTap) ─────────────────────────────────────────────────

function ParagraphEditor({
  blockId,
  initialHtml,
  registerRef,
}: {
  blockId: string;
  initialHtml: string;
  registerRef: (id: string, editor: Editor | null) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialHtml || "",
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: "tiptap-editor min-h-[80px] px-3 py-2.5 text-sm leading-6 text-[#1d2733] outline-none",
      },
    },
  });

  const activeState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return { isBold: false, isItalic: false, isBulletList: false, canSink: false, canLift: false };
      return {
        isBold: ctx.editor.isActive("bold"),
        isItalic: ctx.editor.isActive("italic"),
        isBulletList: ctx.editor.isActive("bulletList"),
        canSink: ctx.editor.can().sinkListItem("listItem"),
        canLift: ctx.editor.can().liftListItem("listItem"),
      };
    },
  });

  useEffect(() => {
    if (!editor) return;
    registerRef(blockId, editor);
    return () => registerRef(blockId, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, blockId, registerRef]);

  const btnBase = "flex items-center justify-center rounded-[6px] border text-sm transition disabled:cursor-default";
  const btnOff  = "border-[#ede9e3] bg-[#f9f8f6] text-[#c8c2bb]";
  const btnOn   = "border-[#e0dbd2] bg-white text-[#1d2733] hover:bg-[#f8f4ec]";
  const btnHot  = "border-[#d8b36b] bg-[#fdf8ee] text-[#8a6f45]";

  function cls(active: boolean) {
    if (!isFocused) return `${btnBase} ${btnOff}`;
    return `${btnBase} ${active ? btnHot : btnOn}`;
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        <button type="button" disabled={!isFocused}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Удебелен (Ctrl+B)"
          className={`h-7 w-7 font-bold ${cls(activeState?.isBold ?? false)}`}>
          B
        </button>
        <button type="button" disabled={!isFocused}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Курсив (Ctrl+I)"
          className={`h-7 w-7 ${cls(activeState?.isItalic ?? false)}`}>
          <em className="font-serif text-base">i</em>
        </button>

        <span className="mx-0.5 h-4 w-px bg-[#d5cfc7]" />

        <button type="button" disabled={!isFocused}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Списък с точки"
          className={`h-7 gap-1 px-2 ${cls(activeState?.isBulletList ?? false)}`}>
          <span className="text-base leading-none">•</span>
          <span className="flex flex-col gap-[3px]">
            <span className="block h-[2px] w-3 rounded-full bg-current opacity-60" />
            <span className="block h-[2px] w-3 rounded-full bg-current opacity-60" />
          </span>
        </button>
        <button type="button" disabled={!isFocused || !(activeState?.canSink ?? false)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().sinkListItem("listItem").run()}
          title="Отстъп навътре (Tab)"
          className={`h-7 w-7 ${cls(false)}`}>→</button>
        <button type="button" disabled={!isFocused || !(activeState?.canLift ?? false)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().liftListItem("listItem").run()}
          title="Отстъп навън (Shift+Tab)"
          className={`h-7 w-7 ${cls(false)}`}>←</button>
      </div>

      <div className="rounded-[8px] border border-[#e0dbd2] bg-white focus-within:border-[#d8b36b] focus-within:ring-1 focus-within:ring-[#d8b36b]/40">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function AdminBlogEditor({ post, onClose }: { post: DbPost | null; onClose?: () => void }) {
  const router = useRouter();
  const isNew = post === null;

  const [meta, setMeta] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    eyebrow: post?.eyebrow ?? "",
    excerpt: post?.excerpt ?? "",
    coverImage: post?.cover_image ?? "",
    readTime: post?.read_time ?? "",
    publishedAt: post?.published_at ?? "",
    isFeatured: post?.is_featured ?? false,
    showInList: post?.show_in_list ?? true,
    published: post?.published ?? false,
  });
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  async function handleCoverFile(file: File) {
    setCoverUploading(true);
    setCoverError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (!res.ok) { setCoverError(body.error ?? "Грешка при качване."); return; }
      setMeta((m) => ({ ...m, coverImage: body.url ?? "" }));
    } finally {
      setCoverUploading(false);
    }
  }

  const [blocks, setBlocks] = useState<EditorBlock[]>(
    () => (post?.blog_blocks ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(parseDbBlock),
  );

  const paraRefs  = useRef<Map<string, Editor>>(new Map());
  const imageRefs = useRef<Map<string, ImageData>>(new Map());
  const headingRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const registerParaRef = useCallback((id: string, editor: Editor | null) => {
    if (editor) paraRefs.current.set(id, editor);
    else paraRefs.current.delete(id);
  }, []);

  const registerImageRef = useCallback((id: string, data: ImageData | null) => {
    if (data) imageRefs.current.set(id, data);
    else imageRefs.current.delete(id);
  }, []);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);

  const [slugTouched, setSlugTouched] = useState(!isNew);
  useEffect(() => {
    if (!slugTouched && meta.title) {
      setMeta((m) => ({ ...m, slug: slugify(m.title) }));
    }
  }, [meta.title, slugTouched]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function collectBlocks(): PreviewItem[] {
    return blocks.map((block) => {
      if (block.type === "heading") {
        const el = headingRefs.current.get(block.id);
        return { id: block.id, type: "heading", content: el?.value ?? block.initialText };
      }
      if (block.type === "image") {
        const img = imageRefs.current.get(block.id);
        return { id: block.id, type: "image", content: img ? JSON.stringify(img) : "" };
      }
      const editorInst = paraRefs.current.get(block.id);
      return { id: block.id, type: "paragraph", content: editorInst?.getHTML() ?? block.initialText };
    });
  }

  function addBlock(type: BlockType) {
    const base: EditorBlock = { id: uid(), type, initialText: "" };
    if (type === "image") base.initialImage = { url: "", alt: "", caption: "" };
    setBlocks((prev) => [...prev, base]);
  }

  function removeBlock(id: string) {
    paraRefs.current.delete(id);
    imageRefs.current.delete(id);
    headingRefs.current.delete(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  function togglePreview() {
    if (!showPreview) setPreviewData(collectBlocks());
    setShowPreview((v) => !v);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!meta.title.trim() || !meta.slug.trim()) {
      setSaveError("Заглавието и slug-ът са задължителни.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const serializedBlocks = collectBlocks()
      .map(({ type, content }) => {
        if (type === "heading") {
          const c = content.trim();
          if (!c) return { content: "" };
          return { content: `<h2>${c}</h2>` };
        }
        if (type === "image") {
          try {
            const img = JSON.parse(content) as ImageData;
            if (!img.url) return { content: "" };
            return { type: "image", content };
          } catch {
            return { content: "" };
          }
        }
        // paragraph — TipTap getHTML()
        const isEmpty = !content || content === "<p></p>";
        if (isEmpty) return { content: "" };
        return { content };
      })
      .filter((b) => b.content);

    const payload = {
      title: meta.title.trim(),
      slug: meta.slug.trim(),
      eyebrow: meta.eyebrow.trim(),
      excerpt: meta.excerpt.trim(),
      coverImage: meta.coverImage.trim() || null,
      readTime: meta.readTime.trim(),
      publishedAt: meta.publishedAt || null,
      isFeatured: meta.isFeatured,
      showInList: meta.showInList,
      published: meta.published,
      blocks: serializedBlocks,
    };

    try {
      const res = await fetch(isNew ? "/api/admin/blog" : `/api/admin/blog/${post!.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setSaveError(body.error ?? "Грешка при запазване.");
        return;
      }

      router.refresh();
      if (onClose) {
        onClose();
      } else {
        router.push("/admin-panel/blog");
      }
    } catch {
      setSaveError("Мрежова грешка. Опитай отново.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const blockLabel: Record<BlockType, string> = { heading: "Заглавие", paragraph: "Параграф", image: "Снимка" };

  return (
    <div className="space-y-5">
      {/* Action bar */}
      {onClose ? (
        <div className="flex items-center justify-end gap-2">
          {saveError && <p className="mr-auto text-xs font-medium text-red-600">{saveError}</p>}
          <button type="button" onClick={togglePreview}
            title={showPreview ? "Скрий преглед" : "Преглед"}
            className={`flex h-8 w-8 items-center justify-center rounded-[8px] border transition ${
              showPreview ? "border-[#d8b36b] bg-[#fdf8ee] text-[#8a6f45]" : "border-[#d2c8b8] bg-white text-[#1d2733] hover:bg-[#f8f4ec]"
            }`}>
            {showPreview
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            title={isNew ? "Създай статия" : "Запази промените"}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#1d2733] text-white transition hover:bg-[#2d3a47] disabled:opacity-60">
            {saving
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
          </button>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d2c8b8] bg-white text-[#5f6b76] transition hover:bg-[#f8f4ec]"
            aria-label="Затвори">
            ✕
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link href="/admin-panel/blog"
            className="mr-auto inline-flex h-10 items-center rounded-[8px] border border-[#d2c8b8] bg-white px-4 text-sm font-medium text-[#1d2733] transition hover:bg-[#f8f4ec]">
            ← Назад
          </Link>
          <button type="button" onClick={togglePreview}
            title={showPreview ? "Скрий преглед" : "Преглед"}
            className={`flex h-9 w-9 items-center justify-center rounded-[8px] border transition ${
              showPreview ? "border-[#d8b36b] bg-[#fdf8ee] text-[#8a6f45]" : "border-[#d2c8b8] bg-white text-[#1d2733] hover:bg-[#f8f4ec]"
            }`}>
            {showPreview
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            title={isNew ? "Създай статия" : "Запази промените"}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#1d2733] text-white transition hover:bg-[#2d3a47] disabled:opacity-60">
            {saving
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
          </button>
          {saveError && <p className="text-sm font-medium text-red-600">{saveError}</p>}
        </div>
      )}

      {/* Metadata */}
      <div className={`border-t border-[#e7dfd1] pt-6${showPreview ? " hidden" : ""}`}>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6f45]">Настройки на статията</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">Заглавие</label>
            <input type="text" value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              placeholder="Напр. Шафранът в козметиката"
              className="w-full rounded-[8px] border border-[#e0dbd2] px-3 py-2 text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">Slug (URL)</label>
            <input type="text" value={meta.slug}
              onChange={(e) => { setSlugTouched(true); setMeta((m) => ({ ...m, slug: e.target.value })); }}
              placeholder="shafranat-v-kozmetikata"
              className="w-full rounded-[8px] border border-[#e0dbd2] px-3 py-2 font-mono text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">Категория (eyebrow)</label>
            <input type="text" value={meta.eyebrow}
              onChange={(e) => setMeta((m) => ({ ...m, eyebrow: e.target.value }))}
              placeholder="Напр. Активна грижа"
              className="w-full rounded-[8px] border border-[#e0dbd2] px-3 py-2 text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">Резюме (excerpt)</label>
            <textarea value={meta.excerpt}
              onChange={(e) => setMeta((m) => ({ ...m, excerpt: e.target.value }))}
              rows={2} placeholder="Кратко описание за листа с статии…"
              className="w-full resize-none rounded-[8px] border border-[#e0dbd2] px-3 py-2 text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">Време за четене</label>
            <input type="text" value={meta.readTime}
              onChange={(e) => setMeta((m) => ({ ...m, readTime: e.target.value }))}
              placeholder="Напр. 4 мин"
              className="w-full rounded-[8px] border border-[#e0dbd2] px-3 py-2 text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">Дата на публикуване</label>
            <input type="date" value={meta.publishedAt}
              onChange={(e) => setMeta((m) => ({ ...m, publishedAt: e.target.value }))}
              className="w-full rounded-[8px] border border-[#e0dbd2] px-3 py-2 text-sm text-[#1d2733] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#5f6b76]">Хиро снимка (корица)</label>
            {meta.coverImage ? (
              <div className="flex flex-col gap-2">
                <div className="relative h-[180px] overflow-hidden rounded-[10px] bg-[#f0ebe3]">
                  <Image src={meta.coverImage} alt="корица" fill className="object-cover" sizes="700px" />
                </div>
                <div className="flex gap-2">
                  <label className="inline-flex h-8 cursor-pointer items-center rounded-[7px] border border-[#d2c8b8] bg-white px-3 text-xs font-medium text-[#1d2733] transition hover:bg-[#f8f4ec]">
                    {coverUploading ? "Качва се…" : "Смени снимката"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = ""; }} />
                  </label>
                  <button type="button" onClick={() => setMeta((m) => ({ ...m, coverImage: "" }))}
                    className="inline-flex h-8 items-center rounded-[7px] border border-red-200 bg-white px-3 text-xs font-medium text-red-500 hover:bg-red-50">
                    Премахни
                  </button>
                </div>
                {coverError && <p className="text-xs font-medium text-red-600">{coverError}</p>}
              </div>
            ) : (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCoverFile(f); }}
                className="flex h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-[#d2c8b8] bg-[#fafaf8] text-[#8a9099] transition hover:border-[#d8b36b] hover:bg-[#fdf8ee]"
              >
                <svg className="h-7 w-7 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5M12 3v9m0 0l-3-3m3 3l3-3" />
                </svg>
                <span className="text-sm font-medium">{coverUploading ? "Качва се…" : "Избери или пусни хиро снимка"}</span>
                <span className="text-xs opacity-60">JPG, PNG, WebP · до 5 MB</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = ""; }} />
              </label>
            )}
            {coverError && !meta.coverImage && <p className="mt-1 text-xs font-medium text-red-600">{coverError}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1d2733]">
              <input type="checkbox" checked={meta.published}
                onChange={(e) => setMeta((m) => ({ ...m, published: e.target.checked }))}
                className="h-4 w-4 rounded border-[#d2c8b8] accent-[#d8b36b]" />
              Публикувана
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1d2733]">
              <input type="checkbox" checked={meta.isFeatured}
                onChange={(e) => setMeta((m) => ({ ...m, isFeatured: e.target.checked }))}
                className="h-4 w-4 rounded border-[#d2c8b8] accent-[#d8b36b]" />
              Акцентирана (Featured)
            </label>
            {meta.isFeatured && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5f6b76]">
                <input type="checkbox" checked={meta.showInList}
                  onChange={(e) => setMeta((m) => ({ ...m, showInList: e.target.checked }))}
                  className="h-4 w-4 rounded border-[#d2c8b8] accent-[#d8b36b]" />
                Показвай и в списъка
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Blocks */}
      <div className={`border-t border-[#e7dfd1] pt-6${showPreview ? " hidden" : ""}`}>
        <div className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6f45]">
            Съдържание — {blocks.length} {blocks.length === 1 ? "блок" : "блока"}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => addBlock("heading")}
              className="inline-flex h-8 items-center rounded-[7px] border border-[#d2c8b8] bg-white px-3 text-xs font-semibold text-[#1d2733] hover:bg-[#f8f4ec]">
              + Заглавие
            </button>
            <button type="button" onClick={() => addBlock("paragraph")}
              className="inline-flex h-8 items-center rounded-[7px] border border-[#d2c8b8] bg-white px-3 text-xs font-semibold text-[#1d2733] hover:bg-[#f8f4ec]">
              + Параграф
            </button>
            <button type="button" onClick={() => addBlock("image")}
              className="inline-flex h-8 items-center rounded-[7px] border border-[#d2c8b8] bg-white px-3 text-xs font-semibold text-[#1d2733] hover:bg-[#f8f4ec]">
              + Снимка
            </button>
          </div>
        </div>

        {blocks.length === 0 && (
          <p className="py-8 text-center text-sm text-[#aaa]">Добави блокове за съдържание.</p>
        )}

        <div className="divide-y divide-[#e7dfd1]">
          {blocks.map((block, idx) => (
            <div key={block.id} className="py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#e8e2d8] px-2 py-0.5 text-xs font-semibold text-[#5f6b76]">
                    {blockLabel[block.type]}
                  </span>
                  <span className="text-xs text-[#bbb]">#{idx + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#e0dbd2] bg-white text-xs text-[#5f6b76] hover:bg-[#f0ebe3] disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#e0dbd2] bg-white text-xs text-[#5f6b76] hover:bg-[#f0ebe3] disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => removeBlock(block.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-red-200 bg-white text-xs text-red-500 hover:bg-red-50">×</button>
                </div>
              </div>

              {block.type === "heading" && (
                <input key={block.id} type="text" defaultValue={block.initialText}
                  ref={(el) => { if (el) headingRefs.current.set(block.id, el); else headingRefs.current.delete(block.id); }}
                  placeholder="Въведи заглавие…"
                  className="w-full rounded-[8px] border border-[#e0dbd2] bg-white px-3 py-2 font-serif text-xl text-[#432855] outline-none focus:border-[#d8b36b] focus:ring-1 focus:ring-[#d8b36b]/40" />
              )}

              {block.type === "paragraph" && (
                <ParagraphEditor key={block.id} blockId={block.id}
                  initialHtml={block.initialText} registerRef={registerParaRef} />
              )}

              {block.type === "image" && (
                <ImageBlockEditor key={block.id} blockId={block.id}
                  initial={block.initialImage ?? { url: "", alt: "", caption: "" }}
                  registerRef={registerImageRef} />
              )}
            </div>
          ))}
        </div>

        {blocks.length > 0 && (
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => addBlock("heading")}
              className="inline-flex h-8 items-center rounded-[7px] border border-[#d2c8b8] bg-white px-3 text-xs font-semibold text-[#1d2733] hover:bg-[#f8f4ec]">
              + Заглавие
            </button>
            <button type="button" onClick={() => addBlock("paragraph")}
              className="inline-flex h-8 items-center rounded-[7px] border border-[#d2c8b8] bg-white px-3 text-xs font-semibold text-[#1d2733] hover:bg-[#f8f4ec]">
              + Параграф
            </button>
            <button type="button" onClick={() => addBlock("image")}
              className="inline-flex h-8 items-center rounded-[7px] border border-[#d2c8b8] bg-white px-3 text-xs font-semibold text-[#1d2733] hover:bg-[#f8f4ec]">
              + Снимка
            </button>
          </div>
        )}
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="border-t border-[#e7dfd1] pt-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6f45]">Преглед на статията</p>
          </div>
          <div className="mx-auto max-w-2xl space-y-6">
            {meta.coverImage && (
              <div className="relative h-[260px] overflow-hidden rounded-[16px]">
                <Image src={meta.coverImage} alt={meta.title || "корица"} fill className="object-cover" sizes="700px" />
              </div>
            )}
            {meta.eyebrow && (
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">{meta.eyebrow}</p>
            )}
            <h1 className="font-serif text-4xl leading-tight text-[#432855]">
              {meta.title || <span className="opacity-30">Заглавие…</span>}
            </h1>
            {meta.excerpt && <p className="text-lg leading-8 text-[#6b587f]">{meta.excerpt}</p>}
            <hr className="border-[#eadde4]" />
            <div className="space-y-6">
              {previewData.length === 0 && <p className="italic text-[#aaa]">Няма блокове.</p>}
              {previewData.map((item) => {
                if (item.type === "heading") {
                  return (
                    <h2 key={item.id} className="font-serif text-3xl leading-snug text-[#432855]">
                      {item.content || <span className="opacity-30">Заглавие…</span>}
                    </h2>
                  );
                }
                if (item.type === "image") {
                  try {
                    const img = JSON.parse(item.content) as ImageData;
                    if (!img.url) return <div key={item.id} className="flex h-[160px] items-center justify-center rounded-[12px] bg-[#f0ebe3] text-sm text-[#aaa]">Няма снимка</div>;
                    return (
                      <figure key={item.id} className="my-2">
                        <div className="relative h-[240px] overflow-hidden rounded-[14px]">
                          <Image src={img.url} alt={img.alt || ""} fill className="object-cover" sizes="700px" />
                        </div>
                        {img.caption && <figcaption className="mt-2 text-center text-sm text-[#8f72a7]">{img.caption}</figcaption>}
                      </figure>
                    );
                  } catch { return null; }
                }
                return (
                  <div key={item.id}
                    className="text-base leading-8 text-[#5f4b73] [&_em]:italic [&_i]:italic [&_strong]:font-semibold [&_b]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:leading-7 [&_li>p]:m-0 [&_ul_ul]:mt-1 [&_ul_ul]:list-[circle] [&_ul_ul]:pl-4"
                    dangerouslySetInnerHTML={{ __html: item.content || "<span style='opacity:.4'>Празен параграф…</span>" }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
