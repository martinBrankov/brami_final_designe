"use client";

import { createContext, useContext } from "react";

import type { Product } from "@/data/products";

const ProductsContext = createContext<Product[]>([]);

export function ProductsProvider({
  children,
  products,
}: {
  children: React.ReactNode;
  products: Product[];
}) {
  return (
    <ProductsContext.Provider value={products}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): Product[] {
  return useContext(ProductsContext);
}
