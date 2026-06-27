import "server-only";

import { getProducts, type Product } from "@/data/products";

// Shared brand voice for every Claude agent. Mirrors the editorial guidance in
// src/lib/blog-generate.ts (saffron-based natural cosmetics, BG audience).
export const BRAND_CONTEXT = `Brami е марка за натурална козметика на базата на шафран и други натурални съставки (brami.shop). Продуктите са за лице, тяло и коса. Аудиторията са жени и мъже в България, които търсят натурална грижа и натурални алтернативи.

Тон: топъл, експертен, без агресивна продажба и без кликбейт. Винаги на български език.

Строги правила:
- НЕ давай медицински съвети, обещания или гаранции за лечение.
- Споменавай шафрана естествено, само когато е релевантно.
- Не измисляй цени, промоции или несъществуващи продукти — ползвай само подадените данни.`;

/** Compact catalog summary the agents use as grounding context. */
export async function getProductContext(limit = 30): Promise<string> {
  const products = await getProducts();
  if (!products.length) return "(няма продукти в каталога)";

  return products
    .slice(0, limit)
    .map((p: Product) => {
      const categories = p.category.join(", ") || "—";
      const highlights = p.checkboxInfo.slice(0, 3).join("; ");
      return `#${p.id} ${p.name} | марка: ${p.brand} | категории: ${categories} | ${p.packaging} | ${p.price}${highlights ? ` | акценти: ${highlights}` : ""}`;
    })
    .join("\n");
}
