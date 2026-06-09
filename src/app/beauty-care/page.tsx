import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ArticleSubscriptionForm } from "@/components/article-subscription-form";
import { getBlogPosts } from "@/lib/blog";
import type { BlogPost } from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Красота & грижа",
  description:
    "Статии за козметика, натурални съставки и ритуали за ежедневна грижа от Brami.",
  alternates: { canonical: "/beauty-care" },
  openGraph: {
    title: "Красота & грижа | Brami",
    description:
      "Открий селекция от статии за шафран, натурална козметика и ежедневни ритуали за красота.",
    url: "/beauty-care",
  },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CoverImage({
  dbUrl,
  alt,
  className,
  priority = false,
}: {
  dbUrl: string;
  alt: string;
  className: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={dbUrl}
      alt={alt}
      fill
      className={`object-cover ${className}`}
      priority={priority}
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  );
}

function FeaturedCard({ post }: { post: BlogPost }) {
  if (post.coverImage) {
    return (
      <Link
        href={`/beauty-care/${post.slug}`}
        className="group overflow-hidden rounded-[34px] border border-[#eadde4] bg-white shadow-[0_24px_80px_rgba(67,40,85,0.08)]"
      >
        <div className="relative h-[180px] overflow-hidden sm:h-[220px]">
          <CoverImage
            dbUrl={post.coverImage}
            alt={post.title}
            className="transition duration-500 group-hover:scale-[1.03]"
            priority
          />
        </div>
        <div className="px-6 py-5 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
            Акцент на седмицата
          </p>
          <h2 className="mt-3 font-serif text-2xl leading-snug text-[#432855]">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="mt-3 text-sm leading-7 text-[#6b587f]">{post.excerpt}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#8f72a7]">
            {post.eyebrow ? <span>{post.eyebrow}</span> : null}
            {post.readTime ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{post.readTime} четене</span>
              </>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/beauty-care/${post.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#9f79ac_0%,#5a3274_60%,#432855_100%)] p-7 text-white shadow-[0_24px_80px_rgba(67,40,85,0.18)] sm:p-9"
    >
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-10 -left-6 h-44 w-44 rounded-full bg-white/5 blur-2xl"
        aria-hidden="true"
      />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
        Акцент на седмицата
      </p>
      <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-[2.25rem]">
        {post.title}
      </h2>
      {post.excerpt ? (
        <p className="mt-4 text-sm leading-7 text-white/85 sm:text-base">
          {post.excerpt}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
        <div className="flex flex-wrap items-center gap-3">
          {post.eyebrow ? <span>{post.eyebrow}</span> : null}
          {post.readTime ? (
            <>
              {post.eyebrow ? <span aria-hidden="true">·</span> : null}
              <span>{post.readTime} четене</span>
            </>
          ) : null}
        </div>
        <span className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.12em] text-white transition group-hover:text-white/90">
          Прочети →
        </span>
      </div>
    </Link>
  );
}

function ArticleCard({ post }: { post: BlogPost }) {
  if (post.coverImage) {
    return (
      <Link
        href={`/beauty-care/${post.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-[#eadde4] bg-white shadow-[0_20px_60px_rgba(67,40,85,0.06)] transition hover:shadow-[0_24px_70px_rgba(67,40,85,0.11)]"
      >
        <div className="relative h-[220px] overflow-hidden">
          <CoverImage
            dbUrl={post.coverImage}
            alt={post.title}
            className="transition duration-500 group-hover:scale-[1.03]"
          />
        </div>

        <div className="flex flex-1 flex-col px-6 py-6">
          {post.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f72a7]">
              {post.eyebrow}
            </p>
          ) : null}

          <h3 className="mt-3 font-serif text-xl leading-snug text-[#432855]">
            {post.title}
          </h3>

          {post.excerpt ? (
            <p className="mt-3 flex-1 text-sm leading-7 text-[#6b587f] line-clamp-3">
              {post.excerpt}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between">
            <span className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.12em] text-[#6c3f8d] transition group-hover:text-[#432855]">
              Прочети
            </span>
            <div className="flex items-center gap-2 text-xs text-[#9e8aae]">
              {post.readTime ? <span>{post.readTime}</span> : null}
              {post.publishedAt ? (
                <>
                  {post.readTime ? <span aria-hidden="true">·</span> : null}
                  <span>{formatDate(post.publishedAt)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/beauty-care/${post.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[30px] border border-[#e2d3e6] bg-[linear-gradient(160deg,#f9f2fa_0%,#efe4f0_55%,#e6d6e9_100%)] p-7 shadow-[0_20px_60px_rgba(67,40,85,0.06)] transition hover:shadow-[0_24px_70px_rgba(67,40,85,0.13)]"
    >
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/60 blur-2xl"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-[#cbb1d4]/30 blur-3xl"
        aria-hidden="true"
      />
      {post.eyebrow ? (
        <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-[#8f72a7]">
          {post.eyebrow}
        </p>
      ) : null}

      <h3 className="relative mt-3 font-serif text-2xl leading-tight text-[#432855]">
        {post.title}
      </h3>

      {post.excerpt ? (
        <p className="relative mt-3 flex-1 text-sm leading-7 text-[#6b587f] line-clamp-4">
          {post.excerpt}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <div className="relative mt-6 flex items-center justify-between">
        <span className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.12em] text-[#6c3f8d] transition group-hover:text-[#432855]">
          Прочети →
        </span>
        <div className="flex items-center gap-2 text-xs text-[#9e8aae]">
          {post.readTime ? <span>{post.readTime}</span> : null}
          {post.publishedAt ? (
            <>
              {post.readTime ? <span aria-hidden="true">·</span> : null}
              <span>{formatDate(post.publishedAt)}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function CompactArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/beauty-care/${post.slug}`}
      className="group relative flex flex-1 flex-col overflow-hidden rounded-[22px] border border-[#e2d3e6] bg-[linear-gradient(160deg,#f9f2fa_0%,#efe4f0_55%,#e6d6e9_100%)] p-5 shadow-[0_14px_40px_rgba(67,40,85,0.05)] transition hover:shadow-[0_18px_50px_rgba(67,40,85,0.10)]"
    >
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/60 blur-2xl"
        aria-hidden="true"
      />
      {post.eyebrow ? (
        <p className="relative text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f72a7]">
          {post.eyebrow}
        </p>
      ) : null}
      <h3 className="relative mt-1.5 font-serif text-lg leading-snug text-[#432855]">
        {post.title}
      </h3>
      {post.excerpt ? (
        <p className="relative mt-2 flex-1 text-xs leading-6 text-[#6b587f] line-clamp-2">
          {post.excerpt}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <div className="relative mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6c3f8d] transition group-hover:text-[#432855]">
          Прочети →
        </span>
        <div className="flex items-center gap-2 text-[10px] text-[#9e8aae]">
          {post.readTime ? <span>{post.readTime}</span> : null}
          {post.publishedAt ? (
            <>
              {post.readTime ? <span aria-hidden="true">·</span> : null}
              <span>{formatDate(post.publishedAt)}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function PairCell({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="flex h-full flex-col gap-4">
      {posts.map((post) => (
        <CompactArticleCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function renderListItems(posts: BlogPost[]): ReactNode[] {
  const items: ReactNode[] = [];
  let buffer: BlogPost[] = [];

  function flushBuffer() {
    if (buffer.length === 0) return;
    let i = 0;
    while (i + 1 < buffer.length) {
      const a = buffer[i];
      const b = buffer[i + 1];
      items.push(<PairCell key={`pair-${a.id}-${b.id}`} posts={[a, b]} />);
      i += 2;
    }
    if (i < buffer.length) {
      const lone = buffer[i];
      items.push(<ArticleCard key={lone.id} post={lone} />);
    }
    buffer = [];
  }

  for (const post of posts) {
    if (post.coverImage) {
      flushBuffer();
      items.push(<ArticleCard key={post.id} post={post} />);
    } else {
      buffer.push(post);
    }
  }
  flushBuffer();

  return items;
}

export default async function BeautyCarePage() {
  const posts = await getBlogPosts();

  const featuredPost = posts.find((p) => p.isFeatured) ?? posts[0] ?? null;
  const listPosts = posts.filter((p) => !p.isFeatured || p.showInList);
  const listItems = renderListItems(listPosts);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf9_0%,#f8f1f7_44%,#f5edf5_100%)]">
      <section className="border-b border-[#eadde4] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.88fr] lg:items-start">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
                Онлайн блог
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-[#432855] sm:text-5xl lg:text-[4rem]">
                Красота & грижа
              </h1>
              <p className="mt-6 text-lg leading-8 text-[#6b587f]">
                Място за статии за натурална козметика, активни съставки и
                малки ритуали, които правят ежедневната грижа по-осъзната и
                по-приятна.
              </p>
            </div>

            {featuredPost ? <FeaturedCard post={featuredPost} /> : null}
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-14">
          <p className="text-center text-lg text-[#6b587f]">
            Скоро ще публикуваме нови статии. Абонирай се за да не пропуснеш.
          </p>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
              Последни публикации
            </p>
            <h2 className="mt-3 font-serif text-3xl text-[#432855] sm:text-4xl">
              Подбрани теми за красота, грижа и натурални съставки
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listItems}
          </div>
        </section>
      )}

      <div>
        <ArticleSubscriptionForm />
      </div>
    </main>
  );
}
