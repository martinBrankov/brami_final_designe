"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ProductCarouselSection } from "@/components/product-carousel-section";
import { useProducts } from "@/components/products-context";

export function BestsellersSection() {
  const t = useTranslations("Home");
  const products = useProducts();
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
  }, [products]);

  return (
    <ProductCarouselSection
      title={t("bestsellers")}
      products={featuredProducts}
    />
  );
}
