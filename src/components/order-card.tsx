"use client";

import Link from "next/link";
import { useState } from "react";

import type { UserOrder } from "@/lib/user-orders";

function formatPrice(value: number) {
  return `${value.toFixed(2)} лв.`;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

export function OrderCard({ order }: { order: UserOrder }) {
  const [isOpen, setIsOpen] = useState(false);
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article className="border-b border-[#ece3f2]">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex w-full flex-col gap-3 py-5 text-left transition hover:bg-[#faf7fc] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
            Поръчка #{order.orderNumber}
          </p>
          <p className="mt-1 text-sm text-[#6b587f]">
            {formatOrderDate(order.orderCreatedAt || order.createdAt)} · {itemsCount}{" "}
            {itemsCount === 1 ? "продукт" : "продукта"}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span className="inline-flex items-center rounded-full border border-[#d9c8e1] bg-[#faf7fc] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#432855]">
            {order.status}
          </span>
          <span className="text-base font-semibold text-[#432855]">
            {formatPrice(order.total)}
          </span>
          <ChevronIcon isOpen={isOpen} />
        </div>
      </button>

      {isOpen ? (
        <div className="pb-8 pt-2">
          <ul className="flex flex-col gap-3">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-[16px] border border-[#ece3f2] bg-white p-3"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border border-[#ece3f2] bg-[#faf7fc]">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#cbb7d8]">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-7 w-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <path d="m4 17 4-4 4 4 4-4 4 4" />
                        <circle cx="9" cy="8.5" r="1.5" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {item.productUrl ? (
                    <Link
                      href={item.productUrl}
                      className="truncate text-sm font-medium text-[#432855] transition hover:underline"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium text-[#432855]">
                      {item.productName}
                    </span>
                  )}
                  <span className="text-xs text-[#6b587f]">{item.packaging}</span>
                  <span className="text-xs text-[#6b587f]">
                    {item.quantity} бр. × {formatPrice(item.unitPrice)}
                  </span>
                </div>

                <span className="shrink-0 text-sm font-semibold text-[#432855]">
                  {formatPrice(item.totalPrice)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 grid gap-x-10 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-t border-[#ece3f2] pt-2">
              <dt className="text-[#6b587f]">Доставка</dt>
              <dd className="text-right text-[#432855]">{order.deliveryMethodLabel}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#ece3f2] pt-2">
              <dt className="text-[#6b587f]">Адрес</dt>
              <dd className="text-right text-[#432855]">{order.deliveryDestination}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#ece3f2] pt-2">
              <dt className="text-[#6b587f]">Продукти</dt>
              <dd className="text-right text-[#432855]">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#ece3f2] pt-2">
              <dt className="text-[#6b587f]">Транспорт</dt>
              <dd className="text-right text-[#432855]">{formatPrice(order.shipping)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#ece3f2] pt-2 sm:col-span-2">
              <dt className="font-semibold text-[#432855]">Общо</dt>
              <dd className="text-right text-base font-semibold text-[#432855]">
                {formatPrice(order.total)}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </article>
  );
}
