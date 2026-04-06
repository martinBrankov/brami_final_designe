"use client";

import type { ReactNode } from "react";

import { useCart } from "@/components/cart-provider";

type AddToCartButtonProps = {
  productId: number;
  className: string;
  children: ReactNode;
};

export function AddToCartButton({
  productId,
  className,
  children,
}: AddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      onClick={() => addItem(productId)}
      className={className}
    >
      {children}
    </button>
  );
}
