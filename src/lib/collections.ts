// Landing pages that group products for a search intent ("козметика за лице",
// "козметика с шафран", …). Texts live in messages/<locale>/products.json
// under "Collections.<key>"; URLs are configured in src/i18n/routing.ts.

import type { Product } from "@/data/products";

export const COLLECTION_KEYS = ["face", "hair", "body", "saffron", "bulgarian"] as const;
export type CollectionKey = (typeof COLLECTION_KEYS)[number];

export const COLLECTION_PATHS = {
  face: "/collections/face",
  hair: "/collections/hair",
  body: "/collections/body",
  saffron: "/collections/saffron",
  bulgarian: "/collections/bulgarian",
} as const satisfies Record<CollectionKey, string>;

/** Category landing page for each product category. */
export const CATEGORY_COLLECTIONS = {
  face: COLLECTION_PATHS.face,
  hair: COLLECTION_PATHS.hair,
  body: COLLECTION_PATHS.body,
} as const satisfies Record<Product["category"][number], string>;

const SAFFRON_PATTERN = /шафран|saffron|crocus/i;
// Brands made in Bulgaria. "brami" is the Saffron Adela Sunny line.
const BULGARIAN_BRANDS: Product["brand"][] = ["brami", "Voditsa", "Shafpol Beauty"];

export function isCollectionKey(value: string): value is CollectionKey {
  return (COLLECTION_KEYS as readonly string[]).includes(value);
}

export function filterCollectionProducts(key: CollectionKey, products: Product[]): Product[] {
  switch (key) {
    case "face":
    case "hair":
    case "body":
      return products.filter((product) => product.category.includes(key));
    case "saffron":
      return products.filter(
        (product) =>
          product.brand === "brami" ||
          SAFFRON_PATTERN.test(`${product.name} ${product.slugs.bg} ${product.description}`),
      );
    case "bulgarian":
      return products.filter((product) => BULGARIAN_BRANDS.includes(product.brand));
  }
}
