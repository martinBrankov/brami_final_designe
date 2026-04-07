"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useCart } from "@/components/cart-provider";
import { useFavorites } from "@/components/favorites-provider";
import { products } from "@/data/products";
import logo from "@/assets/images/logo.png";

function BurgerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="19" r="1.25" />
      <circle cx="18" cy="19" r="1.25" />
      <path d="M3.5 5h2l1.8 8.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.74l1.4-5.26H7.2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.4 5.6 14.7A4.9 4.9 0 0 1 12 7.4a4.9 4.9 0 0 1 6.4-.1 4.8 4.8 0 0 1-.3 7.4Z" />
    </svg>
  );
}

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

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(true);
  const router = useRouter();
  const { itemCount } = useCart();
  const { favoriteCount } = useFavorites();
  const deferredSearchValue = useDeferredValue(searchValue);

  const navItems = [
    { href: "/", label: "Начало" },
    { href: "/products", label: "Продукти" },
    { href: "/contact", label: "Контакти" },
    { href: "/about", label: "За нас" },
  ];
  const quickLinks = [
    {
      href: "/contact",
      label: "Facebook",
      icon: <FacebookIcon />,
    },
    {
      href: "/contact",
      label: "Instagram",
      icon: <InstagramIcon />,
    },
    {
      href: "tel:+359889342781",
      label: "Обади се",
      icon: <PhoneIcon />,
    },
  ];

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSearchOpen]);

  const searchResults = useMemo(() => {
    const query = deferredSearchValue.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return products
      .filter((product) => {
        const productNameWords = product.name
          .toLowerCase()
          .split(/[\s,./()-]+/)
          .filter(Boolean);

        return productNameWords.some((word) => word.includes(query));
      });
  }, [deferredSearchValue]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchValue.trim();
    setShowSearchResults(false);
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
    setIsSearchOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[#ece6f1] bg-[rgba(253,253,253,0.78)] backdrop-blur-xl">
        <div className="relative flex h-14 w-full items-center justify-between px-4 sm:h-16 sm:px-10 lg:px-14">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3] sm:-ml-1 sm:h-12 sm:w-12"
          >
            <BurgerIcon />
          </button>

          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-center"
            aria-label="Go to homepage"
          >
            <Image
              src={logo}
              alt="Brami"
              priority
              className="h-auto w-[74px] sm:w-[92px]"
            />
          </Link>

          <div className="ml-auto flex items-center gap-0.5 sm:-mr-1 sm:gap-2">
            <button
              type="button"
              aria-label="Търси продукти"
              onClick={() => setIsSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3] sm:h-12 sm:w-12"
            >
              <SearchIcon />
            </button>

            <Link
              href="/products?favorites=1"
              aria-label="Любими продукти"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3] sm:h-12 sm:w-12"
            >
              <HeartIcon />
              {favoriteCount ? (
                <span className="absolute right-1.5 top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-1 text-[11px] font-semibold text-white">
                  {favoriteCount}
                </span>
              ) : null}
            </Link>

            <Link
              href="/cart"
              aria-label="Open cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3] sm:h-12 sm:w-12"
            >
              <CartIcon />
              {itemCount ? (
                <span className="absolute right-1.5 top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-1 text-[11px] font-semibold text-white">
                  {itemCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {isSearchOpen ? (
        <div className="fixed inset-0 z-40 overflow-hidden bg-[rgba(48,31,62,0.18)] p-4 backdrop-blur-sm sm:p-6">
          <button
            type="button"
            aria-label="Затвори търсенето"
            className="absolute inset-0"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="relative flex h-full items-start justify-center overflow-hidden pt-12 sm:pt-16">
            <div
              className="relative flex max-h-[calc(100vh-8rem)] w-[min(720px,100%)] flex-col overflow-hidden rounded-[28px] border border-[#e6dcef] bg-[#fdfdfd] p-5 shadow-[0_24px_80px_rgba(67,40,85,0.18)] sm:max-h-[calc(100vh-10rem)] sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-serif text-3xl text-[#432855]">
                  Търси продукти
                </h2>
                <button
                  type="button"
                  aria-label="Затвори търсенето"
                  onClick={() => setIsSearchOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#f1e8f5]"
                >
                  <span className="text-2xl leading-none">{"\u00d7"}</span>
                </button>
              </div>

              <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={searchValue}
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                    setShowSearchResults(true);
                  }}
                  autoFocus
                  placeholder="Въведи име на продукт"
                  className="-mx-2 min-h-12 w-[calc(100%)] flex-1 self-center rounded-[24px] border border-[#ddd3e4] bg-[#faf7fc] px-4 text-[#432855] outline-none transition focus:border-[#9f79ac] sm:mx-0 sm:h-12 sm:w-auto"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white"
                >
                  Търси
                </button>
              </form>

              {showSearchResults && deferredSearchValue.trim() ? (
                <div className="mt-5">
                  {searchResults.length ? (
                    <>
                      <p className="text-sm font-medium text-[#8f72a7]">
                        Намерени продукти
                      </p>
                      <div
                        className="mt-3 overflow-y-auto pr-1"
                        style={{ maxHeight: "calc(100vh - 20rem)" }}
                      >
                        <div className="space-y-3">
                          {searchResults.map((product) => {
                            const image = product.imageSrc[0];

                            return (
                              <Link
                                key={product.id}
                                href={`/products/${product.id}`}
                                onClick={() => setIsSearchOpen(false)}
                                className="flex items-center gap-3 rounded-[22px] border border-[#e6dcef] bg-[#faf7fc] p-3 transition hover:border-[#cbb7d8] hover:bg-white"
                              >
                                <div className="overflow-hidden rounded-[16px] border border-[#ece3f2] bg-white">
                                  {image ? (
                                    <Image
                                      src={image}
                                      alt={product.name}
                                      className="h-[82px] w-[82px] object-cover"
                                    />
                                  ) : (
                                    <div className="h-[82px] w-[82px] bg-[#f3edf7]" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-serif text-lg text-[#432855]">
                                    {product.name}
                                  </p>
                                  <p className="mt-1 text-sm text-[#6b587f]">
                                    {product.packaging}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-[#8f72a7]">
                                    {product.checkboxInfo[0]}
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-[#432855]">
                                    {product.price}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="rounded-[18px] border border-[#e6dcef] bg-[#faf7fc] px-4 py-3 text-sm text-[#6b587f]">
                      Няма намерени продукти по това търсене.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isMenuOpen ? (
        <div className="fixed inset-0 z-40 bg-[rgba(48,31,62,0.18)] backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="relative flex h-full w-[208px] shrink-0 flex-col border-r border-[#e9deef] bg-[#fdfdfd] px-4 py-5 shadow-[0_24px_80px_rgba(67,40,85,0.18)] landscape:w-[416px] landscape:px-5 sm:w-[218px] sm:px-5 sm:py-6 sm:landscape:w-[436px]">
            <div className="mb-8 flex items-center justify-between landscape:hidden">
              <Image src={logo} alt="Brami" className="h-auto w-[86px]" />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#f1e8f5]"
              >
                <span className="text-2xl leading-none">{"\u00d7"}</span>
              </button>
            </div>

            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsMenuOpen(false)}
              className="absolute right-5 top-5 hidden h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#f1e8f5] landscape:flex"
            >
              <span className="text-2xl leading-none">{"\u00d7"}</span>
            </button>

            <div className="flex flex-1 flex-col landscape:grid landscape:grid-cols-[156px_1fr] landscape:gap-6">
              <div className="order-2 mt-auto w-full pt-8 landscape:order-1 landscape:mt-0 landscape:flex landscape:flex-col landscape:justify-start landscape:border-r landscape:border-[#ece3f2] landscape:pr-4 landscape:pt-0">
                <div className="hidden landscape:flex">
                  <Image src={logo} alt="Brami" className="h-auto w-[86px]" />
                </div>

                <div className="landscape:pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
                    Бързи връзки
                  </p>
                  <div className="mt-4 flex w-full gap-3 landscape:flex-col">
                    {quickLinks.map((item) => {
                      const iconClassName =
                        "flex h-12 w-12 items-center justify-center rounded-full border border-[#d8cae3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,251,0.98)_100%)] text-[#432855] shadow-[0_10px_24px_rgba(67,40,85,0.14)] transition hover:border-[#cbb7d8] hover:bg-white";
                      const content = (
                        <>
                          <span className={iconClassName}>{item.icon}</span>
                            <span className="text-left text-[11px] font-medium leading-4 text-[#5f4b74] landscape:pl-0.5">
                              {item.label}
                            </span>
                        </>
                      );

                      if (item.href.startsWith("tel:")) {
                        return (
                          <a
                            key={item.label}
                            href={item.href}
                            aria-label={item.label}
                            className="flex w-12 flex-col items-center landscape:w-full landscape:flex-row landscape:gap-3"
                          >
                            {content}
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          aria-label={item.label}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex w-12 flex-col items-center landscape:w-full landscape:flex-row landscape:gap-3"
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-5 w-full border-b border-t border-[#ece3f2] pb-[1.35rem] pt-4 text-sm leading-6 text-[#5f4b74] landscape:hidden">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
                      Имейл
                    </p>
                    <a
                      href="mailto:info@brami-trade.com"
                      className="mt-2 block break-words transition hover:text-[#432855]"
                    >
                      info@brami-trade.com
                    </a>
                  </div>
                </div>
              </div>

                <nav className="relative order-1 flex flex-col landscape:order-2 landscape:pt-[30px] landscape:pl-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="border-b border-[#ece3f2] py-4 text-lg font-medium text-[#4B2E6F] transition hover:text-[#6c3f8d]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
}
