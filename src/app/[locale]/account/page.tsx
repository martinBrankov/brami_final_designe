import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountAuthForms } from "@/components/account-auth-forms";
import { AccountProfileForm } from "@/components/account-profile-form";
import {
  SectionIntro,
  pageSectionClassName,
} from "@/components/section-intro";
import { isAppLocale } from "@/i18n/routing";
import { getDisplayName } from "@/lib/display-name";
import { listConfiguredProviders } from "@/lib/oauth";
import { getUserProfile, getUserSession } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ auth_error?: string; auth_detail?: string }> };

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: isAppLocale(locale) ? locale : "bg", namespace: "AccountPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

const OAUTH_ERROR_KEYS = new Set([
  "invalid_state",
  "missing_params",
  "oauth_failed",
  "unsupported_provider",
  "access_denied",
]);

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (isAppLocale(locale)) setRequestLocale(locale);
  const t = await getTranslations("AccountPage");
  const session = await getUserSession();
  const providers = listConfiguredProviders();
  const { auth_error } = await searchParams;
  const oauthError = auth_error
    ? t(OAUTH_ERROR_KEYS.has(auth_error) ? `oauthErrors.${auth_error}` : "oauthErrors.default")
    : null;
  const profile = session ? await getUserProfile(session.id) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={
              session && profile
                ? t("greeting", { name: getDisplayName(profile.fullName, profile.email) })
                : t("title")
            }
            titleAs="h1"
            size="page"
            description={
              session
                ? t("descriptionLoggedIn")
                : t("descriptionLoggedOut")
            }
          />
        </div>
      </section>

      {session && profile ? (
        <>
          <section className="w-full border-y border-[#d8d0de] bg-white">
            <div className="px-6 py-8 sm:px-10 lg:px-14">
              <div className="mx-auto max-w-6xl">
                <AccountProfileForm
                  email={profile.email}
                  initial={{
                    fullName: profile.fullName,
                    phone: profile.phone,
                    city: profile.city,
                    postalCode: profile.postalCode,
                    address: profile.address,
                    marketingSubscription: profile.marketingSubscription,
                  }}
                  initialPreferredOffice={profile.preferredOffice}
                  initialPreferredLocker={profile.preferredLocker}
                  initialHasPassword={profile.hasPassword}
                />
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="w-full border-y border-[#d8d0de] bg-white">
          <div className="px-6 py-10 sm:px-10 lg:px-14">
            <div className="mx-auto flex w-full max-w-[460px] justify-center">
              <AccountAuthForms providers={providers} oauthError={oauthError} />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
