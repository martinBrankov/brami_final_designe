"use client";

import { useEffect, useState } from "react";

import { ProductCarouselSection } from "@/components/product-carousel-section";
import { products } from "@/data/products";

export function BestsellersSection() {
  const [featuredProducts, setFeaturedProducts] = useState(() =>
    products.slice(0, 5),
  );

  useEffect(() => {
    const updateFeaturedProducts = () => {
      setFeaturedProducts(products.slice(0, window.innerWidth >= 1024 ? 8 : 5));
    };

    updateFeaturedProducts();
    window.addEventListener("resize", updateFeaturedProducts);

    return () => {
      window.removeEventListener("resize", updateFeaturedProducts);
    };
  }, []);

  return (
    <ProductCarouselSection
      title="Най-продавани продукти"
      products={featuredProducts}
    />
  );
}
