import type { Metadata } from "next";

import { MarketingUnsubscribeForm } from "@/components/marketing-unsubscribe-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Отписване от маркетинг съобщения",
  description: "Отписване от рекламни и маркетинг имейли от Brami.",
  alternates: { canonical: "/unsubscribe-marketing" },
};

export default async function UnsubscribeMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf9_0%,#f8f1f7_100%)] px-6 py-16 text-[#432855] sm:px-10">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
          Brami
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
          Отписване от маркетинг съобщения
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6b587f]">
          Потвърди имейл адреса, който не желае повече да получава промоции,
          новини и рекламни съобщения.
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
