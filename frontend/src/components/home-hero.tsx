import Image from "next/image";
import Link from "next/link";

import homeScreenImgMobile from "@/assets/images/homeScreenImgMobile.jpg";

export function HomeHero() {
  return (
    <section className="w-full">
      <div className="grid w-full overflow-hidden border-y border-y-[#d8d0de] bg-[#f5f7fb] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <h1 className="max-w-[12ch] font-serif text-[2.35rem] leading-[1.02] text-[#2f1d46] sm:text-5xl lg:text-[4.2rem]">
            Сияйна и подмладена кожа с кокиче
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#5f4b73] sm:text-lg">
            Премиум грижа с екстракт от българско кокиче за дълбока
            хидратация и естествен блясък.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex h-14 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-7 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-105"
            >
              Виж продуктите
            </Link>
            <Link
              href="/about"
              className="inline-flex h-14 items-center justify-center rounded-full border border-[#d8d0de] bg-white/78 px-7 text-sm font-semibold uppercase tracking-[0.08em] text-[#4B2E6F] transition hover:bg-white"
            >
              Научи повече
            </Link>
          </div>
        </div>

        <div className="relative min-h-[320px] bg-[#f5f7fb] sm:min-h-[420px] lg:min-h-[560px]">
          <Image
            src={homeScreenImgMobile}
            alt="Козметика с кокиче"
            priority
            className="absolute inset-0 h-full w-full object-contain object-right-bottom"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(243,237,247,0.08)_0%,rgba(243,237,247,0)_30%,rgba(243,237,247,0)_100%)] lg:hidden" />
        </div>
      </div>
    </section>
  );
}
