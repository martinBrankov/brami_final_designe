"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { SectionIntro } from "@/components/section-intro";
import { getProductBadgeLabel, products } from "@/data/products";
import type { Product } from "@/data/products";

const RECENTLY_VIEWED_STORAGE_KEY = "brami-recently-viewed";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="M12.5 4.5 7 10l5.5 5.5" />
      ) : (
        <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />
      )}
    </svg>
  );
}

export function RecentlyViewedSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCardsCount, setVisibleCardsCount] = useState(1);
  const [isOverflowing, setIsOverflowing] = useState(false);

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
        const storedValue = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
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

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller || !viewedProducts.length) {
      return;
    }

    const updateMetrics = () => {
      const cards = Array.from(
        scroller.querySelectorAll<HTMLElement>("[data-card-index]"),
      );

      if (!cards.length) {
        setVisibleCardsCount(1);
        setActiveIndex(0);
        setIsOverflowing(false);
        return;
      }

      const hasOverflow = scroller.scrollWidth > scroller.clientWidth + 1;
      const firstCard = cards[0];
      const secondCard = cards[1];
      const gap =
        Number.parseFloat(
          window.getComputedStyle(scroller).columnGap ||
            window.getComputedStyle(scroller).gap ||
            "0",
        ) || 0;
      const cardWidth = firstCard.offsetWidth;
      const step = secondCard
        ? secondCard.offsetLeft - firstCard.offsetLeft
        : cardWidth + gap;
      const nextVisibleCardsCount = Math.min(
        cards.length,
        Math.max(1, Math.round((scroller.clientWidth + gap) / Math.max(step, 1))),
      );

      setIsOverflowing(hasOverflow);
      setVisibleCardsCount(nextVisibleCardsCount);
      setActiveIndex((currentIndex) =>
        Math.min(currentIndex, Math.max(0, cards.length - nextVisibleCardsCount)),
      );
    };

    updateMetrics();

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(scroller);
    window.addEventListener("resize", updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [viewedProducts]);

  function handleScroll() {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const cards = Array.from(
      scroller.querySelectorAll<HTMLElement>("[data-card-index]"),
    );

    if (!cards.length) {
      return;
    }

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const maxActiveIndex = Math.max(0, cards.length - visibleCardsCount);

    if (maxScrollLeft <= 0) {
      setActiveIndex(0);
      return;
    }

    if (scroller.scrollLeft >= maxScrollLeft - 2) {
      setActiveIndex(maxActiveIndex);
      return;
    }

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - scroller.scrollLeft);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveIndex(Math.min(nearestIndex, maxActiveIndex));
  }

  function scrollByCard(direction: "left" | "right") {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const cards = Array.from(
      scroller.querySelectorAll<HTMLElement>("[data-card-index]"),
    );
    const firstCard = cards[0];
    const secondCard = cards[1];
    const scrollAmount =
      secondCard && firstCard
        ? secondCard.offsetLeft - firstCard.offsetLeft
        : firstCard?.offsetWidth ?? 220;

    scroller.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }

  if (!viewedProducts.length) {
    return null;
  }

  const dotSize = 10;
  const dotGap = 8;
  const indicatorWidth =
    visibleCardsCount * dotSize + Math.max(0, visibleCardsCount - 1) * dotGap;
  const indicatorOffset = activeIndex * (dotSize + dotGap);

  return (
    <section className="w-full bg-[#f5f7fb] py-10">
      <div className="flex w-full flex-col gap-3 px-6 sm:px-10 lg:px-14">
        <div className="flex items-end justify-between gap-4">
          <SectionIntro
            title="Последно разглеждани продукти"
            titleClassName="max-w-[12ch] sm:max-w-none"
          />
          {isOverflowing ? (
            <div className="hidden items-center gap-3 lg:flex">
              <button
                type="button"
                aria-label="Предишни разглеждани продукти"
                onClick={() => scrollByCard("left")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855] transition hover:border-[#c4b2d1] hover:bg-[#faf7fc]"
              >
                <ArrowIcon direction="left" />
              </button>
              <button
                type="button"
                aria-label="Следващи разглеждани продукти"
                onClick={() => scrollByCard("right")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855] transition hover:border-[#c4b2d1] hover:bg-[#faf7fc]"
              >
                <ArrowIcon direction="right" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className={`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 ${
              isOverflowing ? "justify-start" : "justify-center"
            }`}
          >
            {viewedProducts.map((product, index) => (
              <div
                key={product.id}
                data-card-index={index}
                className="snap-start w-full max-w-[168px] shrink-0 min-[640px]:w-[198px] min-[640px]:max-w-[198px]"
              >
                <ProductCard
                  product={product}
                  badge={getProductBadgeLabel(product.badge)}
                  compact
                  className="w-full max-w-[168px] min-[640px]:w-[198px] min-[640px]:max-w-[198px]"
                />
              </div>
            ))}
          </div>
        </div>

        {isOverflowing ? (
          <div className="flex justify-center">
            <div className="relative flex h-2.5 items-center gap-2">
              <div
                className="pointer-events-none absolute left-0 top-0 z-10 h-2.5 rounded-full bg-[#6d4a86] transition-[transform,width] duration-200"
                style={{
                  width: `${indicatorWidth}px`,
                  transform: `translateX(${indicatorOffset}px)`,
                }}
              />
              {viewedProducts.map((product) => (
                <span
                  key={product.id}
                  className="relative z-0 h-2.5 w-2.5 rounded-full bg-[#d7cada]"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
