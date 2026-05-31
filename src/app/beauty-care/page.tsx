import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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
  dbUrl: string | null;
  alt: string;
  className: string;
  priority?: boolean;
}) {
  if (!dbUrl) {
    return <div className={`${className} bg-[#f0e8f0]`} />;
  }
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
  return (
    <Link
      href={`/beauty-care/${post.slug}`}
      className="group overflow-hidden rounded-[34px] border border-[#eadde4] bg-white shadow-[0_24px_80px_rgba(67,40,85,0.08)]"
    >
      <div className="relative h-[180px] overflow-hidden sm:h-[220px]">
        <CoverImage dbUrl={post.coverImage} alt={post.title} className="transition duration-500 group-hover:scale-[1.03]" priority />
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

function ArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/beauty-care/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-[#eadde4] bg-white shadow-[0_20px_60px_rgba(67,40,85,0.06)] transition hover:shadow-[0_24px_70px_rgba(67,40,85,0.11)]"
    >
      <div className="relative h-[220px] overflow-hidden">
        <CoverImage dbUrl={post.coverImage} alt={post.title} className="transition duration-500 group-hover:scale-[1.03]" />
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

export default async function BeautyCarePage() {
  const posts = await getBlogPosts();

  const featuredPost = posts.find((p) => p.isFeatured) ?? posts[0] ?? null;
  const listPosts = posts.filter((p) => !p.isFeatured || p.showInList);

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
            {listPosts.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      <div>
        <ArticleSubscriptionForm />
      </div>
    </main>
  );
}
