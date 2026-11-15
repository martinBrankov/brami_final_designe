import { Fragment } from "react";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
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
      className="h-5 w-5"
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

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m5.5 7 6.5 5 6.5-5" />
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.8 4.5h3.1l1.2 3.7-2 1.8a15.6 15.6 0 0 0 5 5l1.8-2 3.7 1.2v3.1a1.8 1.8 0 0 1-2 1.8A15.8 15.8 0 0 1 5 6.5a1.8 1.8 0 0 1 1.8-2Z" />
    </svg>
  );
}

const shopLinks = [
  { href: "/products", key: "products" },
  { href: "/about", key: "about" },
  { href: "/beauty-care", key: "beautyCare" },
  { href: "/contact", key: "contact" },
  { href: "/cart", key: "cart" },
] as const;

const helpLinks = [
  { href: "/faq", key: "faq" },
  { href: "/delivery-returns", key: "deliveryReturns" },
  { href: "/cancellation-form", key: "cancellationForm" },
  { href: "/terms", key: "terms" },
  { href: "/partners", key: "partners" },
  { href: "/privacy-policy", key: "privacyPolicy" },
] as const;

const collectionLinks = [
  { href: "/collections/saffron", key: "saffronCosmetics" },
  { href: "/collections/bulgarian", key: "bulgarianCosmetics" },
  { href: "/collections/face", key: "faceCare" },
  { href: "/collections/hair", key: "hairCare" },
  { href: "/collections/body", key: "bodyCare" },
] as const;

const socialLinks = [
  {
    href: "https://www.facebook.com/Bramitrade",
    label: "Facebook",
    icon: <FacebookIcon />,
  },
  {
    href: "https://www.instagram.com/Bramitrade",
    label: "Instagram",
    icon: <InstagramIcon />,
  },
];

export function BottomBar() {
  const t = useTranslations("Footer");

  return (
    <footer className="mt-auto w-full border-t border-[#5c3d74] bg-[linear-gradient(180deg,#5c3d74_0%,#432855_100%)]">
      <div className="px-6 py-10 sm:px-10 lg:px-14">
        <div className="grid gap-8 xl:grid-cols-[1.3fr_minmax(0,1fr)] xl:items-start">
          <div className="max-w-[34rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
              Brami
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-white">
              {t("title")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#ede4f3]">
              {t("text")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 [@media(orientation:landscape)]:grid-cols-3">
            <div className="col-span-2 grid grid-cols-2 gap-x-8 [@media(orientation:landscape)]:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
                {t("useful")}
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
                {t("navigation")}
              </p>
              {Array.from({ length: Math.max(helpLinks.length, shopLinks.length) }).map((_, i) => (
                <Fragment key={i}>
                  {helpLinks[i] ? (
                    <Link
                      href={helpLinks[i].href}
                      className="flex items-start pt-3 text-sm text-white transition hover:text-[#eadcf3]"
                    >
                      {t(`links.${helpLinks[i].key}`)}
                    </Link>
                  ) : <div />}
                  {shopLinks[i] ? (
                    <Link
                      href={shopLinks[i].href}
                      className="flex items-start pt-3 text-sm text-white transition hover:text-[#eadcf3]"
                    >
                      {t(`links.${shopLinks[i].key}`)}
                    </Link>
                  ) : <div />}
                </Fragment>
              ))}
            </div>

            <div className="col-span-2 [@media(orientation:landscape)]:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
                {t("contacts")}
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white">
                <a
                  href="mailto:info@brami.shop"
                  className="inline-flex items-start gap-2 transition hover:text-[#eadcf3]"
                >
                  <MailIcon />
                  <span className="whitespace-nowrap leading-6">
                    info@brami.shop
                  </span>
                </a>
                <a
                  href="tel:+359889342781"
                  className="inline-flex items-center gap-2 transition hover:text-[#eadcf3]"
                >
                  <PhoneIcon />
                  <span>+359 889 342 781</span>
                </a>
                <div className="mt-2 flex items-center gap-3">
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#7a5a93] bg-[rgba(255,255,255,0.08)] text-white shadow-[0_10px_24px_rgba(19,8,28,0.2)] transition hover:border-[#cbb7d8] hover:bg-[rgba(255,255,255,0.14)]"
                    >
                      {link.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav aria-label={t("categories")} className="mt-8 border-t border-[#6f4f88] pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
            {t("categories")}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {collectionLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-sm text-white transition hover:text-[#eadcf3]"
              >
                {t(`links.${link.key}`)}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mt-8 border-t border-[#6f4f88] pt-5 text-xs text-[#d8c7e4]">
          <p className="mb-3 leading-5 text-[#c9b6d9]">
            {t("payments")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>{t("copyright", { year: 2026 })}</p>
            <div className="flex items-center gap-4">
              <p>{t("tagline")}</p>
              <LocaleSwitcher
                className="inline-flex items-center gap-1.5 text-[#d8c7e4] transition hover:text-white"
                iconClassName="hidden"
                labelClassName=""
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
