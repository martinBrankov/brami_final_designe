import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteToggleButton } from "@/components/favorite-toggle-button";
import { InfoStrip } from "@/components/info-strip";
import { ProductCarouselSection } from "@/components/product-carousel-section";
import { ProductDetailTabs } from "@/components/product-detail-tabs";
import { RecentlyViewedTracker } from "@/components/recently-viewed-tracker";
import {
  getProductBadgeLabel,
  getProductById,
  getProductsByIds,
  products,
} from "@/data/products";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const categoryLabels = {
  face: "Лице",
  body: "Тяло",
  hair: "Коса",
} as const;

const HOME_LABEL = "Начало";
const PRODUCTS_LABEL = "Продукти";
const IN_STOCK_LABEL = "В наличност";
const REVIEWS_SUFFIX = "отзива";
const PACKAGING_LABEL = "Разфасовка";
const ADD_TO_CART_LABEL = "Добави в количката";
const BGN_SUFFIX = "лв.";
const EURO_SYMBOL = "€";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0 text-[#c5a76c]">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-5 w-5 ${
            index < rating ? "fill-current" : "fill-[#eadfcb]"
          }`}
        >
          <path d="m12 3.6 2.55 5.17 5.71.83-4.13 4.02.98 5.68L12 16.62 6.89 19.3l.98-5.68-4.13-4.02 5.71-.83Z" />
        </svg>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
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

function CartLineIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="19" r="1.2" />
      <circle cx="18" cy="19" r="1.2" />
      <path d="M3.5 5h2l1.8 8.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.74l1.4-5.26H7.2" />
    </svg>
  );
}

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

export function generateStaticParams() {
  return products.map((product) => ({
    id: String(product.id),
  }));
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  const productId = Number(id);
  const product = Number.isNaN(productId) ? undefined : getProductById(productId);

  if (!product) {
    notFound();
  }

  const productImage = product.imageSrc[0];
  const primaryCategory = product.category[0];
  const categoryLabel = primaryCategory
    ? categoryLabels[primaryCategory]
    : PRODUCTS_LABEL;
  const categoryHref = primaryCategory
    ? `/products?category=${primaryCategory}`
    : "/products";
  const currentPriceEuro = parseEuroPrice(product.price);
  const currentPriceBgn = parseBgnPrice(product.price);
  const oldPriceEuro =
    product.badge === "sale" && currentPriceEuro
      ? currentPriceEuro / 0.8
      : null;
  const oldPriceBgn =
    product.badge === "sale" && currentPriceBgn
      ? currentPriceBgn / 0.8
      : null;
  const relatedProducts = getProductsByIds(product.relatedProductIds).filter(
    (relatedProduct) => relatedProduct.id !== product.id,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <RecentlyViewedTracker productId={product.id} />
      <section className="h-[49px] w-full border-b border-[#ece6f1] bg-white">
        <div className="flex h-full items-center px-6 sm:px-10 lg:px-14">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-[#7a688d]"
          >
            <Link href="/" className="transition hover:text-[#432855]">
              {HOME_LABEL}
            </Link>
            <span className="text-[#b7a8c3]">/</span>
            <Link href="/products" className="transition hover:text-[#432855]">
              {PRODUCTS_LABEL}
            </Link>
            <span className="text-[#b7a8c3]">/</span>
            <Link href={categoryHref} className="transition hover:text-[#432855]">
              {categoryLabel}
            </Link>
            <span className="text-[#b7a8c3]">/</span>
            <span className="text-[#5f4b73]">{product.name}</span>
          </nav>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(340px,520px)_minmax(320px,520px)] xl:items-stretch xl:gap-10">
            <div className="relative overflow-hidden rounded-[28px] bg-white">
              <div className="relative rounded-[28px] border border-[#d8d0de] bg-[linear-gradient(180deg,#fcfbfd_0%,#f4eef8_100%)] p-0">
                <span className="absolute right-4 top-4 z-10 inline-flex rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-3 py-1 text-xs font-semibold text-white">
                  {getProductBadgeLabel(product.badge)}
                </span>
                <div className="overflow-hidden rounded-[28px]">
                  {productImage ? (
                    <Image
                      src={productImage}
                      alt={product.name}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-[#f3edf7]" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex h-full flex-col justify-between">
              <h1 className="font-serif text-[2.2rem] leading-tight text-[#432855] sm:text-[3rem]">
                {product.name}
              </h1>

              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[#4f875d]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#68b27b]" />
                  {IN_STOCK_LABEL}
                </div>
                <div className="flex items-center gap-2">
                  <StarRow rating={product.rating} />
                  <span className="text-sm font-medium text-[#6b587f]">
                    ({product.comments.length} {REVIEWS_SUFFIX})
                  </span>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-[#6b587f]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f3edf7] text-[#6c3f8d]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 3.5h6" />
                    <path d="M8 3.5v3l-3.4 5.7A3 3 0 0 0 7.2 16.5h5.6a3 3 0 0 0 2.6-4.3L12 6.5v-3" />
                  </svg>
                </span>
                <span className="text-sm font-medium">
                  {PACKAGING_LABEL}: {product.packaging}
                </span>
              </div>

              <div className="mt-5">
                <div className="flex flex-col gap-2">
                  {product.checkboxInfo.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-[#5f4b73]"
                    >
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#efe7f4] text-[#6c3f8d]">
                        <CheckIcon />
                      </span>
                      <span className="text-[15px] font-medium leading-5 sm:text-base">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                  <span className="text-4xl font-semibold leading-none text-[#432855] sm:text-[2.7rem]">
                    {currentPriceEuro && currentPriceBgn
                      ? `${formatEuroPrice(currentPriceEuro)} / ${formatBgnPrice(currentPriceBgn)}`
                      : product.price}
                  </span>
                  {oldPriceEuro && oldPriceBgn ? (
                    <span className="text-xl font-medium text-[#8f7a9d] line-through">
                      {`${formatEuroPrice(oldPriceEuro)} / ${formatBgnPrice(oldPriceBgn)}`}
                    </span>
                  ) : null}
                </div>

                <AddToCartButton
                  productId={product.id}
                  className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-8 text-sm font-semibold uppercase tracking-[0.08em] text-white sm:text-base"
                >
                  <CartLineIcon />
                  {ADD_TO_CART_LABEL}
                </AddToCartButton>

                <FavoriteToggleButton
                  productId={product.id}
                  className="mt-3 h-12 w-full"
                />
              </div>
            </div>
          </div>
        </div>

      </section>

      <ProductDetailTabs
        productId={product.id}
        productName={product.name}
        description={product.description}
        comments={product.comments}
      />

      <ProductCarouselSection
        title="Свързани продукти"
        products={relatedProducts}
      />

      <InfoStrip className="border-b-0 bg-transparent" />
    </main>
  );
}
