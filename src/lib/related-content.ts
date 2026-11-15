// Internal links between articles, FAQ answers, products and collections.
// Matching is by text, so new content gets links without anyone having to
// pick them by hand.

import type { Product } from "@/data/products";
import type { CollectionKey } from "@/lib/collections";

type Category = Product["category"][number];
type Localized = { availableLocales: readonly string[] };

const CATEGORY_PATTERNS: Record<Category, RegExp> = {
  face: /лице|бръчк|серум|маска за|мицеларн|слънцезащит|face|facial|wrinkle|serum|sunscreen|micellar/gi,
  hair: /коса|косъм|космит|скалп|шампоан|балсам|пърхот|hair|scalp|shampoo|conditioner|dandruff/gi,
  body: /тяло|душ гел|лосион|сапун|body|shower gel|lotion|soap/gi,
};

// Words that appear in almost every product name and say nothing about which one.
const GENERIC_NAME_WORDS = /^(шафран|saffron|adela|sunny|brami|натурал|natural|with|and)/;

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/** First letters of the distinctive words in a product name ("кремът" still matches "крем"). */
function nameStems(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 4 && !GENERIC_NAME_WORDS.test(word))
    .map((word) => word.slice(0, 5));
}

/** Product categories the text is about, most mentioned first. */
export function detectCategories(text: string): Category[] {
  return (Object.keys(CATEGORY_PATTERNS) as Category[])
    .map((category) => ({ category, hits: countMatches(text, CATEGORY_PATTERNS[category]) }))
    .filter(({ hits }) => hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map(({ category }) => category);
}

/** Products that fit `text`, best first. `named` = the text mentions the product itself. */
function rankProducts(text: string, products: Product[]): { product: Product; named: boolean }[] {
  const haystack = text.toLowerCase();
  const categoryHits = Object.fromEntries(
    (Object.keys(CATEGORY_PATTERNS) as Category[]).map((category) => [
      category,
      countMatches(haystack, CATEGORY_PATTERNS[category]),
    ]),
  ) as Record<Category, number>;
  const totalHits = Object.values(categoryHits).reduce((sum, hits) => sum + hits, 0) || 1;

  return products
    .map((product, index) => {
      const stems = nameStems(product.name);
      const nameScore = stems.length
        ? stems.filter((stem) => haystack.includes(stem)).length / stems.length
        : 0;
      const categoryScore = Math.max(0, ...product.category.map((c) => categoryHits[c] / totalHits));
      const exact = haystack.includes(product.name.toLowerCase());
      return {
        product,
        index,
        named: exact || nameScore >= 0.5,
        score: (exact ? 2 : 0) + nameScore + categoryScore,
      };
    })
    .filter(({ score }) => score > 0)
    // Saffron cosmetics are the SEO priority: among similar matches the
    // Saffron Adela Sunny products come first.
    .map((match) => (match.product.brand === "brami" ? { ...match, score: match.score + 0.25 } : match))
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

/**
 * Products that fit `text` best: the ones named in it first, then the ones
 * from the categories it talks about. Falls back to the first products of the
 * catalogue (the bestsellers), so a page never ends without product links.
 */
export function pickRelatedProducts(text: string, products: Product[], limit = 4): Product[] {
  const ranked = rankProducts(text, products).slice(0, limit);
  return ranked.length ? ranked.map(({ product }) => product) : products.slice(0, limit);
}

/**
 * Collections to link next to the related products: saffron cosmetics first,
 * then the saffron collection of each detected category.
 */
export function pickRelatedCollections(text: string): CollectionKey[] {
  return [
    "saffron",
    ...detectCategories(text).map((category) => (category === "face" ? "saffron-face" : category)),
  ];
}

/**
 * Articles about the given product categories, newest first (`posts` come
 * sorted by date). With `fill`, the newest other articles top the list up.
 */
export function pickRelatedPosts<T extends Localized & { title: string; excerpt: string | null }>(
  categories: readonly Category[],
  posts: T[],
  locale: string,
  { limit = 3, fill = false } = {},
): T[] {
  const available = posts.filter((post) => post.availableLocales.includes(locale));
  const matching = available.filter((post) => {
    const text = `${post.title} ${post.excerpt ?? ""}`;
    return categories.some((category) => countMatches(text, CATEGORY_PATTERNS[category]) > 0);
  });
  const rest = fill ? available.filter((post) => !matching.includes(post)) : [];
  return [...matching, ...rest].slice(0, limit);
}

/** Published questions about `product`: it is one of the two best name matches in the text. */
export function pickRelatedFaq<T extends Localized & { question: string; answer: string | null }>(
  product: Product,
  entries: T[],
  products: Product[],
  locale: string,
  limit = 4,
): T[] {
  return entries
    .filter((entry) => entry.availableLocales.includes(locale))
    .filter((entry) =>
      rankProducts(`${entry.question} ${(entry.answer ?? "").replace(/<[^>]+>/g, " ")}`, products)
        .filter(({ named }) => named)
        .slice(0, 2)
        .some((match) => match.product.id === product.id),
    )
    .slice(0, limit);
}
