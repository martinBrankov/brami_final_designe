import "server-only";

import { after } from "next/server";

import { getProductHref, getProducts } from "@/data/products";
import { locales, type AppLocale } from "@/i18n/routing";
import { getBlogPosts } from "@/lib/blog";
import { getPublishedFaqEntries } from "@/lib/faq";
import { localizedUrl, type LocalizedHref } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

// IndexNow (https://www.indexnow.org) tells Bing — and through it ChatGPT
// search and Copilot — that a URL changed, so it is recrawled within minutes.
// The key is public by design: search engines verify it at /indexnow-key.txt.
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "9ba0b37c0a2dcc19bbb27f91255bd249";
const ENDPOINT = "https://api.indexnow.org/indexnow";

function isEnabled() {
  // Only the live site: never from localhost, previews or builds.
  const host = new URL(SITE_URL).hostname;
  return (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview" &&
    host !== "localhost" &&
    !host.startsWith("127.") &&
    !host.startsWith("192.168.")
  );
}

async function submit(urls: string[]) {
  const urlList = [...new Set(urls)].filter((url) => url.startsWith(SITE_URL));
  if (!urlList.length) return;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).hostname,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/indexnow-key.txt`,
        urlList,
      }),
    });
    // 200 = accepted, 202 = accepted, key validation pending.
    if (response.status !== 200 && response.status !== 202) {
      console.error(`[indexnow] ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.error("[indexnow] request failed", error);
  }
}

/**
 * Schedules an IndexNow ping after the response is sent, so admin saves are
 * never slowed down or failed by it. `getUrls` runs after the change, too.
 */
export function notifyIndexNow(getUrls: () => Promise<string[]> | string[]) {
  if (!isEnabled()) return;
  after(async () => {
    try {
      await submit(await getUrls());
    } catch (error) {
      console.error("[indexnow] could not build URL list", error);
    }
  });
}

function urlsFor(hrefFor: (locale: AppLocale) => LocalizedHref, availableLocales: readonly AppLocale[] = locales) {
  return availableLocales.map((locale) => localizedUrl(locale, hrefFor(locale)));
}

const listUrls = (href: LocalizedHref) => urlsFor(() => href);

/** Current URLs of a product in every published language, plus the product list. */
export async function getProductUrls(productId: number): Promise<string[]> {
  const product = (await getProducts()).find((p) => p.id === productId);
  return [
    ...listUrls("/products"),
    ...(product
      ? urlsFor((locale) => getProductHref({ slug: product.slugs[locale] }), product.availableLocales)
      : []),
  ];
}

/** Current URLs of a published article (none when unpublished), plus the blog list. */
export async function getBlogPostUrls(postId: string): Promise<string[]> {
  const post = (await getBlogPosts()).find((p) => p.id === postId);
  return [
    ...listUrls("/beauty-care"),
    ...(post
      ? urlsFor(
          (locale) => ({ pathname: "/beauty-care/[slug]", params: { slug: post.slugs[locale] } }),
          post.availableLocales,
        )
      : []),
  ];
}

/** Current URLs of a published FAQ answer (none when unpublished), plus the FAQ list. */
export async function getFaqEntryUrls(entryId: string): Promise<string[]> {
  const entry = (await getPublishedFaqEntries()).find((e) => e.id === entryId);
  return [
    ...listUrls("/faq"),
    ...(entry
      ? urlsFor(
          (locale) => ({ pathname: "/faq/[slug]", params: { slug: entry.slugs[locale] } }),
          entry.availableLocales,
        )
      : []),
  ];
}
