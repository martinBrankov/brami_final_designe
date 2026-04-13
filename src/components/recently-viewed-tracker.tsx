"use client";

import { useEffect } from "react";

const RECENTLY_VIEWED_STORAGE_KEY = "brami-recently-viewed";
const MAX_RECENTLY_VIEWED_PRODUCTS = 8;

export function RecentlyViewedTracker({ productId }: { productId: number }) {
  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      const parsedIds = storedValue ? (JSON.parse(storedValue) as number[]) : [];
      const nextIds = [productId, ...parsedIds.filter((id) => id !== productId)].slice(
        0,
        MAX_RECENTLY_VIEWED_PRODUCTS,
      );

      window.localStorage.setItem(
        RECENTLY_VIEWED_STORAGE_KEY,
        JSON.stringify(nextIds),
      );
    } catch {
      // Ignore localStorage errors and keep product navigation functional.
    }
  }, [productId]);

  return null;
}

