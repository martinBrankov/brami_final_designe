"use client";

import { useEffect, useMemo, useState } from "react";

import { ProductCarouselSection } from "@/components/product-carousel-section";
import { products } from "@/data/products";
import type { Product } from "@/data/products";

const RECENTLY_VIEWED_STORAGE_KEY = "brami-recently-viewed";

export function RecentlyViewedSection() {
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);

  const viewedProducts = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is Product => product !== undefined),
    [recentlyViewedIds],
  );

  useEffect(() => {
    const readRecentlyViewed = () => {
      try {
        const storedValue = window.localStorage.getItem(
          RECENTLY_VIEWED_STORAGE_KEY,
        );
        const parsedIds = storedValue ? (JSON.parse(storedValue) as number[]) : [];
        setRecentlyViewedIds(parsedIds);
      } catch {
        setRecentlyViewedIds([]);
      }
    };

    readRecentlyViewed();
    window.addEventListener("storage", readRecentlyViewed);

    return () => {
      window.removeEventListener("storage", readRecentlyViewed);
    };
  }, []);

  return (
    <ProductCarouselSection
      title="Разгледани продукти"
      titleClassName="max-w-[10ch] sm:max-w-none"
      products={viewedProducts}
    />
  );
}
