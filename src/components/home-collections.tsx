import { useTranslations } from "next-intl";

import { SectionIntro } from "@/components/section-intro";
import { Link } from "@/i18n/navigation";
import { COLLECTION_KEYS, COLLECTION_PATHS } from "@/lib/collections";

/** Links from the home page to every collection (category landing page). */
export function HomeCollections() {
  const t = useTranslations("Home");
  const tCollections = useTranslations("Collections");

  return (
    <section className="w-full border-t border-[#d8d0de] bg-white py-10">
      <div className="px-6 sm:px-10 lg:px-14">
        <SectionIntro title={t("collectionsTitle")} description={t("collectionsText")} />
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {COLLECTION_KEYS.map((key) => (
            <li key={key}>
              <Link
                href={COLLECTION_PATHS[key]}
                className="block h-full rounded-[20px] border border-[#eadde4] bg-[#fbf8ff] px-5 py-5 transition hover:bg-[#f5eefa]"
              >
                <span className="font-serif text-xl leading-snug text-[#432855]">
                  {tCollections(`${key}.title`)}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[#6b587f]">
                  {tCollections(`${key}.lead`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
