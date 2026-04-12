"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ProductCard } from "@/components/product-card";
import {
  SectionIntro,
  sectionActionClassName,
} from "@/components/section-intro";
import { getProductBadgeLabel, type Product } from "@/data/products";

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

type ProductCarouselSectionProps = {
  title: string;
  products: Product[];
  titleClassName?: string;
  emptyState?: ReactNode;
};

export function ProductCarouselSection({
  title,
  products,
  titleClassName,
  emptyState = null,
}: ProductCarouselSectionProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCardsCount, setVisibleCardsCount] = useState(1);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [leftFadeWidth, setLeftFadeWidth] = useState(0);
  const [rightFadeWidth, setRightFadeWidth] = useState(0);

  function getVisibleCardsCount(scroller: HTMLDivElement, cards: HTMLElement[]) {
    if (!cards.length) {
      return 1;
    }

    const firstCard = cards[0];
    const secondCard = cards[1];
    const scrollerStyles = window.getComputedStyle(scroller);
    const gap =
      Number.parseFloat(scrollerStyles.columnGap || scrollerStyles.gap || "0") || 0;
    const cardWidth = firstCard.offsetWidth;
    const step = secondCard
      ? secondCard.offsetLeft - firstCard.offsetLeft
      : cardWidth + gap;

    return Math.min(
      cards.length,
      Math.max(1, Math.round((scroller.clientWidth + gap) / Math.max(step, 1))),
    );
  }

  function updateFadeWidths(scroller: HTMLDivElement, cards: HTMLElement[]) {
    const scrollerRect = scroller.getBoundingClientRect();
    const maxFadeWidth = 14;
    const edgeTolerance = 3;
    let nextLeftFadeWidth = 0;
    let nextRightFadeWidth = 0;
    const hasAlignedLeftCard = cards.some((card) => {
      const cardRect = card.getBoundingClientRect();

      return Math.abs(cardRect.left - scrollerRect.left) <= edgeTolerance;
    });
    const hasAlignedRightCard = cards.some((card) => {
      const cardRect = card.getBoundingClientRect();

      return Math.abs(cardRect.right - scrollerRect.right) <= edgeTolerance;
    });

    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();

      if (
        !hasAlignedLeftCard &&
        cardRect.left < scrollerRect.left &&
        cardRect.right > scrollerRect.left
      ) {
        nextLeftFadeWidth = Math.min(
          maxFadeWidth,
          Math.max(0, scrollerRect.left - cardRect.left),
        );
      }

      if (
        !hasAlignedRightCard &&
        cardRect.left < scrollerRect.right &&
        cardRect.right > scrollerRect.right
      ) {
        nextRightFadeWidth = Math.min(
          maxFadeWidth,
          Math.max(0, cardRect.right - scrollerRect.right),
        );
      }
    });

    setLeftFadeWidth(nextLeftFadeWidth);
    setRightFadeWidth(nextRightFadeWidth);
  }

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller || !products.length) {
      return;
    }

    const updateMetrics = () => {
      const cards = Array.from(
        scroller.querySelectorAll<HTMLElement>("[data-card-index]"),
      );

      const hasOverflow = scroller.scrollWidth > scroller.clientWidth + 1;
      setIsOverflowing(hasOverflow);

      if (!cards.length) {
        setVisibleCardsCount(1);
        setActiveIndex(0);
        setLeftFadeWidth(0);
        setRightFadeWidth(0);
        return;
      }

      updateFadeWidths(scroller, cards);

      const nextVisibleCardsCount = getVisibleCardsCount(scroller, cards);

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
  }, [products]);

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
    updateFadeWidths(scroller, cards);

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

  function scrollByPage(direction: "left" | "right") {
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

  if (!products.length) {
    return emptyState;
  }

  const dotSize = 10;
  const dotGap = 8;
  const indicatorWidth =
    visibleCardsCount * dotSize + Math.max(0, visibleCardsCount - 1) * dotGap;
  const indicatorOffset = activeIndex * (dotSize + dotGap);

  return (
    <section className="w-full bg-[#f5f7fb] py-10">
      <div className="flex w-full flex-col gap-3 px-6 sm:px-10 lg:px-14">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end justify-between gap-4">
            <SectionIntro title={title} titleClassName={titleClassName} />
            {isOverflowing ? (
              <div className="hidden items-center gap-3 lg:flex">
                <button
                  type="button"
                  aria-label={`Предишни ${title.toLowerCase()}`}
                  onClick={() => scrollByPage("left")}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855] transition hover:border-[#c4b2d1] hover:bg-[#faf7fc]"
                >
                  <ArrowIcon direction="left" />
                </button>
                <button
                  type="button"
                  aria-label={`Следващи ${title.toLowerCase()}`}
                  onClick={() => scrollByPage("right")}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855] transition hover:border-[#c4b2d1] hover:bg-[#faf7fc]"
                >
                  <ArrowIcon direction="right" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex w-full justify-start lg:w-auto lg:justify-end">
            <Link
              href="/products"
              className={`w-full justify-center lg:w-auto ${sectionActionClassName}`}
            >
              КЪМ ПРОДУКТИТЕ
            </Link>
          </div>
        </div>

        <div className="relative">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className={`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 ${
              isOverflowing ? "justify-start" : "justify-center"
            }`}
          >
            {products.map((product, index) => (
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

          {isOverflowing ? (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-20 bg-[linear-gradient(90deg,#f5f7fb_10%,rgba(245,247,251,0)_100%)] transition-[width,opacity] duration-150"
                style={{
                  width: `${leftFadeWidth}px`,
                  opacity: leftFadeWidth > 0 ? 1 : 0,
                }}
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-20 bg-[linear-gradient(270deg,#f5f7fb_10%,rgba(245,247,251,0)_100%)] transition-[width,opacity] duration-150"
                style={{
                  width: `${rightFadeWidth}px`,
                  opacity: rightFadeWidth > 0 ? 1 : 0,
                }}
              />
            </>
          ) : null}
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
              {products.map((product) => (
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
