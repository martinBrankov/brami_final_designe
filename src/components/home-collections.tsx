import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { SectionIntro } from "@/components/section-intro";
import { Link } from "@/i18n/navigation";
import { COLLECTION_KEYS, COLLECTION_PATHS, type CollectionKey } from "@/lib/collections";

// Saffron-red accent for the stigma in the saffron icons.
const STIGMA_COLOR = "#d6455d";

/** Crocus (saffron) flower; `x`/`y`/`scale` place a small one inside another icon. */
function Crocus({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M12 3c2.6 3.2 2.6 8.2 0 12c-2.6-3.8-2.6-8.8 0-12Z" />
      <path d="M12 15c-3.6-.4-6.2-3.3-6.7-7.8c2.4.3 4.3 1.6 5.5 3.6" />
      <path d="M12 15c3.6-.4 6.2-3.3 6.7-7.8c-2.4.3-4.3 1.6-5.5 3.6" />
      <path d="M12 15v6" />
      <path d="M12 8.5v3.5" stroke={STIGMA_COLOR} />
    </g>
  );
}

function Leaf({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M5 19c0-8.2 5.2-13.2 14-14c0 8.8-5.2 14-14 14Z" />
      <path d="M5 19c3-5 6.6-8.2 10.5-10" />
    </g>
  );
}

function Face() {
  return (
    <>
      <circle cx="10" cy="14" r="6" />
      <path d="M7.9 13.2h.01M12.1 13.2h.01" strokeWidth="2.2" />
      <path d="M7.8 16c1.3 1.2 3.1 1.2 4.4 0" />
    </>
  );
}

const COLLECTION_ICONS: Record<CollectionKey, ReactNode> = {
  saffron: <Crocus />,
  "saffron-face": (
    <>
      <Face />
      <Crocus x={14} y={0.5} scale={0.42} />
    </>
  ),
  hair: (
    <>
      <path d="M6 20.5v-8.5a6 6 0 0 1 12 0v8.5" />
      <path d="M9 13.5a3 3 0 0 0 6 0v-1.7c-2.1 0-3.9-.8-5-2.3c-.2 1-.5 1.7-1 2.3Z" />
      <path d="M9.5 20.5v-3M14.5 20.5v-3" />
    </>
  ),
  body: (
    <>
      <path d="M12 3.5c3.1 3.7 5.5 6.7 5.5 10a5.5 5.5 0 0 1-11 0c0-3.3 2.4-6.3 5.5-10Z" />
      <path d="M9.3 14a2.7 2.7 0 0 0 2.7 2.7" />
    </>
  ),
  bulgarian: <Leaf />,
  face: (
    <>
      <Face />
      <Leaf x={14} y={0} scale={0.45} />
    </>
  ),
};

/** Links from the home page to every collection (category landing page). */
export function HomeCollections() {
  const t = useTranslations("Home");
  const tCollections = useTranslations("Collections");

  return (
    <section className="w-full border-t border-[#d8d0de] bg-white py-10">
      <div className="px-6 sm:px-10 lg:px-14">
        <SectionIntro title={t("collectionsTitle")} description={t("collectionsText")} />
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTION_KEYS.map((key) => (
            <li key={key}>
              <Link
                href={COLLECTION_PATHS[key]}
                className="group flex h-full items-start gap-4 rounded-[20px] border border-[#eadde4] bg-[#fbf8ff] px-5 py-5 transition hover:bg-[#f5eefa]"
              >
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#d8cae3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,251,0.98)_100%)] text-[#6c3f8d] shadow-[0_8px_18px_rgba(67,40,85,0.12)] transition group-hover:border-[#cbb7d8] group-hover:bg-white">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {COLLECTION_ICONS[key]}
                  </svg>
                </span>
                <span className="block">
                  <span className="block font-serif text-xl leading-snug text-[#432855]">
                    {tCollections(`${key}.title`)}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-[#6b587f]">
                    {tCollections(`${key}.lead`)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
