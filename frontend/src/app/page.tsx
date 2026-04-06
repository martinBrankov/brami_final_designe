import { BestsellersSection } from "@/components/bestsellers-section";
import { HomeHero } from "@/components/home-hero";
import { InfoStrip } from "@/components/info-strip";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <HomeHero />
      <InfoStrip />
      <BestsellersSection />
    </main>
  );
}
