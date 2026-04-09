"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useFavorites } from "@/components/favorites-provider";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewedSection } from "@/components/recently-viewed-section";
import {
  getProductBadgeLabel,
  products,
  type Product,
} from "@/data/products";

const categoryOptions: Array<{
  value: Product["category"][number] | "all";
  label: string;
}> = [
  { value: "all", label: "\u0412\u0441\u0438\u0447\u043a\u0438" },
  { value: "face", label: "\u041b\u0438\u0446\u0435" },
  { value: "body", label: "\u0422\u044f\u043b\u043e" },
  { value: "hair", label: "\u041a\u043e\u0441\u0430" },
];

const brandOptions: Array<{
  value: Product["brand"] | "all";
  label: string;
}> = [
  { value: "all", label: "\u0412\u0441\u0438\u0447\u043a\u0438" },
  { value: "brami", label: "Brami" },
  { value: "vodica", label: "Vodica" },
];

const badgeOptions: Array<{
  value: Product["badge"] | "all";
  label: string;
}> = [
  { value: "all", label: "\u0412\u0441\u0438\u0447\u043a\u0438" },
  { value: "bestseller", label: "\u041d\u0430\u0439-\u043f\u0440\u043e\u0434\u0430\u0432\u0430\u043d\u0438" },
  { value: "sale", label: "\u041e\u0442\u0441\u0442\u044a\u043f\u043a\u0430" },
  { value: "new", label: getProductBadgeLabel("new") },
  { value: "favorite", label: getProductBadgeLabel("favorite") },
  { value: "featured", label: getProductBadgeLabel("featured") },
];

