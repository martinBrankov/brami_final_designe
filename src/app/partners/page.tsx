import type { Metadata } from "next";

import {
  SectionIntro,
  contentSectionClassName,
  pageSectionClassName,
} from "@/components/section-intro";

export const metadata: Metadata = {
  title: "Партньори",
  description:
    "Партньорите на Brami — World of Saffron и VODITSA. Български марки за натурална козметика и качествени продукти с шафран.",
  alternates: { canonical: "/partners" },
  openGraph: {
    title: "Партньори | Brami",
    description:
      "Запознай се с партньорите на Brami — World of Saffron и VODITSA.",
    url: "/partners",
  },
};

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 5H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3" />
      <path d="M12 4h4v4M16 4l-7 7" />
    </svg>
  );
}

type Partner = {
  name: string;
  url: string;
  displayUrl: string;
  tagline: string;
  description: string;
  tags: string[];
};

const partners: Partner[] = [
  {
    name: "World of Saffron",
    url: "https://worldofsaffron.bg/",
    displayUrl: "worldofsaffron.bg",
    tagline: "Български шафран",
    description:
      "World of Saffron (Шафран Трейд ООД) предлага един от най-качествените български шафрани, нареждащ се сред първите в Европа, както и иновативни продукти с него — козметика, храни и напитки, създадени с грижа към природата.",
    tags: ["Български шафран", "Натурални продукти", "Козметика", "Премиум качество"],
  },
  {
    name: "VODITSA",
    url: "https://voditsa-cosmetics.com",
    displayUrl: "voditsa-cosmetics.com",
    tagline: "Натурална козметика",
    description:
      "VODITSA (Арт Ъп ЕООД) е българска марка натурална козметика, специализирана в анти-ейдж грижа за зряла и суха кожа. Сигнатурната съставка е екстракт от тубероза, ценен със своите подмладяващи и озаряващи свойства.",
    tags: ["Натурална козметика", "Анти-ейдж", "Екстракт от тубероза", "Грижа за лице"],
  },
];

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={pageSectionClassName}>
        <div className="mb-8">
          <SectionIntro
            title="Партньори"
            titleAs="h1"
            size="page"
            description="Работим с български марки, които споделят нашата отдаденост към натуралните съставки и качеството."
            note="Разгледай сайтовете на нашите партньори."
          />
        </div>
      </section>

      <section className={contentSectionClassName}>
        <div className="grid gap-0 md:grid-cols-2">
          {partners.map((partner, index) => (
            <article
              key={partner.url}
              className={`px-6 py-8 sm:px-10 lg:px-14 ${
                index > 0 ? "border-t border-[#ece4f1] md:border-t-0 md:border-l" : ""
              }`}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cae3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,251,0.98)_100%)] text-[#432855] shadow-[0_8px_18px_rgba(67,40,85,0.08)]">
                <GlobeIcon />
              </div>
              <p className="mt-4 text-sm uppercase tracking-[0.18em] text-[#8f72a7]">
                {partner.tagline}
              </p>
              <p className="mt-3 text-xl font-medium leading-8 text-[#432855]">
                {partner.name}
              </p>
              <p className="mt-3 text-base leading-7 text-[#6b587f]">
                {partner.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {partner.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-[#f3edf7] px-3 py-1 text-xs font-medium text-[#6c3f8d]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <a
                href={partner.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-6 inline-flex items-center gap-2 text-base font-medium text-[#432855] underline underline-offset-4 transition hover:text-[#6c3f8d]"
              >
                Посети сайта · {partner.displayUrl}
                <ExternalLinkIcon />
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
