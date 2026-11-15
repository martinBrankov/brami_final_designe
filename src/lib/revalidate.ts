import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Public pages are cached (see `revalidate` in src/app/[locale]/layout.tsx).
 * Call this after any change to products, articles, FAQ or reviews so the
 * visitors — and the crawlers — see it at once instead of after the cache
 * expires. The catalogue is in the layout, so every page is refreshed.
 */
export function revalidatePublicContent() {
  revalidatePath("/", "layout");
}
