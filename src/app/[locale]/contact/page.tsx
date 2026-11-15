import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { DEFAULT_OG_IMAGES, OG_LOCALES, buildAlternates, jsonLdScript } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

type ContactPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Contact" });
  const alternates = buildAlternates(locale, "/contact");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates,
    openGraph: {
      title: `${t("metaTitle")} | Brami`,
      description: t("ogDescription"),
      url: alternates.canonical as string,
      locale: OG_LOCALES[locale],
      images: DEFAULT_OG_IMAGES,
    },
  };
}
import {
  SectionIntro,
  contentSectionClassName,
  contentSectionInnerClassName,
  pageSectionClassName,
} from "@/components/section-intro";
import { ContactForm } from "@/components/contact-form";

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="currentColor"
    >
      <path d="M13.3 21v-7.7h2.6l.4-3h-3v-1.9c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.2 0-3.7 1.3-3.7 3.9v2.2H8v3h2.4V21h2.9Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AddressIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.8 4.5h3.1l1.2 3.7-2 1.8a15.6 15.6 0 0 0 5 5l1.8-2 3.7 1.2v3.1a1.8 1.8 0 0 1-2 1.8A15.8 15.8 0 0 1 5 6.5a1.8 1.8 0 0 1 1.8-2Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m5 7 7 5 7-5" />
    </svg>
  );
}

const socialItems = [
  {
    title: "Facebook",
    href: "https://www.facebook.com/Bramitrade",
    icon: <FacebookIcon />,
  },
  {
    title: "Instagram",
    href: "https://www.instagram.com/Bramitrade",
    icon: <InstagramIcon />,
  },
];

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  if (isAppLocale(locale)) setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const contactItems = [
    { title: t("address"), value: t("addressValue"), icon: <AddressIcon /> },
    { title: t("phone"), value: "+359 889 342 781", icon: <PhoneIcon /> },
    { title: t("email"), value: "info@brami.shop", icon: <MailIcon /> },
    { title: t("sales"), value: "sales@brami.shop", icon: <MailIcon /> },
  ];
  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: t("title"),
    inLanguage: locale,
    about: {
      "@id": `${SITE_URL}/#organization`,
      "@type": "OnlineStore",
      name: "Brami",
      email: "info@brami.shop",
      telephone: "+359889342781",
      address: {
        "@type": "PostalAddress",
        streetAddress: t("streetAddress"),
        addressLocality: t("city"),
        postalCode: "1588",
        addressCountry: "BG",
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    },
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf8fd_0%,_#f3edf7_45%,_#efe6f6_100%)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(contactJsonLd)} />
      <section className={pageSectionClassName}>
        <div className="mb-8">
          <SectionIntro
            title={t("title")}
            titleAs="h1"
            size="page"
            description={t("description")}
            note={t("note")}
          />
        </div>
      </section>

      <section className={contentSectionClassName}>
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
          {contactItems.map((item, index) => (
            <article
              key={item.title}
              className={`px-6 py-8 sm:px-10 lg:px-14 ${
                index > 0 ? "border-t border-[#ece4f1] md:border-t-0" : ""
              } ${index >= 2 ? "xl:border-t-0" : ""}`}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cae3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,251,0.98)_100%)] text-[#432855] shadow-[0_8px_18px_rgba(67,40,85,0.08)]">
                {item.icon}
              </div>
              <p className="mt-4 text-sm uppercase tracking-[0.18em] text-[#8f72a7]">
                {item.title}
              </p>
              <p className="mt-3 text-xl font-medium leading-8 text-[#432855]">
                {item.value}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-white">
        <div className="px-6 py-8 sm:px-10 lg:px-14">
          <div className="text-left">
            <h2 className="font-serif text-3xl text-[#432855] sm:text-4xl">
              {t("socialTitle")}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#6b587f]">
              {t("socialText")}
            </p>

            <div className="flex flex-wrap items-center gap-6">
              {socialItems.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-3 text-left text-[#432855] transition hover:text-[#6c3f8d]"
                >
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d8cae3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,251,0.98)_100%)] text-[#432855] shadow-[0_8px_18px_rgba(67,40,85,0.08)]">
                    {item.icon}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-lg font-medium text-left">
                      {item.title}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-[#fbf8ff]">
        <div className={contentSectionInnerClassName}>
          <SectionIntro
            title={t("formTitle")}
            description={t("formDescription")}
          />
        </div>

        <div className="border-t border-[#d8d0de] bg-[#f8f4fc] px-6 py-8 sm:px-10 lg:px-14">
          <ContactForm />
        </div>
      </section>

      <section className="w-full border-b border-[#d8d0de] bg-white px-6 py-8 sm:px-10 lg:px-14">
        <p className="text-sm text-[#6b587f]">
          {t("cancelQuestion")}{" "}
          <Link href="/cancellation-form" className="font-medium text-[#432855] underline underline-offset-2 transition hover:text-[#6c3f8d]">
            {t("cancelLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
