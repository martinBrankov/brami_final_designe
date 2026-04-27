import { statSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BestsellersSection } from "@/components/bestsellers-section";
import { HomeHero } from "@/components/home-hero";
import { InfoStrip } from "@/components/info-strip";
import { getMappedProductId } from "@/data/external-product-map";

export function generateMetadata(): Metadata {
  const mtime = statSync(join(process.cwd(), "src/assets/images/og-home.jpg")).mtimeMs;
  const v = Math.floor(mtime).toString(36);

  return {
    title: "Brami — Натурална козметика за лице, тяло и коса",
    description:
      "Открий натуралната козметика на Brami — продукти за лице, тяло и коса с чисти формули, натурални съставки и деликатна грижа. Бърза онлайн поръчка с доставка до България.",
    alternates: { canonical: "/" },
    openGraph: {
      title: "Brami — Натурална козметика за лице, тяло и коса",
      description:
        "Открий натуралната козметика на Brami — продукти за лице, тяло и коса с чисти формули и деликатна грижа.",
      url: "/",
      images: [
        {
          url: `https://brami.shop/opengraph-image?v=${v}`,
          width: 1200,
          height: 630,
          alt: "Brami — Натурална козметика за лице, тяло и коса",
        },
      ],
    },
  };
}

type HomePageProps = {
  searchParams: Promise<{
    productID?: string | string[];
    productId?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const externalProductId = resolvedSearchParams.productID ?? resolvedSearchParams.productId;
  const normalizedProductId = Array.isArray(externalProductId)
    ? externalProductId[0]
    : externalProductId;

  if (normalizedProductId) {
    const mappedProductId = getMappedProductId(normalizedProductId);

    if (mappedProductId) {
      redirect(`/products/${mappedProductId}`);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <HomeHero />
      <InfoStrip />
      <BestsellersSection />
    </main>
  );
}
