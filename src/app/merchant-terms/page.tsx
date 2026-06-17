import type { Metadata } from "next";

import {
  SectionIntro,
  pageSectionClassName,
} from "@/components/section-intro";
import { MERCHANT_TIERS } from "@/lib/merchant-tier";

export const metadata: Metadata = {
  title: "Условия за търговец",
  description:
    "Условия на програмата за търговци на Brami — нива на отстъпка, промо кодове, дивиденти и изплащане.",
};

function formatThreshold(value: number) {
  return `€${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

export default function MerchantTermsPage() {
  const paidTiers = MERCHANT_TIERS.filter((tier) => tier.percent > 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-3xl">
          <SectionIntro
            title="Условия за търговец"
            titleAs="h1"
            size="page"
            description="Прочети как работи програмата за търговци, преди да приемеш условията."
          />
        </div>
      </section>

      <section className="w-full border-y border-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-3xl space-y-10 text-[#432855]">
            <div>
              <h2 className="font-serif text-2xl">1. Програма за търговци</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">
                Като търговец получаваш лична отстъпка върху продуктите и можеш да
                създаваш промо кодове, които да споделяш с клиенти. От всяка поръчка,
                направена с твой код, ти натрупваш дивидент (комисиона). Достъпът до
                търговския панел и отстъпките се активират, след като приемеш тези
                условия.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl">2. Нива на отстъпка</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">
                Отстъпката ти расте спрямо твоя <strong>общ оборот</strong>. В оборота
                влизат само <strong>доставени</strong> поръчки — твои собствени и
                направени с твоите промо кодове. Недоставените и отказаните поръчки не
                се натрупват.
              </p>
              <ul className="mt-4 divide-y divide-[#ece3f2] overflow-hidden rounded-[14px] border border-[#ece3f2]">
                {paidTiers.map((tier) => (
                  <li
                    key={tier.thresholdEur}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold">{tier.percent}% отстъпка</span>
                    <span className="text-[#8f72a7]">
                      при оборот от {formatThreshold(tier.thresholdEur)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">
                Администраторът може да ти зададе <strong>стартова отстъпка</strong>,
                която важи веднага, независимо от оборота. В този случай нивата под нея
                се включват в старта, а по-високите се отключват с нарастване на оборота.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl">3. Промо кодове и разпределение</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">
                За всеки промо код разпределяш текущата си отстъпка (пула) между две части:
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#5b4a6b]">
                <li>
                  <strong>Отстъпка за клиента</strong> — намалението, което получава
                  купувачът при поръчка с кода.
                </li>
                <li>
                  <strong>Твой дивидент</strong> — частта, която остава за теб като
                  комисиона.
                </li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">
                Сборът от двете не може да надвишава текущия ти пул. Ако пулът се намали
                (например при промяна на стартовата отстъпка от администратора) и сборът
                по даден код вече го надвишава, кодът се деактивира автоматично.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl">4. Изплащане на дивиденти</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">
                Дивидент се натрупва само за <strong>доставени</strong> поръчки. До
                доставка комисионата стои като „Очаква доставка“; след доставка става
                „Готова за изплащане“. Дължимите комисиони се изплащат по{" "}
                <strong>банков път в края на всеки месец</strong>.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">
                За да получаваш дивиденти, трябва да предоставиш{" "}
                <strong>валидна банкова сметка</strong> — титуляр, IBAN и BIC код.
                Поддържай данните актуални в профила си; преводите се извършват по
                посочената сметка.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">
                <strong>Брами Трейд ЕООД</strong> не носи отговорност за невалидни,
                неточни или неактуални банкови данни, предоставени от търговеца, както и
                за забавени, неуспешни или погрешни преводи, произтичащи от тях.
                Отговорността за коректността на данните е изцяло на търговеца.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-2xl">5. Оттегляне на съгласие</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4a6b]">
                Можеш да оттеглиш съгласието си по всяко време от профила си. Тогава:
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#5b4a6b]">
                <li>профилът ти става обикновен потребител и губиш достъп до търговския панел;</li>
                <li>търговските отстъпки спират да се прилагат;</li>
                <li>всички твои промо кодове стават неактивни;</li>
                <li>
                  данните за промо кодове, поръчки и натрупани комисиони{" "}
                  <strong>не се изтриват</strong>;
                </li>
                <li>
                  вече дължимите комисиони се изплащат по банков път в края на месеца,
                  дори след отказ.
                </li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4a6b]">
                За повторно активиране като търговец е необходимо{" "}
                <strong>администратор да смени ролята ти</strong> на търговец отново.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
