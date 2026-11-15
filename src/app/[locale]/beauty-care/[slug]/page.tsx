import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link, permanentRedirect } from "@/i18n/navigation";
import { isAppLocale, locales, type AppLocale } from "@/i18n/routing";
import { RelatedProductsSection } from "@/components/related-products-section";
import { getProducts, stripHtml } from "@/data/products";
import { findBlogPostBySlug, getBlogPosts } from "@/lib/blog";
import type { BlogBlock, BlogPost } from "@/lib/blog";
import { pickRelatedCollections, pickRelatedProducts } from "@/lib/related-content";
import { DEFAULT_OG_IMAGES, OG_LOCALES, absoluteUrl, buildAlternates, jsonLdScript, localizedUrl } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

function articleHref(slug: string) {
  return { pathname: "/beauty-care/[slug]" as const, params: { slug } };
}

function articleAlternates(locale: AppLocale, post: BlogPost) {
  return buildAlternates(
    locale,
    Object.fromEntries(locales.map((l) => [l, articleHref(post.slugs[l])])) as Record<
      AppLocale,
      ReturnType<typeof articleHref>
    >,
    post.availableLocales,
  );
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const { post } = await findBlogPostBySlug(decodeURIComponent(slug), locale);

  if (!post) return {};
  const alternates = articleAlternates(locale, post);

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates,
    ...(!post.availableLocales.includes(locale) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "article",
      title: `${post.title} | Brami`,
      description: post.excerpt ?? undefined,
      url: alternates.canonical as string,
      locale: OG_LOCALES[locale],
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverImage ? [{ url: post.coverImage, alt: post.title }] : DEFAULT_OG_IMAGES,
    },
  };
}

// ── Block renderer ────────────────────────────────────────────────────────────

function extractText(content: Record<string, unknown>): string {
  // try common key names a CMS might use
  const val =
    content.text ??
    content.body ??
    content.value ??
    content.content ??
    content.paragraph ??
    content.html ??
    content.markdown;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) return extractText(val as Record<string, unknown>);
  return "";
}

