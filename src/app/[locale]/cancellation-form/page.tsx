import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  SectionIntro,
  contentSectionInnerClassName,
  pageSectionClassName,
} from "@/components/section-intro";
import { CancellationForm } from "@/components/cancellation-form";
import { isAppLocale } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";

type CancellationFormPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: CancellationFormPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "CancellationPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: buildAlternates(locale, "/cancellation-form"),
    robots: { index: false, follow: false },
  };
}

export default async function CancellationFormPage({ params }: CancellationFormPageProps) {
  const { locale } = await params;
  if (isAppLocale(locale)) setRequestLocale(locale);
  const t = await getTranslations("CancellationPage");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={pageSectionClassName}>
        <SectionIntro
          title={t("title")}
          titleAs="h1"
          size="page"
          description={t("description")}
          note={t("note")}
          noteClassName="pb-6 sm:pb-10"
        />
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className={contentSectionInnerClassName}>
          <SectionIntro
            title={t("dataTitle")}
            description={t("dataDescription")}
          />
        </div>

        <div className="border-t border-[#d8d0de] bg-[#f8f4fc] px-6 py-8 sm:px-10 lg:px-14">
          <CancellationForm />
        </div>
      </section>
    </main>
  );
}
