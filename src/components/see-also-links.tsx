import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { COLLECTION_PATHS } from "@/lib/collections";

// Pages that other pages link to under "See also". The keys are the label
// keys in messages/<locale>/common.json → "Footer.links".
export const SEE_ALSO_PAGES = {
  products: "/products",
  saffronCosmetics: COLLECTION_PATHS.saffron,
  faceCare: COLLECTION_PATHS.face,
  hairCare: COLLECTION_PATHS.hair,
  bodyCare: COLLECTION_PATHS.body,
  bulgarianCosmetics: COLLECTION_PATHS.bulgarian,
  about: "/about",
  beautyCare: "/beauty-care",
  faq: "/faq",
  contact: "/contact",
  partners: "/partners",
  deliveryReturns: "/delivery-returns",
  cancellationForm: "/cancellation-form",
  terms: "/terms",
  privacyPolicy: "/privacy-policy",
} as const;

export type SeeAlsoPage = keyof typeof SEE_ALSO_PAGES;

export const COLLECTION_PAGES = [
  "saffronCosmetics",
  "bulgarianCosmetics",
  "faceCare",
  "hairCare",
  "bodyCare",
] as const satisfies readonly SeeAlsoPage[];

type SeeAlsoProps = { locale: AppLocale; pages: readonly SeeAlsoPage[] };

/** Row of links to related pages (no surrounding section). */
export async function SeeAlsoPills({ locale, pages }: SeeAlsoProps) {
  const t = await getTranslations({ locale, namespace: "Footer" });

  return (
    <nav aria-label={t("seeAlso")}>
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#8f72a7]">
        {t("seeAlso")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {pages.map((page) => (
          <Link
            key={page}
            href={SEE_ALSO_PAGES[page]}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d8d0de] bg-white px-4 py-2 text-sm font-medium text-[#432855] transition hover:bg-[#faf7fc]"
          >
            {t(`links.${page}`)}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** "See also" links as a full-width section at the end of a page. */
export function SeeAlsoLinks(props: SeeAlsoProps) {
  return (
    <section className="w-full border-t border-[#d8d0de] bg-white">
      <div className="px-6 py-8 sm:px-10 lg:px-14">
        <SeeAlsoPills {...props} />
      </div>
    </section>
  );
}
