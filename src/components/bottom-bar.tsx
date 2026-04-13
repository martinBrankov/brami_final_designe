import Link from "next/link";

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
  { href: "/products", label: "Продукти" },
  { href: "/about", label: "За нас" },
  { href: "/contact", label: "Контакти" },
  { href: "/cart", label: "Количка" },
];

const helpLinks = [
  { href: "/privacy-policy", label: "Политика за лични данни" },
  { href: "/terms", label: "Общи условия" },
  { href: "/delivery-returns", label: "Доставка и връщане" },
];

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
  return (
    <footer className="mt-auto w-full border-t border-[#5c3d74] bg-[linear-gradient(180deg,#5c3d74_0%,#432855_100%)]">
      <div className="px-6 py-10 sm:px-10 lg:px-14">
        <div className="grid gap-8 xl:grid-cols-[1.3fr_minmax(0,1fr)] xl:items-start">
          <div className="max-w-[34rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
              Brami
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-white">
              Натурална грижа за лице, тяло и коса.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#ede4f3]">
              Подбрани формули, деликатни текстури и грижа, която остава
              близо до ежедневието ти.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 [@media(orientation:landscape)]:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
                Навигация
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white">
                {shopLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="transition hover:text-[#eadcf3]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
                Полезно
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white">
                {helpLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="whitespace-nowrap transition hover:text-[#eadcf3]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="col-span-2 [@media(orientation:landscape)]:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d3bddf]">
                Контакти
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white">
                <a
                  href="mailto:info@brami-trade.com"
                  className="inline-flex items-start gap-2 transition hover:text-[#eadcf3]"
                >
                  <MailIcon />
                  <span className="whitespace-nowrap leading-6">
                    info@brami-trade.com
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

        <div className="mt-8 flex flex-col gap-2 border-t border-[#6f4f88] pt-5 text-xs text-[#d8c7e4] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Brami. Всички права запазени.</p>
          <p>Създадено за по-лесно пазаруване и ясна продуктова информация.</p>
        </div>
      </div>
    </footer>
  );
}
