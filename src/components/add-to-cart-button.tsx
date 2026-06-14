"use client";

import type { ReactNode } from "react";

import { useCart } from "@/components/cart-provider";

type AddToCartButtonProps = {
  productId: number;
  stock: number;
  className: string;
  children: ReactNode;
};

export function AddToCartButton({
  productId,
  stock,
  className,
  children,
}: AddToCartButtonProps) {
  const { addItem, items, notifyStockLimit } = useCart();

  const outOfStock = stock <= 0;
  const currentQuantity =
    items.find((item) => item.productId === productId)?.quantity ?? 0;

  function handleClick() {
    // When the product is sold out the button is disabled and does nothing.
    // Otherwise, stock stays hidden until the customer tries to exceed it —
    // then we surface the limit as an error in the cart notification popup.
    if (currentQuantity >= stock) {
      notifyStockLimit(productId);
      return;
    }

    addItem(productId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={outOfStock}
      className={`${className}${outOfStock ? " cursor-not-allowed opacity-60" : ""}`}
    >
      {outOfStock ? "изчерпана наличност" : children}
    </button>
  );
}
