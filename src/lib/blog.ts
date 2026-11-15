import "server-only";
import { hasTranslatedBlock, translatedLocales } from "@/lib/content-locales";

import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";
import { pickTranslation } from "@/lib/i18n-content";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BlogPost = {
  id: string;
  title: string;
  /** Slug in the requested locale. */
  slug: string;
  /** Slug per locale (hreflang alternates, language switcher redirects). */
  slugs: Record<AppLocale, string>;
  availableLocales: AppLocale[];
  excerpt: string | null;
  eyebrow: string | null;
  readTime: string | null;
  publishedAt: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  showInList: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type BlogBlock = {
  id: string;
  postId: string;
  type: string;
  content: Record<string, unknown>;
  sortOrder: number;
};

export type BlogPostWithBlocks = BlogPost & {
  blocks: BlogBlock[];
};

// ── DB row shapes ─────────────────────────────────────────────────────────────

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  eyebrow: string | null;
  read_time: string | null;
  published_at: string | null;
  cover_image: string | null;
  is_featured: boolean;
  show_in_list: boolean;
  published: boolean;
  created_at: string;
  updated_at?: string | null;
  blog_blocks?: BlogBlockRow[];
  translations?: unknown;
};

type BlogPostTranslation = {
  title?: string;
  slug?: string;
  excerpt?: string;
  eyebrow?: string;
  read_time?: string;
};

type BlogBlockRow = {
  id: string;
  post_id: string;
  type: string;
  content: string | Record<string, unknown> | null;
  translations?: unknown;
  // column name varies — try all common conventions
  sort_order?: number;
  order?: number;
  position?: number;
  block_order?: number;
  created_at?: string;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapPost(row: BlogPostRow, locale: AppLocale): BlogPost {
  const tr = pickTranslation<BlogPostTranslation>(row.translations, locale);
  const slugs = Object.fromEntries(
    locales.map((l) => [
      l,
      l === defaultLocale
        ? row.slug
        : pickTranslation<BlogPostTranslation>(row.translations, l).slug || row.slug,
    ]),
  ) as Record<AppLocale, string>;

  return {
    id: row.id,
    title: tr.title || row.title,
    slug: slugs[locale],
    slugs,
    availableLocales: translatedLocales(row.translations, ["title", "slug", ...(row.excerpt ? ["excerpt"] : [])])
      .filter((l) => l === defaultLocale || (row.blog_blocks ?? []).every((block) => hasTranslatedBlock(block, l))),
    excerpt: tr.excerpt || row.excerpt || null,
    eyebrow: tr.eyebrow || row.eyebrow || null,
    readTime: tr.read_time || row.read_time || null,
    publishedAt: row.published_at ?? null,
    coverImage: row.cover_image ?? null,
    isFeatured: Boolean(row.is_featured),
    showInList: row.show_in_list !== false,
    published: Boolean(row.published),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

function mapBlock(row: BlogBlockRow, locale: AppLocale): BlogBlock {
  const sortOrder =
    row.position ?? row.sort_order ?? row.order ?? row.block_order ?? 0;

  // content may arrive as a plain string — try JSON parse first (image blocks),
  // fall back to wrapping as { text } for regular text blocks
  // A translated block stores its content in the same format as `content`.
  const rawContent =
    pickTranslation<{ content?: string | Record<string, unknown> }>(row.translations, locale).content ??
    row.content;
  let content: Record<string, unknown>;
  if (typeof rawContent === "string") {
    try {
      const parsed: unknown = JSON.parse(rawContent);
      content = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { text: rawContent };
    } catch {
      content = { text: rawContent };
    }
  } else {
    content = rawContent ?? {};
  }

  return {
    id: row.id,
    postId: row.post_id,
    type: row.type,
    content,
    sortOrder: Number(sortOrder),
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getBlogPosts(locale: AppLocale = defaultLocale): Promise<BlogPost[]> {
  const supabase = createSupabaseAdminClient();

  // "*" so the query keeps working before/after optional columns are added.
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, blog_blocks(type, content, translations)")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch blog posts: ${error.message}`);
  }

  return ((data ?? []) as BlogPostRow[]).map((row) => mapPost(row, locale));
}

export async function getBlogPostById(
  id: string,
  locale: AppLocale = defaultLocale,
): Promise<BlogPostWithBlocks | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, blog_blocks(*)")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch blog post "${id}": ${error.message}`);
  }

  if (!data) return null;

  const blocks = ((data.blog_blocks ?? []) as BlogBlockRow[])
    .map((row) => mapBlock(row, locale))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { ...mapPost(data as unknown as BlogPostRow, locale), blocks };
}

/**
 * Finds a post by its slug in `locale`. When the slug belongs to another
 * language, `redirectSlug` holds the slug to permanently redirect to.
 */
export async function findBlogPostBySlug(
  slug: string,
  locale: AppLocale = defaultLocale,
): Promise<{ post: BlogPostWithBlocks | null; redirectSlug: string | null }> {
  const posts = await getBlogPosts(locale);
  const exact = posts.find((post) => post.slug === slug);
  if (exact) {
    return { post: await getBlogPostById(exact.id, locale), redirectSlug: null };
  }
  const other = posts.find((post) => Object.values(post.slugs).includes(slug));
  return { post: null, redirectSlug: other?.slug ?? null };
}
