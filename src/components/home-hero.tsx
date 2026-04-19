import Image from "next/image";
import Link from "next/link";

import homeScreenImgDesktop from "@/assets/images/homeScreenImgDesktop.jpg";
import homeScreenImgMobile from "@/assets/images/homeScreenImgMobile.png";
import {
  SectionIntro,
  sectionActionClassName,
  sectionPrimaryButtonClassName,
} from "@/components/section-intro";

export function HomeHero() {
  return (
    <section className="w-full">
      <div className="grid w-full overflow-hidden border-y border-y-[#d8d0de] bg-[#f5f7fb] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <SectionIntro
            title="Естествена грижа с BRAMI Cosmetics"
            titleAs="h1"
            size="hero"
            contentClassName="max-w-[36rem]"
            titleClassName="max-w-[12ch]"
            description="Грижа - вдъхновена от силата на шафрана, която започва отвън, превръща се в здраве за клетките навътре и накрая се проявява като естествено сияние и увереност отново навън."
          >
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className={sectionPrimaryButtonClassName}>
                Виж продуктите
              </Link>
              <Link
                href="/about"
                className={`${sectionActionClassName} bg-white/90`}
              >
                НАУЧИ ПОВЕЧЕ
              </Link>
            </div>
          </SectionIntro>
        </div>

        <div className="relative min-h-[320px] bg-[#f5f7fb] sm:min-h-[420px] lg:min-h-[560px]">
          <Image
            src={homeScreenImgMobile}
            alt="Козметика с шафран"
            priority
            className="absolute inset-0 h-full w-full object-contain object-right-bottom lg:hidden"
          />
          <Image
            src={homeScreenImgDesktop}
            alt="Козметика с шафран"
            priority
            className="absolute inset-0 hidden h-full w-full object-contain object-right-bottom lg:block"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(243,237,247,0.08)_0%,rgba(243,237,247,0)_30%,rgba(243,237,247,0)_100%)] lg:hidden" />
        </div>
      </div>
    </section>
  );
}
