import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

import { OrderCard } from "@/components/order-card";
import {
  SectionIntro,
  pageSectionClassName,
  sectionPrimaryButtonClassName,
} from "@/components/section-intro";
import { getUserSession } from "@/lib/user-auth";
import { getOrdersForEmail } from "@/lib/user-orders";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: isAppLocale(locale) ? locale : "bg", namespace: "MyOrders" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function MyOrdersPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : "bg";
  setRequestLocale(locale);
  const t = await getTranslations("MyOrders");
  const session = await getUserSession();

  if (!session) {
    return redirect({ href: "/account", locale });
  }

  const orders = await getOrdersForEmail(session.email);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={t("title")}
            titleAs="h1"
            size="page"
            description={t("description", { email: session.email })}
          />
        </div>
      </section>

      <section className="w-full border-y border-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-6xl">
            {orders.length === 0 ? (
              <div>
                <p className="text-base text-[#6b587f]">
                  {t("empty")}
                </p>
                <Link
                  href="/products"
                  className={`mt-6 ${sectionPrimaryButtonClassName}`}
                >
                  {t("browseProducts")}
                </Link>
              </div>
            ) : (
              <div className="border-t border-[#ece3f2]">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
