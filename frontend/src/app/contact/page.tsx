import {
  SectionIntro,
  contentSectionClassName,
  contentSectionInnerClassName,
  pageSectionClassName,
  sectionPrimaryButtonClassName,
} from "@/components/section-intro";

const contactItems = [
  {
    title: "Адрес",
    value: "гр. София, кв. Кривина, ул. „Демокрация“ 13",
  },
  {
    title: "Телефон",
    value: "+359 889 342 781",
  },
  {
    title: "Имейл",
    value: "info@brami-trade.com",
  },
  {
    title: "Продажби",
    value: "sales@brami-trade.com",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={pageSectionClassName}>
        <div className="mb-8">
          <SectionIntro
            title="Контакти"
            titleAs="h1"
            size="page"
            description="Свържи се с нас за въпроси относно продукти, поръчки, доставки и партньорства."
            note="Можете да се свържете с нас в работни дни от 09:00 до 18:00."
          />
        </div>
      </section>

      <section className={contentSectionClassName}>
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
          {contactItems.map((item, index) => (
            <article
              key={item.title}
              className={`px-6 py-8 sm:px-10 lg:px-14 ${
                index > 0 ? "border-t border-[#ece4f1] md:border-t-0" : ""
              } ${index % 2 === 1 ? "md:border-l md:border-[#ece4f1]" : ""} ${
                index >= 2 ? "xl:border-t-0" : ""
              } ${index >= 2 ? "xl:border-l xl:border-[#ece4f1]" : ""}`}
            >
              <p className="text-sm uppercase tracking-[0.18em] text-[#8f72a7]">
                {item.title}
              </p>
              <p className="mt-3 text-xl font-medium leading-8 text-[#432855]">
                {item.value}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className={contentSectionInnerClassName}>
          <SectionIntro
            title="Контактна форма"
            description="Изпрати запитване и ще се свържем с теб възможно най-скоро."
          />
        </div>

        <div className="border-t border-[#d8d0de] bg-[#f8f4fc] px-6 py-8 sm:px-10 lg:px-14">
          <form className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
              Име
              <input
                type="text"
                placeholder="Въведи име"
                className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[#432855]">
              Имейл
              <input
                type="email"
                placeholder="Въведи имейл"
                className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
              Тема
              <input
                type="text"
                placeholder="Например: Въпрос за продукт или поръчка"
                className="h-12 rounded-[18px] border border-[#ddd3e4] bg-white px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[#432855] sm:col-span-2">
              Съобщение
              <textarea
                rows={6}
                placeholder="Опиши как можем да помогнем"
                className="rounded-[18px] border border-[#ddd3e4] bg-white px-4 py-3 text-[#432855] outline-none transition focus:border-[#9f79ac]"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className={sectionPrimaryButtonClassName}
              >
                Изпрати запитване
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
