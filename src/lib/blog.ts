import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  eyebrow: string | null;
  readTime: string | null;
  publishedAt: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  showInList: boolean;
  published: boolean;
  createdAt: string;
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
};

type BlogBlockRow = {
  id: string;
  post_id: string;
  type: string;
  content: string | Record<string, unknown> | null;
  // column name varies — try all common conventions
  sort_order?: number;
  order?: number;
  position?: number;
  block_order?: number;
  created_at?: string;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapPost(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    eyebrow: row.eyebrow ?? null,
    readTime: row.read_time ?? null,
    publishedAt: row.published_at ?? null,
    coverImage: row.cover_image ?? null,
    isFeatured: Boolean(row.is_featured),
    showInList: row.show_in_list !== false,
    published: Boolean(row.published),
    createdAt: row.created_at,
  };
}

function mapBlock(row: BlogBlockRow): BlogBlock {
  const sortOrder =
    row.position ?? row.sort_order ?? row.order ?? row.block_order ?? 0;

  // content may arrive as a plain string — try JSON parse first (image blocks),
  // fall back to wrapping as { text } for regular text blocks
  let content: Record<string, unknown>;
  if (typeof row.content === "string") {
    try {
      const parsed: unknown = JSON.parse(row.content);
      content = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { text: row.content };
    } catch {
      content = { text: row.content };
    }
  } else {
    content = row.content ?? {};
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

export async function getBlogPosts(): Promise<BlogPost[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, excerpt, eyebrow, read_time, published_at, cover_image, is_featured, show_in_list, published, created_at",
    )
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch blog posts: ${error.message}`);
  }

  return ((data ?? []) as BlogPostRow[]).map(mapPost);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostWithBlocks | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      `id, title, slug, excerpt, eyebrow, read_time, published_at, cover_image, is_featured, show_in_list, published, created_at,
       blog_blocks(*)`,
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch blog post "${slug}": ${error.message}`);
  }

  if (!data) return null;

  const blocks = ((data.blog_blocks ?? []) as BlogBlockRow[])
    .map(mapBlock)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { ...mapPost(data as unknown as BlogPostRow), blocks };
}

export async function getBlogSlugs(): Promise<string[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("published", true);

  if (error) return [];
  return (data ?? []).map((row: { slug: string }) => row.slug);
}
