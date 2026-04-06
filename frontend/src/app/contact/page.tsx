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
      <section className="w-full px-6 pb-0 pt-12 sm:px-10 sm:pt-16 lg:px-14">
        <div className="mb-8 max-w-4xl">
          <h1 className="font-serif text-4xl text-[#432855] sm:text-5xl">
            Контакти
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-[#6b587f]">
            Свържи се с нас за въпроси относно продукти, поръчки, доставки и
            партньорства.
          </p>
          <p className="mt-4 text-base font-medium text-[#432855]">
            Можете да се свържете с нас в работни дни от 09:00 до 18:00.
          </p>
        </div>
      </section>

      <section className="w-full border-y border-[#d8d0de] bg-white">
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
        <div className="px-6 py-10 sm:px-10 lg:px-14">
          <div className="max-w-3xl">
            <h2 className="font-serif text-3xl text-[#432855] sm:text-4xl">
              Контактна форма
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-[#6b587f]">
              Изпрати запитване и ще се свържем с теб възможно най-скоро.
            </p>
          </div>
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
                className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white"
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