function Block({ block }: { block: BlogBlock }) {
  const c = block.content;

  switch (block.type) {
    case "paragraph":
    case "text": {
      const raw = typeof c.text === "string" ? c.text : extractText(c);
      if (!raw) return null;
      if (raw.trimStart().startsWith("<")) {
        return (
          <div
            className="[&_h2]:font-serif [&_h2]:text-3xl [&_h2]:leading-snug [&_h2]:text-[#432855] [&_h3]:font-serif [&_h3]:text-2xl [&_h3]:leading-snug [&_h3]:text-[#432855] [&_p]:text-base [&_p]:leading-8 [&_p]:text-[#5f4b73] [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:text-base [&_li]:leading-7 [&_li]:text-[#5f4b73] [&_li>p]:m-0 [&_ul_ul]:mt-1 [&_ul_ul]:list-[circle] [&_ul_ul]:pl-4"
            dangerouslySetInnerHTML={{ __html: raw }}
          />
        );
      }
      return <p className="text-base leading-8 text-[#5f4b73]">{raw}</p>;
    }

    case "heading":
    case "header":
    case "section_heading": {
      const text = extractText(c);
      const level = (c.level as number) ?? (c.size as number) ?? 2;
      if (!text) return null;
      if (level >= 3) {
        return <h3 className="font-serif text-2xl leading-snug text-[#432855]">{text}</h3>;
      }
      return <h2 className="font-serif text-3xl leading-snug text-[#432855]">{text}</h2>;
    }

    case "image":
    case "photo": {
      const src = (c.src ?? c.url ?? c.image_url) as string | undefined;
      const alt = ((c.alt ?? c.caption ?? "") as string);
      const caption = (c.caption ?? c.description) as string | undefined;
      if (!src) return null;
      const resolvedSrc = src;
      return (
        <figure className="my-2">
          <div className="relative h-[280px] overflow-hidden rounded-[16px] sm:h-[360px]">
            <Image
              src={resolvedSrc ?? src}
              alt={alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
          {caption ? (
            <figcaption className="mt-3 text-center text-sm text-[#8f72a7]">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }

    case "quote":
    case "blockquote": {
      const text = extractText(c);
      const author = (c.author ?? c.cite) as string | undefined;
      if (!text) return null;
      return (
        <blockquote className="border-l-4 border-[#c9a8d8] py-1 pl-6">
          <p className="font-serif text-xl italic leading-8 text-[#432855]">{text}</p>
          {author ? (
            <cite className="mt-2 block text-sm not-italic text-[#8f72a7]">— {author}</cite>
          ) : null}
        </blockquote>
      );
    }

    case "divider":
    case "separator":
    case "hr":
      return <hr className="border-[#eadde4]" />;

    default: {
      // fallback — show any text-like content so nothing is silently lost
      const text = extractText(c);
      if (!text) return null;
      return <p className="text-base leading-8 text-[#5f4b73]">{text}</p>;
    }
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null, locale: AppLocale) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-GB" : "bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);
  const { post, redirectSlug } = await findBlogPostBySlug(decodeURIComponent(slug), locale);

  if (!post) {
    if (redirectSlug) permanentRedirect({ href: articleHref(redirectSlug), locale });
    notFound();
  }

  const [t, tNav, products, allPosts] = await Promise.all([
    getTranslations({ locale, namespace: "BeautyCare" }),
    getTranslations({ locale, namespace: "Nav" }),
    getProducts(locale),
    getBlogPosts(locale),
  ]);
  const articleText = stripHtml(
    [post.title, post.excerpt ?? "", ...post.blocks.map((block) => extractText(block.content))].join(" "),
  );
  const morePosts = allPosts
    .filter((other) => other.id !== post.id && other.availableLocales.includes(locale))
    .slice(0, 3);
  const articleUrl = localizedUrl(locale, articleHref(post.slug));
  const articleJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${articleUrl}#article`,
      headline: post.title,
      description: post.excerpt ?? undefined,
      url: articleUrl,
      mainEntityOfPage: articleUrl,
      inLanguage: locale,
      datePublished: post.publishedAt ?? post.createdAt,
      dateModified: post.updatedAt ?? post.publishedAt ?? post.createdAt,
      image: post.coverImage ? [absoluteUrl(post.coverImage)] : undefined,
      author: { "@type": "Organization", name: "Brami", "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: tNav("home"), item: localizedUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name: tNav("beautyCare"), item: localizedUrl(locale, "/beauty-care") },
        { "@type": "ListItem", position: 3, name: post.title, item: articleUrl },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf9_0%,#f7eef4_44%,#f5edf5_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(articleJsonLd)} />
      {/* Breadcrumb */}
      <section className="h-[49px] w-full border-b border-[#ece6f1] bg-white">
        <div className="flex h-full min-w-0 items-center px-6 sm:px-10 lg:px-14">
          <nav
            aria-label={t("breadcrumb")}
            className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[13px] font-medium text-[#7a688d]"
          >
            <Link href="/" className="shrink-0 transition hover:text-[#432855]">
              {tNav("home")}
            </Link>
            <span className="shrink-0 text-[#b7a8c3]">/</span>
            <Link href="/beauty-care" className="shrink-0 transition hover:text-[#432855]">
              {tNav("beautyCare")}
            </Link>
            <span className="shrink-0 text-[#b7a8c3]">/</span>
            <span className="min-w-0 truncate text-[#5f4b73]">{post.title}</span>
          </nav>
        </div>
      </section>

      {/* Header */}
      <section className="border-b border-[#eadde4] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <div className="max-w-4xl">
            {post.eyebrow ? (
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
                {post.eyebrow}
              </p>
            ) : null}
            <h1 className="mt-4 font-serif text-4xl leading-tight text-[#432855] sm:text-5xl">
              {post.title}
            </h1>
            {post.excerpt ? (
              <p className="mt-6 text-lg leading-8 text-[#6b587f]">{post.excerpt}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#8f72a7]">
              {post.publishedAt ? <span>{formatDate(post.publishedAt, locale)}</span> : null}
              {post.readTime ? (
                <>
                  {post.publishedAt ? <span aria-hidden="true">·</span> : null}
                  <span>{t("readTime", { time: post.readTime })}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <article>
        {/* Cover image */}
        {(() => {
          const coverSrc = post.coverImage;
          return coverSrc ? (
            <section className="border-b border-[#eadde4]">
              <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
                <div className="relative h-[320px] overflow-hidden rounded-[20px] sm:h-[440px]">
                  <Image
                    src={coverSrc}
                    alt={post.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 960px"
                  />
                </div>
              </div>
            </section>
          ) : null;
        })()}

        {/* Blocks */}
        {post.blocks.length > 0 ? (
          <section className="border-b border-[#eadde4]">
            <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-14">
              <div className="space-y-8">
                {post.blocks.map((block) => (
                  <Block key={block.id} block={block} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </article>

      <RelatedProductsSection
        locale={locale}
        title={t("relatedProducts")}
        products={pickRelatedProducts(articleText, products)}
        collections={pickRelatedCollections(articleText)}
      />

      {morePosts.length > 0 ? (
        <section className="border-b border-[#eadde4]">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-14">
            <h2 className="font-serif text-2xl leading-snug text-[#432855] sm:text-3xl">
              {t("moreArticles")}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {morePosts.map((other) => (
                <li key={other.id}>
                  <Link
                    href={articleHref(other.slug)}
                    className="block h-full rounded-[20px] border border-[#eadde4] bg-white px-5 py-5 transition hover:bg-[#faf7fc]"
                  >
                    <span className="font-serif text-lg leading-snug text-[#432855]">{other.title}</span>
                    {other.excerpt ? (
                      <span className="mt-2 line-clamp-3 block text-sm leading-6 text-[#6b587f]">
                        {other.excerpt}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}
