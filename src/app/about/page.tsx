import type { Metadata } from "next";
import Image from "next/image";

import addelaSunny from "@/assets/images/about/addelaSunny.jpg";

export const metadata: Metadata = {
  title: "За нас",
  description:
    "Научи повече за Brami — българска козметична марка, вдъхновена от природата. Натурални съставки, чисти формули и деликатна грижа за лице, тяло и коса.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "За нас | Brami",
    description:
      "Brami съчетава натурални съставки, мека текстура и чист визуален език за ежедневна грижа с качество.",
    url: "/about",
  },
};
import garden from "@/assets/images/about/garden.jpg";
import saffron from "@/assets/images/about/saffron.jpg";

const values = [
  "Натурални съставки",
  "Деликатна грижа",
  "Чисти формули",
  "Отлична биосъвместимост с дермата",
  "„Меки“ консерванти, които се срещат в природата - Зелен стандарт в натуралната козметика", 
  "Естествени ароматни компоненти"
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
            Нашата история
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-tight text-[#432855] sm:text-4xl">
            Всичко започна с шафрана
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-[#5f4b73]">
            <p>
              Всичко започна с решението ни да отглеждаме шафран в България.
              Очаровани от свойствата му, пожелахме да дадем на пазара нещо
              различно и нещо, което към този момент липсваше. Така се роди
              козметичната линия Saffron Adela Sunny, в старта си с измивни
              продукти за коса и тяло с шафран. Името крие асоциация със
              слънчевия, златист цвят, който шафранът дава при разтваряне, с
              неговата абсолютна чистота и изумителна сила, с която това нежно
              цвете се изправя гордо за цъфтеж в хладните есенни дни.
            </p>
            <p>
              Нашето проучване от 2019 - 2021 г. потвърди липсата на този вид
              измивни продукти за коса и тяло с шафран (Crocus Sativus), които да
              са създадени и произведени в България, и от българи. Като
              първопроходци в грижата за коса и тяло с Crocus Sativus, ние
              успешно създадохме този пазарен сегмент от нулата. А продуктът
              шампоан за коса с шафран стана абсолютен лидер в портфолиото на
              бранда ни. Най-голямата ни награда са стотиците обратни връзки.
              Клиентите споделят, че шампоанът успешно спира косопада, елиминира
              пърхута и помага при проблеми със скалпа. Потребителите описват
              ефекта с думите: „Изпълва косата с живот“ и „Чувствам я като след
              фризьор“. Това ни даде основание да създадем и балсама за коса,
              който успешно допълни идеята за максимално натурална и не сложна
              грижа, която носи резултати с устойчивост във времето.
            </p>
            <p>
              Философията, която ни води напред е, че с българско вдъхновение и
              смелост може да бъдеш иноватор и да създаваш козметика с
              категорични пазарни резултати и потребителско признание.
            </p>
            <p>Благодарим Ви за обратните връзки и доверието!</p>
          </div>
          <p className="mt-8 font-serif text-xl italic text-[#432855]">
            С обич Rumyana Brankova и Brami Trade
          </p>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-white">
        <div className="grid min-h-[520px] lg:grid-cols-2">
          <div className="flex items-center px-6 pt-14 pb-7 sm:px-10 lg:px-14 lg:pt-20 lg:pb-0">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                За нас
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-[#432855] sm:text-5xl lg:text-[3.8rem]">
                Българска грижа, вдъхновена от природата
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#6b587f]">
                Brami съчетава внимателно подбрани съставки, меко усещане върху
                кожата и чист визуален език. Създаваме продукти, които носят
                усещане за грижа, спокойствие и ежедневен комфорт.
              </p>

              <ul className="mt-8 space-y-2">
                {values.map((value) => (
                  <li key={value} className="flex items-baseline gap-2.5 text-sm font-medium text-[#432855]">
                    <svg viewBox="0 0 10 8" className="h-3 w-3 shrink-0 translate-y-[1px] text-[#6c3f8d]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 4l3 3 5-6" />
                    </svg>
                    {value}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#d8d0de] lg:border-t-0">
            <Image
              src={garden}
              alt="Градина с насаждения за натурална козметика"
              priority
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className="grid lg:grid-cols-2">
          <div className="order-2 border-t border-[#d8d0de] lg:order-none lg:border-t-0">
            <Image
              src={saffron}
              alt="Шафран и натурални съставки"
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="flex items-center border-b border-[#d8d0de] px-6 py-14 sm:px-10 lg:border-b-0 lg:px-14 lg:py-16">
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
                  Подбираме активни и натурални компоненти така, че продуктите да
                  се вписват спокойно в ежедневната грижа за лице, тяло и коса.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white">
        <div className="grid lg:grid-cols-2">
          <div className="flex items-center px-6 pt-14 pb-0 sm:px-10 lg:px-14 lg:pt-16">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
                Brami
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
                  Развиваме Brami като марка с ясен характер: мека естетика,
                  внимателен подбор на съставки и продукти, които създават
                  усещане за качество още от първия допир.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#d8d0de] lg:border-t-0">
            <Image
              src={addelaSunny}
              alt="Натурална козметика Brami — продукти за лице, тяло и коса"
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
