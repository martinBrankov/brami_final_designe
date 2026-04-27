"use client";

import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { useFavorites } from "@/components/favorites-provider";
import type { Product } from "@/data/products";

type ProductCardProps = {
  product: Product;
  badge: string;
  className?: string;
  compact?: boolean;
};

const BGN_SUFFIX = "лв.";
const EURO_SYMBOL = "€";

const BADGE_GRADIENTS: Record<Product["badge"], string> = {
  bestseller: "linear-gradient(100deg,#d4b082 0%,#bf9464 100%)",
  sale:       "linear-gradient(100deg,#e86969 0%,#c43c3c 100%)",
  new:        "linear-gradient(100deg,#2e7d46 0%,#1a5c30 100%)",
  favorite:   "linear-gradient(100deg,#e07db5 0%,#b84d87 100%)",
  featured:   "linear-gradient(100deg,#7e9fda 0%,#4a6db8 100%)",
  none:       "",
};

function parseBgnPrice(price: string) {
  const bgnMatch = price.match(/\/(\d+[.,]?\d*)лв\.?/i);

  if (bgnMatch) {
    return Number.parseFloat(bgnMatch[1].replace(",", "."));
  }

  return 0;
}

function parseEuroPrice(price: string) {
  const euroMatch = price.match(/€\s?(\d+[.,]?\d*)/i);

  if (euroMatch) {
    return Number.parseFloat(euroMatch[1].replace(",", "."));
  }

  return 0;
}

function formatBgnPrice(price: number) {
  return `${price.toFixed(2)} ${BGN_SUFFIX}`;
}

function formatEuroPrice(price: number) {
  return `${EURO_SYMBOL}${price.toFixed(2)}`;
}

function StarRow({
  rating,
  compact = false,
}: {
  rating: number;
  compact?: boolean;
}) {
  return (
    <div className="-ml-[3px] flex items-center -space-x-[5px] text-[#c5a76c]">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`${compact ? "h-[19px] w-[19px]" : "h-5 w-5"} ${
            index < rating ? "fill-current" : "fill-[#eadfcb]"
          }`}
        >
          <path d="m12 3.6 2.55 5.17 5.71.83-4.13 4.02.98 5.68L12 16.62 6.89 19.3l.98-5.68-4.13-4.02 5.71-.83Z" />
        </svg>
      ))}
    </div>
  );
}

function CheckIcon({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 10.5 8 14l7.5-8" />
    </svg>
  );
}

function HeartIcon({ filled, compact = false }: { filled: boolean; compact?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={compact ? "h-4 w-4 sm:h-[18px] sm:w-[18px]" : "h-5 w-5"}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.4 5.6 14.7A4.9 4.9 0 0 1 12 7.4a4.9 4.9 0 0 1 6.4-.1 4.8 4.8 0 0 1-.3 7.4Z" />
    </svg>
  );
}

