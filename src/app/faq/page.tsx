import type { Metadata } from "next";

import { FaqAskForm } from "@/components/faq-ask-form";
import { FaqList, type FaqListItem } from "@/components/faq-list";
import { getPublishedFaqEntries } from "@/lib/faq";
import { toPlainText } from "@/lib/faq-text";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Често задавани въпроси",
  description:
    "Отговори на често задаваните въпроси за продуктите, доставката, връщането и поръчките в Brami.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Често задавани въпроси | Brami",
    description:
      "Търси сред отговорите на най-често задаваните въпроси или задай своя въпрос към екипа на Brami.",
    url: "/faq",
  },
};

const EXCERPT_LENGTH = 180;

function buildExcerpt(text: string) {
  if (text.length <= EXCERPT_LENGTH) return text;
  return `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

export default async function FaqPage() {
  const entries = await getPublishedFaqEntries();

  const items: FaqListItem[] = entries
    .filter((entry): entry is typeof entry & { slug: string } => Boolean(entry.slug))
    .map((entry) => {
      const answerText = toPlainText(entry.answer ?? "");

      return {
        id: entry.id,
        slug: entry.slug,
        question: entry.question,
        category: entry.category,
        excerpt: buildExcerpt(answerText),
        searchText: `${entry.question} ${answerText} ${entry.category ?? ""}`.toLocaleLowerCase(
          "bg",
        ),
      };
    });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf9_0%,#f8f1f7_44%,#f5edf5_100%)]">
      <section className="border-b border-[#eadde4] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
              Помощен център
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-[#432855] sm:text-5xl lg:text-[4rem]">
              Често задавани въпроси
            </h1>
            <p className="mt-6 text-lg leading-8 text-[#6b587f]">
              Събрахме отговорите на въпросите, които получаваме най-често — за
              продуктите, доставката, връщането и поръчките. Използвай търсачката,
              за да намериш своя отговор за секунди.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
        {items.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-[#ddd3e4] bg-white/70 px-6 py-12 text-center">
            <p className="font-serif text-2xl text-[#432855]">
              Още няма публикувани въпроси
            </p>
            <p className="mt-3 text-sm leading-7 text-[#6b587f]">
              Задай своя въпрос във формуляра по-долу — ще отговорим и ще го
              публикуваме тук.
            </p>
          </div>
        ) : (
          <FaqList items={items} />
        )}
      </section>

      <section className="w-full border-y border-[#ece3f2] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
            Не намери отговор?
          </p>
          <h2 className="mt-3 font-serif text-3xl text-[#432855] sm:text-4xl">
            Задай своя въпрос
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#6b587f]">
            Изпрати ни въпроса си — екипът ни ще подготви отговор и ще го публикува
            на тази страница, за да помогне и на останалите.
          </p>

          <div className="mt-8">
            <FaqAskForm />
          </div>
        </div>
      </section>
    </main>
  );
}
