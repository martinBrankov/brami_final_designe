import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Продукти",
  description:
    "Разгледай пълната колекция от натурална козметика на Brami — кремове, серуми, масла и продукти за лице, тяло и коса с чисти формули и бърза доставка.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Продукти | Brami",
    description:
      "Натурална козметика за лице, тяло и коса — открий пълната колекция на Brami с чисти формули и деликатна грижа.",
    url: "/products",
  },
};
import { ProductsPageContent } from "./products-page-content";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
