"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { useFavorites } from "@/components/favorites-provider";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewedSection } from "@/components/recently-viewed-section";
import {
  SectionIntro,
  pageSectionClassName,
  sectionActionClassName,
} from "@/components/section-intro";
import {
  getProductBadgeLabel,
  type Product,
} from "@/data/products";
import { useProducts } from "@/components/products-context";
import { useRouter } from "@/i18n/navigation";

const categoryValues: Array<Product["category"][number] | "all"> = ["all", "face", "body", "hair"];

const audienceValues: Array<Product["audience"][number]> = ["women", "men", "unisex", "kids"];

const brandOptions: Array<{
  value: Product["brand"];
  label: string;
}> = [
  { value: "brami", label: "Brami" },
  { value: "Voditsa", label: "Voditsa" },
  { value: "Shafpol Beauty", label: "Shafpol Beauty" },
];

const badgeValues: Array<Product["badge"]> = ["bestseller", "sale", "new", "favorite", "kids"];

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

/**
 * Passes ?q= and ?favorites=1 to the page. It renders nothing and sits in its
 * own <Suspense>, so the product grid itself stays in the cached server HTML.
 */
function UrlFilterSync({
  onChange,
}: {
  onChange: (query: string, favoritesOnly: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const favoritesOnly = searchParams.get("favorites") === "1";

  useEffect(() => {
    onChange(query, favoritesOnly);
  }, [onChange, query, favoritesOnly]);

  return null;
}

export function ProductsPageContent() {
  const router = useRouter();
  const t = useTranslations("ProductsPage");
  const tProduct = useTranslations("Product");
  const tCategories = useTranslations("Categories");
  const products = useProducts();
  const categoryOptions = categoryValues.map((value) => ({
    value,
    label: value === "all" ? t("allCategories") : tCategories(value),
  }));
  const audienceOptions = audienceValues.map((value) => ({
    value,
    label: t(`audiences.${value}`),
  }));
  const badgeOptions = badgeValues.map((value) => ({
    value,
    label: t(`badgeFilters.${value}`),
  }));
  const { favoriteIds, hasHydrated } = useFavorites();
  const [selectedCategory, setSelectedCategory] =
    useState<Product["category"][number] | "all">("all");
  const [selectedAudiences, setSelectedAudiences] = useState<
    Product["audience"][number][]
  >([]);
  const [selectedBrands, setSelectedBrands] = useState<Product["brand"][]>([]);
  const [selectedBadges, setSelectedBadges] = useState<Product["badge"][]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<
    "brand" | "audience" | "badge" | null
  >("brand");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Also runs when a new search from the navbar navigates here again.
  const applyUrlFilters = useCallback((nextQuery: string, nextFavoritesOnly: boolean) => {
    setQuery(nextQuery);
    setFavoritesOnly(nextFavoritesOnly);
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryMatches =
          selectedCategory === "all" ||
          product.category.includes(selectedCategory);
        const audienceMatches =
          selectedAudiences.length === 0 ||
          selectedAudiences.some((audience) => product.audience.includes(audience));
        const brandMatches =
          selectedBrands.length === 0 || selectedBrands.includes(product.brand);
        const badgeMatches =
          selectedBadges.length === 0 || selectedBadges.includes(product.badge);
        const queryMatches =
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.checkboxInfo.some((item) => item.toLowerCase().includes(query));
        const favoriteMatches =
          !favoritesOnly || (hasHydrated && favoriteIds.includes(product.id));

        return (
          categoryMatches &&
          audienceMatches &&
          brandMatches &&
          badgeMatches &&
          queryMatches &&
          favoriteMatches
        );
      }),
    [
      products,
      favoriteIds,
      favoritesOnly,
      hasHydrated,
      query,
      selectedAudiences,
      selectedBadges,
      selectedBrands,
      selectedCategory,
    ],
  );

  const hasActiveFilters =
    query.length > 0 ||
    favoritesOnly ||
    selectedCategory !== "all" ||
    selectedAudiences.length > 0 ||
    selectedBrands.length > 0 ||
    selectedBadges.length > 0;

  function handleClearFilters() {
    if (!hasActiveFilters) {
      return;
    }

    setSelectedCategory("all");
    setSelectedAudiences([]);
    setSelectedBrands([]);
    setSelectedBadges([]);
    setQuery("");
    setFavoritesOnly(false);
    router.push("/products");
  }

  function toggleSelection<T extends string>(
    value: T,
    selectedValues: T[],
    setSelectedValues: React.Dispatch<React.SetStateAction<T[]>>,
  ) {
    setSelectedValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value],
    );
  }

  function toggleFilterSection(section: "brand" | "audience" | "badge") {
    setExpandedFilter((currentSection) =>
      currentSection === section ? null : section,
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <Suspense fallback={null}>
        <UrlFilterSync onChange={applyUrlFilters} />
      </Suspense>
      <section className={pageSectionClassName}>
        <div className="mb-3">
          <SectionIntro
            title={t("title")}
            titleAs="h1"
            size="page"
            description={t("description")}
          >
            {query ? (
              <p className="mt-3 text-sm font-medium text-[#8f72a7]">
                {t("resultsFor", { query })}
              </p>
            ) : null}
            {favoritesOnly ? (
              <p className="mt-2 text-sm font-medium text-[#8f72a7]">
                {t("favoritesOnly")}
              </p>
            ) : null}
          </SectionIntro>
        </div>
      </section>

      <section className="w-full border-y border-y-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="mb-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#8f72a7]">
              {t("categories")}
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
                  {option.label.toLocaleUpperCase()}
                </button>
              ))}
            </div>

            <div className="mt-3 w-full max-w-[400px] overflow-hidden rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] text-[#432855]">
              <button
                type="button"
                onClick={() => setIsFiltersOpen((currentValue) => !currentValue)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.06em] sm:px-5 sm:text-sm ${
                  isFiltersOpen ? "border-b border-[#ddd3e4]" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <FilterIcon />
                  <span>{t("filters")}</span>
                </span>
                <span
                  className={`text-[#6b587f] transition ${
                    isFiltersOpen ? "rotate-180" : ""
                  }`}
                >
                  <ChevronIcon />
                </span>
              </button>

              {isFiltersOpen ? (
                <>
                  <div className="border-b border-[#ddd3e4] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleFilterSection("brand")}
                      className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5"
                    >
                      <span>
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8f72a7]">
                          {t("brand")}
                        </span>
                        <span className="mt-1 block text-sm font-medium">
                          {selectedBrands.length
                            ? t("selectedCount", { count: selectedBrands.length })
                            : t("chooseBrands")}
                        </span>
                      </span>
                      <span
                        className={`text-[#6b587f] transition ${
                          expandedFilter === "brand" ? "rotate-180" : ""
                        }`}
                      >
                        <ChevronIcon />
                      </span>
                    </button>
                    {expandedFilter === "brand" ? (
                      <div className="space-y-3 border-t border-[#ece3f2] px-4 py-4 sm:px-5">
                        {brandOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-3 text-sm font-medium"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBrands.includes(option.value)}
                              onChange={() =>
                                toggleSelection(
                                  option.value,
                                  selectedBrands,
                                  setSelectedBrands,
                                )
                              }
                              className="h-4 w-4 rounded border-[#bca5cc] text-[#432855] accent-[#432855]"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="border-b border-[#ddd3e4] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleFilterSection("audience")}
                      className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5"
                    >
                      <span>
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8f72a7]">
                          {t("audience")}
                        </span>
                        <span className="mt-1 block text-sm font-medium">
                          {selectedAudiences.length
                            ? t("selectedCount", { count: selectedAudiences.length })
                            : t("chooseAudience")}
                        </span>
                      </span>
                      <span
                        className={`text-[#6b587f] transition ${
                          expandedFilter === "audience" ? "rotate-180" : ""
                        }`}
                      >
                        <ChevronIcon />
                      </span>
                    </button>
                    {expandedFilter === "audience" ? (
                      <div className="space-y-3 border-t border-[#ece3f2] px-4 py-4 sm:px-5">
                        {audienceOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-3 text-sm font-medium"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAudiences.includes(option.value)}
                              onChange={() =>
                                toggleSelection(
                                  option.value,
                                  selectedAudiences,
                                  setSelectedAudiences,
                                )
                              }
                              className="h-4 w-4 rounded border-[#bca5cc] text-[#432855] accent-[#432855]"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => toggleFilterSection("badge")}
                      className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5"
                    >
                      <span>
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8f72a7]">
                          {t("badge")}
                        </span>
                        <span className="mt-1 block text-sm font-medium">
                          {selectedBadges.length
                            ? t("selectedCount", { count: selectedBadges.length })
                            : t("chooseBadges")}
                        </span>
                      </span>
                      <span
                        className={`text-[#6b587f] transition ${
                          expandedFilter === "badge" ? "rotate-180" : ""
                        }`}
                      >
                        <ChevronIcon />
                      </span>
                    </button>
                    {expandedFilter === "badge" ? (
                      <div className="space-y-3 border-t border-[#ece3f2] px-4 py-4 sm:px-5">
                        {badgeOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-3 text-sm font-medium"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBadges.includes(option.value)}
                              onChange={() =>
                                toggleSelection(
                                  option.value,
                                  selectedBadges,
                                  setSelectedBadges,
                                )
                              }
                              className="h-4 w-4 rounded border-[#bca5cc] text-[#432855] accent-[#432855]"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className={`mt-3 ${sectionActionClassName} ${
                hasActiveFilters
                  ? ""
                  : "cursor-not-allowed border-[#e6deec] bg-[#f7f3fa] text-[#b9adc5] hover:bg-[#f7f3fa]"
              }`}
            >
              {t("clearFilters")}
            </button>
          </div>

          {favoritesOnly && hasHydrated && !favoriteIds.length ? (
            <p className="mb-5 text-sm font-medium text-[#8f72a7]">
              {t("noFavorites")}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-x-[10px] gap-y-3 min-[640px]:flex min-[640px]:flex-wrap min-[640px]:justify-evenly min-[640px]:gap-y-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                badge={getProductBadgeLabel(product.badge, tProduct, product.discountPercent)}
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
