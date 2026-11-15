import type { MetadataRoute } from "next";

import { getProducts } from "@/data/products";
import { locales, type AppLocale } from "@/i18n/routing";
import { getBlogPosts } from "@/lib/blog";
import { COLLECTION_KEYS, COLLECTION_PATHS } from "@/lib/collections";
import { getPublishedFaqEntries } from "@/lib/faq";
import { absoluteUrl, localizedUrl, type LocalizedHref } from "@/lib/seo";

// Slugs and translation availability can change through the admin or an import.
export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

/**
 * One <url> per locale, each listing every language version as an hreflang
 * alternate. `hrefFor` returns the href in a given locale (slugs differ).
 */
function localizedEntries(
  hrefFor: (locale: AppLocale) => LocalizedHref,
  extra: Omit<Entry, "url" | "alternates"> = {},
  availableLocales: readonly AppLocale[] = locales,
): Entry[] {
  const languages = Object.fromEntries(
    availableLocales.map((locale) => [locale, localizedUrl(locale, hrefFor(locale))]),
  );
  return availableLocales.map((locale) => ({
    url: languages[locale],
    alternates: { languages },
    ...extra,
  }));
}

function imageUrl(image: unknown): string | null {
  return typeof image === "object" && image !== null && "src" in image
    ? absoluteUrl(String((image as { src: string }).src))
    : null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, blogPosts, faqEntries] = await Promise.all([
    getProducts(),
    getBlogPosts(),
    getPublishedFaqEntries(),
  ]);

  // Static pages: no lastModified, because a date that changes on every
  // request is ignored by search engines.
  const staticPages: Array<[LocalizedHref, number, Entry["changeFrequency"]]> = [
    ["/", 1, "weekly"],
    ["/products", 0.9, "daily"],
    ["/about", 0.7, "monthly"],
    ["/beauty-care", 0.75, "weekly"],
    ["/faq", 0.7, "weekly"],
    ["/partners", 0.6, "monthly"],
    ["/contact", 0.6, "monthly"],
    ["/delivery-returns", 0.5, "monthly"],
    ["/terms", 0.4, "yearly"],
    ["/privacy-policy", 0.4, "yearly"],
  ];

  return [
    ...staticPages.flatMap(([href, priority, changeFrequency]) =>
      localizedEntries(() => href, { priority, changeFrequency }),
    ),
    ...COLLECTION_KEYS.flatMap((key) =>
      localizedEntries(() => COLLECTION_PATHS[key], { priority: 0.85, changeFrequency: "weekly" }),
    ),
    ...products.flatMap((product) =>
      localizedEntries(
        (locale) => ({ pathname: "/products/[slug]", params: { slug: product.slugs[locale] } }),
        {
          priority: 0.8,
          changeFrequency: "weekly",
          ...(product.updatedAt ? { lastModified: new Date(product.updatedAt) } : {}),
          images: product.imageSrc.map(imageUrl).filter((url): url is string => url !== null),
        },
        product.availableLocales,
      ),
    ),
    ...blogPosts.flatMap((post) =>
      localizedEntries(
        (locale) => ({ pathname: "/beauty-care/[slug]", params: { slug: post.slugs[locale] } }),
        {
          priority: 0.65,
          changeFrequency: "monthly",
          lastModified: new Date(post.updatedAt ?? post.publishedAt ?? post.createdAt),
          ...(post.coverImage ? { images: [absoluteUrl(post.coverImage)] } : {}),
        },
        post.availableLocales,
      ),
    ),
    ...faqEntries.flatMap((entry) =>
      localizedEntries(
        (locale) => ({ pathname: "/faq/[slug]", params: { slug: entry.slugs[locale] } }),
        { priority: 0.55, changeFrequency: "monthly", lastModified: new Date(entry.updatedAt) },
        entry.availableLocales,
      ),
    ),
  ];
}
