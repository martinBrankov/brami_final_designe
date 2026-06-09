"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";

export function ArticleSubscriptionForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const issuedAt = useMemo(() => Date.now(), []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch("/api/marketing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website, issuedAt }),
      });

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.ok) {
        setFeedback({
          kind: "error",
          message: result?.error || "Абонаментът не беше записан. Опитай отново.",
        });
        return;
      }

      setFeedback({
        kind: "success",
        message: "Благодарим. Имейлът е добавен към списъка за маркетинг съобщения.",
      });
      setEmail("");
      setWebsite("");
    });
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
              Получавай нови статии, промоции и подбрани предложения от Brami.
              Можеш да се отпишеш по всяко време от линка в имейлите.
            </p>
          </div>

          <div className="lg:border-l lg:border-[#ece3f2] lg:pl-12">
            <form onSubmit={handleSubmit} className="flex flex-col justify-center gap-3">
              <label className="hidden" aria-hidden="true">
                Website
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </label>

              <label htmlFor="article-email" className="text-sm font-medium text-[#5f4b73]">
                Имейл адрес
              </label>
              <input
                id="article-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFeedback(null);
                }}
                placeholder="you@example.com"
                required
                disabled={isPending}
                className="h-[52px] rounded-full border border-[#ddd3e4] bg-white px-5 text-[#432855] outline-none transition focus:border-[#9f79ac] disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-[52px] items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Запис..." : "Абонирай ме"}
              </button>
              <p
                className={`min-h-6 text-sm leading-6 ${
                  feedback?.kind === "error" ? "text-[#9a3f3f]" : "text-[#6b587f]"
                }`}
              >
                {feedback?.message ??
                  "Ще използваме имейла само за маркетинг съобщения от Brami."}
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
