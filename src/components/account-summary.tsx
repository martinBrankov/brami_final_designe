"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { useUser } from "@/components/user-provider";

export function AccountSummary() {
  const t = useTranslations("AccountSummary");
  const { user } = useUser();

  if (!user) {
    return null;
  }

  const canAccessAdmin = user.role === "admin";

  return (
    <section className="w-full">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
        {t("title")}
      </p>
      <h1 className="mt-2 font-serif text-4xl text-[#432855] sm:text-5xl">
        {t("greeting", { name: user.username })}
      </h1>

      <dl className="mt-8 text-sm">
        <div className="flex flex-col gap-1 border-b border-[#ece3f2] pb-3">
          <dt className="text-xs uppercase tracking-[0.12em] text-[#8f72a7]">{t("email")}</dt>
          <dd className="text-base font-medium text-[#432855]">{user.email}</dd>
        </div>
      </dl>

      {canAccessAdmin ? (
        <div className="mt-8">
          <Link
            href="/admin-panel"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#432855] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-[#432855] transition hover:bg-[#432855] hover:text-white"
          >
            {t("toAdmin")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
