import { getTranslations } from "next-intl/server";

import { ProductCard } from "@/components/product-card";
import { getProductBadgeLabel, toClientProduct, type Product } from "@/data/products";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { COLLECTION_PATHS, type CollectionKey } from "@/lib/collections";

type RelatedProductsSectionProps = {
  locale: AppLocale;
  title: string;
  products: Product[];
  collections: CollectionKey[];
};

/** Product cards and collection links under an article or a FAQ answer. */
export async function RelatedProductsSection({
  locale,
  title,
  products,
  collections,
}: RelatedProductsSectionProps) {
  if (!products.length) return null;
  const [tProduct, tCollections] = await Promise.all([
    getTranslations({ locale, namespace: "Product" }),
    getTranslations({ locale, namespace: "Collections" }),
  ]);

  return (
    <section className="border-b border-[#eadde4] bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-14">
        <h2 className="font-serif text-2xl leading-snug text-[#432855] sm:text-3xl">{title}</h2>
        <div className="mt-6 grid grid-cols-2 gap-x-[10px] gap-y-3 min-[640px]:flex min-[640px]:flex-wrap min-[640px]:gap-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={toClientProduct(product)}
              badge={getProductBadgeLabel(product.badge, tProduct, product.discountPercent)}
              compact
              className="w-full max-w-[168px] justify-self-center min-[640px]:w-[198px] min-[640px]:max-w-[198px]"
            />
          ))}
        </div>
        <nav aria-label={tCollections("moreCollections")} className="mt-8 flex flex-wrap gap-2">
          {collections.map((key) => (
            <Link
              key={key}
              href={COLLECTION_PATHS[key]}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#d8d0de] bg-white px-4 text-sm font-medium text-[#432855] transition hover:bg-[#faf7fc]"
            >
              {tCollections(`${key}.title`)}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
