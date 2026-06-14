import type { Metadata } from "next";

import { AccountAuthForms } from "@/components/account-auth-forms";
import { AccountProfileForm } from "@/components/account-profile-form";
import {
  SectionIntro,
  pageSectionClassName,
} from "@/components/section-intro";
import { getDisplayName } from "@/lib/display-name";
import { listConfiguredProviders } from "@/lib/oauth";
import { getUserProfile, getUserSession } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моят профил",
  description: "Вход и регистрация за клиенти на Brami.",
};

type SearchParams = Promise<{ auth_error?: string; auth_detail?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Сесията за вход изтече. Опитай отново.",
  missing_params: "Доставчикът не върна нужните данни.",
  oauth_failed: "Неуспешен вход през доставчика.",
  unsupported_provider: "Неподдържан доставчик.",
  access_denied: "Отказан достъп от доставчика.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getUserSession();
  const providers = listConfiguredProviders();
  const { auth_error } = await searchParams;
  const oauthError = auth_error ? ERROR_MESSAGES[auth_error] ?? "Неуспешен вход." : null;
  const profile = session ? await getUserProfile(session.id) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <section className={`${pageSectionClassName} pb-6 sm:pb-12`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={
              session && profile
                ? `Здравей, ${getDisplayName(profile.fullName, profile.email)}`
                : "Моят профил"
            }
            titleAs="h1"
            size="page"
            description={
              session
                ? "Управлявай данните си за доставка, отстъпки и предпочитания."
                : "Влез или създай профил, за да следиш поръчките и да ползваш лични отстъпки."
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
