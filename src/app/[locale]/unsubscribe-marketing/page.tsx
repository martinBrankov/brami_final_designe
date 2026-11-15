import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MarketingUnsubscribeForm } from "@/components/marketing-unsubscribe-form";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type UnsubscribePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; token?: string }>;
};

export async function generateMetadata({ params }: UnsubscribePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: isAppLocale(locale) ? locale : "bg", namespace: "Unsubscribe" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function UnsubscribeMarketingPage({
  params: routeParams,
  searchParams,
}: UnsubscribePageProps) {
  const { locale } = await routeParams;
  if (isAppLocale(locale)) setRequestLocale(locale);
  const t = await getTranslations("Unsubscribe");
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf9_0%,#f8f1f7_100%)] px-6 py-16 text-[#432855] sm:px-10">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
          Brami
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6b587f]">
          {t("lead")}
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-3xl rounded-[22px] border border-[#eadde4] bg-white p-6 shadow-[0_20px_60px_rgba(67,40,85,0.06)] sm:p-8">
        <MarketingUnsubscribeForm
          initialEmail={params.email ?? ""}
          token={params.token ?? ""}
        />
      </section>
    </main>
  );
}