export function ProductCard({
  product,
  badge,
  className = "",
  compact = false,
}: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const productImage = product.imageSrc[0];
  const detailsHref = `/products/${product.id}`;
  const favorite = isFavorite(product.id);
  const originalPriceEuro = parseEuroPrice(product.price);
  const originalPriceBgn = parseBgnPrice(product.price);
  const isOnSale = product.badge === "sale";
  const discountFactor = isOnSale && product.discountPercent ? 1 - product.discountPercent / 100 : 0.8;
  const currentPriceEuro = isOnSale && originalPriceEuro ? originalPriceEuro * discountFactor : originalPriceEuro;
  const currentPriceBgn = isOnSale && originalPriceBgn ? originalPriceBgn * discountFactor : originalPriceBgn;
  const oldPriceEuro = isOnSale ? originalPriceEuro : null;
  const oldPriceBgn = isOnSale ? originalPriceBgn : null;

  return (
    <article
      className={`relative flex h-full w-full max-w-[300px] flex-col overflow-hidden border border-[#d8d0de] bg-white ${
        compact ? "rounded-[22px]" : "rounded-[28px]"
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => toggleFavorite(product.id)}
        aria-label={favorite ? "Премахни от любими" : "Добави в любими"}
        aria-pressed={favorite}
        className={`absolute z-10 inline-flex items-center justify-center rounded-full border transition ${
          favorite
            ? "border-transparent bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
            : "border-[#ded2e8] bg-[rgba(255,255,255,0.94)] text-[#6c3f8d] hover:bg-white"
        } ${
          compact
            ? "right-2.5 top-2.5 h-7 w-7 sm:right-3 sm:top-3 sm:h-8 sm:w-8"
            : "right-4 top-4 h-10 w-10"
        }`}
      >
        <HeartIcon filled={favorite} compact={compact} />
      </button>

      <Link
        href={detailsHref}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6c3f8d] focus-visible:ring-offset-2"
      >
        <div className="relative overflow-hidden border-b border-[#e5e0e8] bg-[linear-gradient(180deg,#f2f2f6_0%,#e8e8ee_100%)]">
          {product.badge !== "none" ? (
            <span
              style={{ background: BADGE_GRADIENTS[product.badge] }}
              className={`absolute z-20 inline-flex rounded-full font-semibold text-white ${
                compact
                  ? "left-2.5 top-2.5 px-2 py-0.5 text-[10px] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]"
                  : "left-4 top-4 px-3 py-1 text-xs"
              }`}
            >
              {badge}
            </span>
          ) : null}
          <div
            className={`relative overflow-hidden bg-[#f2f2f6] ${
              compact ? "pt-8 sm:pt-10" : "pt-12"
            }`}
          >
            {productImage ? (
              <>
                <Image
                  src={productImage}
                  alt={product.name}
                  className="block aspect-square w-full object-cover"
                />
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 bg-[linear-gradient(180deg,rgba(248,248,250,0.98)_0%,rgba(248,248,250,0.98)_50%,rgba(248,248,250,0.6)_62%,rgba(248,248,250,0.16)_76%,rgba(248,248,250,0)_90%)] ${
                    compact ? "h-16 sm:h-20" : "h-24"
                  }`}
                />
              </>
            ) : (
              <div className="aspect-square w-full bg-[#f3edf7]" />
            )}
          </div>
        </div>

        <div
          className={`flex flex-1 flex-col ${
            compact ? "px-2.5 py-2.5 sm:px-3.5 sm:py-3.5" : "px-5 py-5"
          }`}
        >
          <div className={`flex min-w-0 items-center ${compact ? "gap-1.5" : "gap-2"}`}>
            <StarRow rating={product.rating} compact={compact} />
            <span
              className={`${
                compact ? "text-xs" : "text-sm"
              } shrink-0 font-medium text-[#6b587f]`}
            >
              ({product.comments.length} оценки)
            </span>
          </div>
          <div
            className={`flex flex-col ${
              compact
                ? "mt-1.5 min-h-[68px] sm:mt-2 sm:min-h-[76px]"
                : "mt-3 min-h-[104px]"
            }`}
          >
            <h3
              className={`font-serif text-[#432855] ${
                compact
                  ? "text-[0.95rem] leading-5 sm:text-[1.1rem] sm:leading-6"
                  : "text-[1.45rem] leading-7"
              }`}
            >
              {product.name}
            </h3>
            <p
              className={`mt-auto pt-1 text-[#6b587f] ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {product.packaging}
            </p>
          </div>
          <div
            className={`flex flex-col justify-start ${
              compact ? "min-h-[20px] sm:min-h-[22px]" : "min-h-[28px]"
            }`}
          >
            {isOnSale && oldPriceEuro && oldPriceBgn ? (
              <p
                className={`font-medium text-[#8f7a9d] line-through ${
                  compact ? "text-xs sm:text-sm" : "text-lg"
                }`}
              >
                {`${formatEuroPrice(oldPriceEuro)} / ${formatBgnPrice(oldPriceBgn)}`}
              </p>
            ) : (
              product.checkboxInfo.slice(0, 1).map((item) => (
                <div
                  key={item}
                  className={`flex items-center text-[#6d4a86] ${
                    compact ? "gap-1.5" : "gap-2"
                  }`}
                >
                  <span
                    className={`flex shrink-0 items-center justify-center rounded-full bg-[#efe7f4] text-[#6c3f8d] ${
                      compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-5 w-5"
                    }`}
                  >
                    <CheckIcon compact={compact} />
                  </span>
                  <span
                    className={`${
                      compact ? "text-[11px] sm:text-[13px]" : "text-sm"
                    } font-medium`}
                  >
                    {item}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className={compact ? "my-1.5 sm:my-2" : "my-3"}>
            <p
              className={`font-semibold text-[#432855] ${
                compact ? "text-[1.05rem] sm:text-[1.25rem]" : "text-[1.6rem]"
              }`}
            >
              {currentPriceEuro && currentPriceBgn
                ? `${formatEuroPrice(currentPriceEuro)} / ${formatBgnPrice(currentPriceBgn)}`
                : product.price}
            </p>
          </div>
        </div>
      </Link>

      <div
        className={compact ? "px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5" : "px-5 pb-5"}
      >
        <AddToCartButton
          productId={product.id}
          className={`mt-auto inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] font-semibold uppercase tracking-[0.08em] text-white ${
            compact
              ? "h-8 px-3 text-[10px] sm:h-10 sm:px-4 sm:text-[11px]"
              : "h-12 px-6 text-sm"
          }`}
        >
          Купи
        </AddToCartButton>
      </div>
    </article>
  );
}
