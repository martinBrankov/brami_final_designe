import Image from "next/image";

import addelaSunny from "@/assets/images/about/addelaSunny.jpg";
import garden from "@/assets/images/about/garden.jpg";
import saffron from "@/assets/images/about/saffron.jpg";

const values = [
  "Натурални съставки",
  "Деликатна грижа",
  "Чисти формули",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen space-y-6 bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)] pb-6">
      <section className="w-full border-b border-[#d8d0de] bg-white">
        <div className="grid min-h-[520px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex items-center px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                За нас
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-[#432855] sm:text-5xl lg:text-[3.8rem]">
                Българска грижа, вдъхновена от природата
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#6b587f]">
                BRAMI съчетава внимателно подбрани съставки, меко усещане върху
                кожата и чист визуален език. Създаваме продукти, които носят
                усещане за грижа, спокойствие и ежедневен комфорт.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {values.map((value) => (
                  <span
                    key={value}
                    className="rounded-full border border-[#ddd3e4] bg-[#faf7fc] px-4 py-2 text-sm font-medium text-[#432855]"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[320px] border-t border-[#d8d0de] lg:min-h-full lg:border-l lg:border-t-0">
            <Image
              src={garden}
              alt="Градина с насаждения за натурална козметика"
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[320px] border-b border-[#d8d0de] lg:min-h-[460px] lg:border-b-0 lg:border-r">
            <Image
              src={saffron}
              alt="Шафран и натурални съставки"
              fill
              className="object-cover"
            />
          </div>

          <div className="flex items-center px-6 py-14 sm:px-10 lg:px-14 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                Нашият подход
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-[#432855] sm:text-4xl">
                Формули с фокус върху ефективност и нежно усещане
              </h2>
              <div className="mt-6 space-y-4 text-base leading-8 text-[#5f4b73]">
                <p>
                  Вярваме, че добрата козметика трябва да бъде едновременно
                  приятна за използване и ясна като състав. Затова подхождаме с
                  внимание към текстурата, аромата и усещането след всяка
                  употреба.
                </p>
                <p>
                  Подбираме активи и натурални компоненти така, че продуктите да
                  се вписват спокойно в ежедневната грижа за лице, тяло и коса.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white">
        <div className="grid lg:grid-cols-[1fr_1fr]">
          <div className="flex items-center px-6 py-14 sm:px-10 lg:px-14 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                BRAMI
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-[#432855] sm:text-4xl">
                Грижа, която изглежда премиум и остава близка до природата
              </h2>
              <div className="mt-6 space-y-4 text-base leading-8 text-[#5f4b73]">
                <p>
                  За нас красотата на продукта не е само във визията. Тя е и в
                  начина, по който се усеща върху кожата, в чистотата на
                  формулата и в доверието, което изгражда с всяка следваща
                  употреба.
                </p>
                <p>
                  Развиваме BRAMI като марка с ясен характер: мека естетика,
                  внимателен подбор на съставки и продукти, които създават
                  усещане за качество още от първия допир.
                </p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[320px] border-t border-[#d8d0de] lg:min-h-[460px] lg:border-l lg:border-t-0">
            <Image
              src={addelaSunny}
              alt="Продукти BRAMI"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </main>
  );
}