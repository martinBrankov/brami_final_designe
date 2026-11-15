import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import homeScreenImgDesktop from "@/assets/images/brami-naturalna-balgarska-kozmetika-s-shafran-desktop.jpg";
import homeScreenImgMobile from "@/assets/images/brami-naturalna-balgarska-kozmetika-s-shafran-mobile.png";
import {
  SectionIntro,
  sectionActionClassName,
  sectionPrimaryButtonClassName,
} from "@/components/section-intro";

export function HomeHero() {
  const t = useTranslations("Home");

  return (
    <section className="w-full">
      <div className="grid w-full overflow-hidden border-y border-y-[#d8d0de] bg-[#f5f7fb] [@media(orientation:portrait)]:min-h-[100dvh] lg:grid-cols-[1.05fr_0.95fr] lg:[@media(orientation:portrait)]:min-h-0">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <SectionIntro
            title={t.rich("heroTitle", {
              sup: (chunks) => <sup className="text-[0.45em] align-super">{chunks}</sup>,
            })}
            titleAs="h1"
            size="hero"
            contentClassName="max-w-[36rem]"
            titleClassName="max-w-[12ch] max-lg:max-w-full max-lg:w-full"
            description={t("heroDescription")}
          >
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className={sectionPrimaryButtonClassName}>
                {t("viewProducts")}
              </Link>
              <Link
                href="/about"
                className={`${sectionActionClassName} bg-white/90`}
              >
                {t("learnMore")}
              </Link>
            </div>
          </SectionIntro>
        </div>

        <div className="relative bg-[#f5f7fb] lg:min-h-[560px]">
          <Image
            src={homeScreenImgMobile}
            alt={t("heroImageAlt")}
            priority
            className="block w-full h-auto object-contain object-left-bottom lg:hidden"
          />
          <Image
            src={homeScreenImgDesktop}
            alt={t("heroImageAlt")}
            priority
            className="absolute inset-0 hidden h-full w-full object-contain object-right-bottom lg:block"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(243,237,247,0.08)_0%,rgba(243,237,247,0)_30%,rgba(243,237,247,0)_100%)] lg:hidden" />
        </div>
      </div>
    </section>
  );
}
