import { redirect } from "next/navigation";

import { BestsellersSection } from "@/components/bestsellers-section";
import { HomeHero } from "@/components/home-hero";
import { InfoStrip } from "@/components/info-strip";
import { getMappedProductId } from "@/data/external-product-map";

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
