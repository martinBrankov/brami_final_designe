"use client";

import { useState, type FormEvent } from "react";

export function ArticleSubscriptionForm() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitted(true);
    setEmail("");
  }

  return (
    <section className="w-full border-y border-[#ece3f2] bg-white">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-14">
        <div className="grid gap-8 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-12 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
              Нови статии
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-[#432855] sm:text-4xl">
              Абонирай се за следващите теми за красота и грижа
            </h2>
            <p className="mt-4 text-base leading-7 text-[#6b587f]">
              Формата е демонстрационна и засега не записва данни. Използваме я,
              за да подготвим секцията за бъдещ бюлетин.
            </p>
          </div>

          <div className="lg:border-l lg:border-[#ece3f2] lg:pl-12">
            <form onSubmit={handleSubmit} className="flex flex-col justify-center gap-3">
              <label htmlFor="article-email" className="text-sm font-medium text-[#5f4b73]">
                Имейл адрес
              </label>
              <input
                id="article-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (isSubmitted) {
                    setIsSubmitted(false);
                  }
                }}
                placeholder="you@example.com"
                required
                className="h-[52px] rounded-full border border-[#ddd3e4] bg-white px-5 text-[#432855] outline-none transition focus:border-[#9f79ac]"
              />
              <button
                type="submit"
                className="inline-flex h-[52px] items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:opacity-95"
              >
                Абонирай ме
              </button>
              <p className="min-h-6 text-sm leading-6 text-[#6b587f]">
                {isSubmitted
                  ? "Благодарим. Формата е тестова, но дизайнът е готов за свързване."
                  : "Ще използваме този блок по-късно за реално записване към нови статии."}
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
