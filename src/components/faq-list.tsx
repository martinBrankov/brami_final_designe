"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

export type FaqListItem = {
  id: string;
  slug: string;
  question: string;
  category: string | null;
  excerpt: string;
  /** Lowercased question + answer, prepared on the server for fast filtering. */
  searchText: string;
};

const ALL_CATEGORIES = "all";

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function FaqList({ items }: { items: FaqListItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const deferredQuery = useDeferredValue(query);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.category) unique.add(item.category);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "bg"));
  }, [items]);

  const filtered = useMemo(() => {
    const terms = deferredQuery
      .trim()
      .toLocaleLowerCase("bg")
      .split(/\s+/)
      .filter(Boolean);

    return items.filter((item) => {
      if (category !== ALL_CATEGORIES && item.category !== category) return false;
      return terms.every((term) => item.searchText.includes(term));
    });
  }, [items, deferredQuery, category]);

  return (
    <div>
      <div className="rounded-[26px] border border-[#eadde4] bg-white p-5 shadow-[0_16px_50px_rgba(67,40,85,0.05)] sm:p-6">
        <label htmlFor="faq-search" className="sr-only">
          Търсене във въпросите и отговорите
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#9f79ac]">
            <SearchIcon />
          </span>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Търси по ключова дума — например „доставка“ или „връщане“"
            className="h-14 w-full rounded-[18px] border border-[#ddd3e4] bg-[#fdfbfe] pl-12 pr-4 text-[#432855] outline-none transition placeholder:text-[#a897b5] focus:border-[#9f79ac] focus:bg-white"
          />
        </div>

        {categories.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory(ALL_CATEGORIES)}
              className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                category === ALL_CATEGORIES
                  ? "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
                  : "border border-[#e2d3e6] bg-white text-[#6b587f] hover:bg-[#faf7fc]"
              }`}
            >
              Всички
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  category === name
                    ? "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
                    : "border border-[#e2d3e6] bg-white text-[#6b587f] hover:bg-[#faf7fc]"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}

        <p className="mt-4 text-sm text-[#8f72a7]" aria-live="polite">
          {filtered.length === items.length
            ? `${items.length} въпроса`
            : `${filtered.length} от ${items.length} въпроса`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-[26px] border border-dashed border-[#ddd3e4] bg-white/70 px-6 py-12 text-center">
          <p className="font-serif text-2xl text-[#432855]">Няма намерени въпроси</p>
          <p className="mt-3 text-sm leading-7 text-[#6b587f]">
            Опитай с друга дума или ни задай въпроса си във формуляра по-долу — ще
            отговорим и ще го публикуваме тук.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={`/faq/${item.slug}`}
                className="group flex items-center gap-4 rounded-[22px] border border-[#eadde4] bg-white px-5 py-5 shadow-[0_14px_40px_rgba(67,40,85,0.04)] transition hover:border-[#d9c6e0] hover:shadow-[0_18px_50px_rgba(67,40,85,0.09)] sm:px-7"
              >
                <div className="min-w-0 flex-1">
                  {item.category ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f72a7]">
                      {item.category}
                    </p>
                  ) : null}
                  <h3 className="mt-1.5 font-serif text-xl leading-snug text-[#432855]">
                    {item.question}
                  </h3>
                  {item.excerpt ? (
                    <p className="mt-2 text-sm leading-7 text-[#6b587f] line-clamp-2">
                      {item.excerpt}
                    </p>
                  ) : null}
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e2d3e6] text-[#6c3f8d] transition group-hover:bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] group-hover:text-white"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