function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 5.5h13" />
      <path d="M6.5 10h10" />
      <path d="M9.5 14.5h7" />
      <circle cx="5.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 8 4 4 4-4" />
    </svg>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { favoriteIds, hasHydrated } = useFavorites();
  const [selectedCategory, setSelectedCategory] =
    useState<Product["category"][number] | "all">("all");
  const [selectedBrand, setSelectedBrand] =
    useState<Product["brand"] | "all">("all");
  const [selectedBadge, setSelectedBadge] =
    useState<Product["badge"] | "all">("all");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    const categoryParam = searchParams.get("category");

    setQuery(searchParams.get("q")?.trim().toLowerCase() ?? "");
    setFavoritesOnly(searchParams.get("favorites") === "1");

    if (
      categoryParam === "face" ||
      categoryParam === "body" ||
      categoryParam === "hair"
    ) {
      setSelectedCategory(categoryParam);
      return;
    }

    setSelectedCategory("all");
  }, [searchParams]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryMatches =
          selectedCategory === "all" ||
          product.category.includes(selectedCategory);
        const brandMatches =
          selectedBrand === "all" || product.brand === selectedBrand;
        const badgeMatches =
          selectedBadge === "all" || product.badge === selectedBadge;
        const queryMatches =
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.checkboxInfo.some((item) => item.toLowerCase().includes(query));
        const favoriteMatches =
          !favoritesOnly || (hasHydrated && favoriteIds.includes(product.id));

        return (
          categoryMatches &&
          brandMatches &&
          badgeMatches &&
          queryMatches &&
          favoriteMatches
        );
      }),
    [
      favoriteIds,
      favoritesOnly,
      hasHydrated,
      query,
      selectedBadge,
      selectedBrand,
      selectedCategory,
    ],
  );

  const hasActiveFilters =
    query.length > 0 ||
    favoritesOnly ||
    selectedCategory !== "all" ||
    selectedBrand !== "all" ||
    selectedBadge !== "all";

  function handleClearFilters() {
    if (!hasActiveFilters) {
      return;
    }

    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedBadge("all");
    setQuery("");
    setFavoritesOnly(false);
    router.push("/products");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className="w-full px-6 pb-0 pt-12 sm:px-10 sm:pb-0 sm:pt-16 lg:px-14">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl text-[#432855] sm:text-5xl">
            {"\u041f\u0440\u043e\u0434\u0443\u043a\u0442 \u043b\u0438\u0441\u0442"}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-[#6b587f]">
            {"\u0420\u0430\u0437\u0433\u043b\u0435\u0434\u0430\u0439 \u043f\u043e\u0434\u0431\u0440\u0430\u043d\u0438\u0442\u0435 \u0444\u043e\u0440\u043c\u0443\u043b\u0438 \u0437\u0430 \u043b\u0438\u0446\u0435, \u0442\u044f\u043b\u043e \u0438 \u043a\u043e\u0441\u0430."}
            </p>
            {query ? (
              <p className="mt-3 text-sm font-medium text-[#8f72a7]">
                {"\u0420\u0435\u0437\u0443\u043b\u0442\u0430\u0442\u0438 \u0437\u0430:"} &quot;{query}&quot;
              </p>
            ) : null}
            {favoritesOnly ? (
              <p className="mt-2 text-sm font-medium text-[#8f72a7]">
                {"\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u0438 \u0441\u0430 \u0441\u0430\u043c\u043e \u043b\u044e\u0431\u0438\u043c\u0438\u0442\u0435 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438."}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5 ${
              hasActiveFilters
                ? "border border-[#d2c0dd] bg-white text-[#432855] hover:border-[#bca5cc] hover:bg-[#faf7fc]"
                : "cursor-not-allowed border border-[#e6deec] bg-[#f7f3fa] text-[#b9adc5]"
            }`}
          >
            Изчисти филтрите
          </button>
        </div>
      </section>

      <section className="w-full border-y border-y-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="mb-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#8f72a7]">
              {"\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438"}
            </p>
            <div className="grid w-full max-w-[400px] grid-cols-[1.33fr_1fr_1fr_1fr] gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedCategory(option.value)}
                  className={`w-full rounded-full border px-2 py-2 text-center text-sm font-medium transition ${
                    selectedCategory === option.value
                      ? "border-transparent bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
                      : "border-[#d8d0de] bg-white text-[#432855] hover:border-[#c4b2d1] hover:bg-[#faf7fc]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex w-full max-w-[400px] items-center overflow-hidden rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] text-[#432855]">
              <div className="flex h-11 shrink-0 items-center gap-2 px-3 text-xs font-semibold uppercase tracking-[0.06em] sm:h-12 sm:px-5 sm:text-sm">
                <FilterIcon />
                <span>{"\u0424\u0438\u043b\u0442\u0440\u0438"}</span>
              </div>

              <div className="h-5 w-px shrink-0 bg-[#ddd3e4] sm:h-6" />

              <label className="relative min-w-0 flex-[0.85]">
                <select
                  value={selectedBrand}
                  onChange={(event) =>
                    setSelectedBrand(
                      event.target.value as Product["brand"] | "all",
                    )
                  }
                  className="h-11 w-full appearance-none bg-transparent px-3 pr-8 text-xs font-medium text-[#432855] outline-none sm:h-12 sm:px-5 sm:pr-10 sm:text-sm"
                >
                  {brandOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#6b587f] sm:right-4">
                  <ChevronIcon />
                </span>
              </label>

              <div className="h-5 w-px shrink-0 bg-[#ddd3e4] sm:h-6" />

              <label className="relative min-w-0 flex-[1.15]">
                <select
                  value={selectedBadge}
                  onChange={(event) =>
                    setSelectedBadge(
                      event.target.value as Product["badge"] | "all",
                    )
                  }
                  className="h-11 w-full appearance-none bg-transparent px-3 pr-8 text-xs font-medium text-[#432855] outline-none sm:h-12 sm:px-5 sm:pr-10 sm:text-sm"
                >
                  {badgeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#6b587f] sm:right-4">
                  <ChevronIcon />
                </span>
              </label>
            </div>
          </div>

          {favoritesOnly && hasHydrated && !favoriteIds.length ? (
            <p className="mb-5 text-sm font-medium text-[#8f72a7]">
              {"\u0412\u0441\u0435 \u043e\u0449\u0435 \u043d\u044f\u043c\u0430\u0448 \u0434\u043e\u0431\u0430\u0432\u0435\u043d\u0438 \u043b\u044e\u0431\u0438\u043c\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438."}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-x-[10px] gap-y-3 min-[640px]:flex min-[640px]:flex-wrap min-[640px]:justify-evenly min-[640px]:gap-y-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                badge={getProductBadgeLabel(product.badge)}
                compact
                className="w-full max-w-[168px] justify-self-center min-[640px]:w-[198px] min-[640px]:max-w-[198px]"
              />
            ))}
          </div>
        </div>
      </section>

      <RecentlyViewedSection />
    </main>
  );
}
