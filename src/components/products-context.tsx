"use client";

import { createContext, useContext } from "react";

import type { ClientProduct } from "@/data/products";

const ProductsContext = createContext<ClientProduct[]>([]);

export function ProductsProvider({
  children,
  products,
}: {
  children: React.ReactNode;
  products: ClientProduct[];
}) {
  return (
    <ProductsContext.Provider value={products}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ClientProduct[] {
  return useContext(ProductsContext);
}
