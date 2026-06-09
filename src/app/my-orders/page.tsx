import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OrderCard } from "@/components/order-card";
import {
  SectionIntro,
  pageSectionClassName,
  sectionPrimaryButtonClassName,
} from "@/components/section-intro";
import { getUserSession } from "@/lib/user-auth";
import { getOrdersForEmail } from "@/lib/user-orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моите поръчки",
  description: "Преглед на поръчките към твоя профил.",
};

export default async function MyOrdersPage() {
  const session = await getUserSession();

  if (!session) {
    redirect("/account");
  }

  const orders = await getOrdersForEmail(session.email);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title="Моите поръчки"
            titleAs="h1"
            size="page"
            description={`Поръчките са свързани с имейла ${session.email}.`}
          />
        </div>
      </section>

      <section className="w-full border-y border-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto max-w-6xl">
            {orders.length === 0 ? (
              <div>
                <p className="text-base text-[#6b587f]">
                  Все още нямаш направени поръчки.
                </p>
                <Link
                  href="/products"
                  className={`mt-6 ${sectionPrimaryButtonClassName}`}
                >
                  Разгледай продуктите
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
