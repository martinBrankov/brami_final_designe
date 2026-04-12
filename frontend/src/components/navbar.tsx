"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
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
  const [isPhoneLandscapeMenuLayout, setIsPhoneLandscapeMenuLayout] =
    useState(false);
  const [searchViewportHeight, setSearchViewportHeight] = useState<number | null>(
    null,
  );
  const [isMobileSearchViewport, setIsMobileSearchViewport] = useState(false);
  const [desktopSearchResultsMaxHeight, setDesktopSearchResultsMaxHeight] =
    useState<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(true);
  const searchDialogRef = useRef<HTMLDivElement | null>(null);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { itemCount } = useCart();
  const { favoriteCount } = useFavorites();
  const deferredSearchValue = useDeferredValue(searchValue);

  const navItems = [
    { href: "/", label: "Начало" },
    { href: "/products", label: "Продукти" },
    { href: "/about", label: "За нас" },
    { href: "/contact", label: "Контакти" },
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

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const updateSearchViewport = () => {
      setSearchViewportHeight(window.visualViewport?.height ?? window.innerHeight);
      setIsMobileSearchViewport(window.innerWidth < 640);
    };

    updateSearchViewport();
    window.addEventListener("resize", updateSearchViewport);
    window.visualViewport?.addEventListener("resize", updateSearchViewport);
    window.visualViewport?.addEventListener("scroll", updateSearchViewport);

    return () => {
      window.removeEventListener("resize", updateSearchViewport);
      window.visualViewport?.removeEventListener("resize", updateSearchViewport);
      window.visualViewport?.removeEventListener("scroll", updateSearchViewport);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(orientation: landscape) and (max-width: 932px)",
    );

    const updateMenuLayout = () => {
      setIsPhoneLandscapeMenuLayout(mediaQuery.matches);
    };

    updateMenuLayout();
    mediaQuery.addEventListener("change", updateMenuLayout);

    return () => {
      mediaQuery.removeEventListener("change", updateMenuLayout);
    };
  }, []);

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

  useEffect(() => {
    if (!isSearchOpen || isMobileSearchViewport) {
      setDesktopSearchResultsMaxHeight(null);
      return;
    }

    const updateDesktopResultsHeight = () => {
      const dialogElement = searchDialogRef.current;
      const resultsElement = searchResultsRef.current;

      if (!dialogElement || !resultsElement) {
        setDesktopSearchResultsMaxHeight(null);
        return;
      }

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const dialogRect = dialogElement.getBoundingClientRect();
      const resultsRect = resultsElement.getBoundingClientRect();
      const dialogPaddingBottom = Number.parseFloat(
        window.getComputedStyle(dialogElement).paddingBottom,
      );
      const maxDialogHeight = Math.max(viewportHeight - 160, 0);
      const resultsOffsetTop = resultsRect.top - dialogRect.top;
      const availableHeight =
        maxDialogHeight - resultsOffsetTop - dialogPaddingBottom;

      setDesktopSearchResultsMaxHeight(
        availableHeight > 0 ? availableHeight : null,
      );
    };

    updateDesktopResultsHeight();
    window.addEventListener("resize", updateDesktopResultsHeight);
    window.visualViewport?.addEventListener("resize", updateDesktopResultsHeight);

    return () => {
      window.removeEventListener("resize", updateDesktopResultsHeight);
      window.visualViewport?.removeEventListener(
        "resize",
        updateDesktopResultsHeight,
      );
    };
  }, [isMobileSearchViewport, isSearchOpen, searchResults.length]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchValue.trim();
    setShowSearchResults(false);
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
    setIsSearchOpen(false);
  }

  function handleSearchClear() {
    setSearchValue("");
    setShowSearchResults(true);
  }

  function handleSearchClose() {
    handleSearchClear();
    setIsSearchOpen(false);
  }

  const menuDrawerClassName = `relative z-10 flex h-full w-[208px] shrink-0 flex-col border-r border-[#e9deef] bg-[#fdfdfd] px-4 pb-5 pt-3 shadow-[0_24px_80px_rgba(67,40,85,0.18)] sm:w-[218px] sm:px-5 sm:pb-6 sm:pt-4${
    isPhoneLandscapeMenuLayout ? " w-[416px] px-5 pb-4 pt-2.5 sm:w-[436px] sm:pt-3" : ""
  }`;
  const menuHeaderClassName = `mb-6 flex items-center justify-between${
    isPhoneLandscapeMenuLayout ? " hidden" : ""
  }`;
  const floatingCloseButtonClassName = `absolute right-5 top-5 z-20 h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#f1e8f5]${
    isPhoneLandscapeMenuLayout ? " flex" : " hidden"
  }`;
  const menuContentClassName = `flex flex-1 flex-col${
    isPhoneLandscapeMenuLayout ? " grid grid-cols-[156px_1fr] gap-6" : ""
  }`;
  const quickLinksColumnClassName = `order-2 w-full pt-6 text-left${
    isPhoneLandscapeMenuLayout
      ? " order-1 mt-0 flex flex-col items-start justify-start self-start border-r border-[#ece3f2] pr-4 pt-0 text-left"
      : ""
  }`;
  const quickLinksLogoClassName = isPhoneLandscapeMenuLayout ? "flex items-start justify-start" : "hidden";
  const quickLinksBodyClassName = isPhoneLandscapeMenuLayout ? "w-full pt-3 text-left" : "";
  const quickLinksListClassName = `mt-4 flex w-full flex-col items-start gap-3 text-left`;
  const quickLinkLabelClassName = `text-left text-[11px] font-medium leading-4 text-[#5f4b74]${
    isPhoneLandscapeMenuLayout ? " pl-0.5" : ""
  }`;
  const quickLinkItemClassName = `flex flex-col items-start${
    isPhoneLandscapeMenuLayout
      ? " w-full flex-row items-center justify-start gap-3 self-start"
      : " w-full justify-start text-left"
  }`;
  const emailBlockClassName = `mt-5 w-full border-b border-t border-[#ece3f2] pb-[1.35rem] pt-4 text-sm leading-6 text-[#5f4b74]${
    isPhoneLandscapeMenuLayout ? " hidden" : ""
  }`;
  const menuNavClassName = `relative order-1 flex flex-col${
    isPhoneLandscapeMenuLayout ? " order-2 pl-2 pt-[30px]" : ""
  }`;
  const hasSearchQuery = deferredSearchValue.trim().length > 0;
  const searchDialogClassName =
    "relative flex h-auto w-[min(720px,100%)] flex-col overflow-hidden rounded-[28px] border border-[#e6dcef] bg-[#fdfdfd] p-5 shadow-[0_24px_80px_rgba(67,40,85,0.18)] sm:max-h-[calc(100dvh-10rem)] sm:p-6";
  const searchResultsWrapperClassName = "mt-5";
  const searchDialogStyle: CSSProperties | undefined =
    hasSearchQuery && isMobileSearchViewport && searchViewportHeight
      ? { maxHeight: `${Math.max(searchViewportHeight - 32, 0)}px` }
      : undefined;
  const searchResultsStyle: CSSProperties | undefined =
    hasSearchQuery && isMobileSearchViewport && searchViewportHeight
      ? { maxHeight: `${Math.max(searchViewportHeight - 160, 0)}px` }
      : desktopSearchResultsMaxHeight
        ? { maxHeight: `${desktopSearchResultsMaxHeight}px` }
        : undefined;

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
              aria-label="Р СћРЎР‰РЎР‚РЎРѓР С‘ Р С—РЎР‚Р С•Р Т‘РЎС“Р С”РЎвЂљР С‘"
              onClick={() => setIsSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3] sm:h-12 sm:w-12"
            >
              <SearchIcon />
            </button>

            <Link
              href="/products?favorites=1"
              aria-label="Р вЂєРЎР‹Р В±Р С‘Р СР С‘ Р С—РЎР‚Р С•Р Т‘РЎС“Р С”РЎвЂљР С‘"
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
            onClick={handleSearchClose}
          />
          <div className="relative flex h-full items-start justify-center overflow-hidden pt-0 sm:pt-16">
            <div
              ref={searchDialogRef}
              className={searchDialogClassName}
              style={searchDialogStyle}
            >
              <div className="mb-4 hidden items-center justify-between gap-4 sm:flex">
                <h2 className="hidden font-serif text-3xl text-[#432855] sm:block">
                  Търси продукти
                </h2>
                <button
                  type="button"
                  aria-label="Затвори търсенето"
                  onClick={handleSearchClose}
                  className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#f1e8f5]"
                >
                  <span className="text-2xl leading-none">{"\u00d7"}</span>
                </button>
              </div>
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 sm:flex-col sm:items-stretch">
                <div className="relative flex-1">
                  <input
                    value={searchValue}
                    onChange={(event) => {
                      setSearchValue(event.target.value);
                      setShowSearchResults(true);
                    }}
                    autoFocus
                    placeholder="Търси по име на продукт"
                    className="min-h-12 w-full rounded-[24px] border border-[#ddd3e4] bg-[#faf7fc] pl-4 pr-14 text-[#432855] outline-none transition focus:border-[#9f79ac] sm:h-12"
                  />
                  <button
                    type="submit"
                    aria-label="Търси"
                    className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#ddd3e4] bg-[#faf7fc] text-[#6f5587] transition hover:border-[#cdbad9] hover:bg-[#f4edf8] hover:text-[#432855] sm:hidden"
                  >
                    <SearchIcon />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Затвори търсенето"
                  onClick={handleSearchClose}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ddd3e4] bg-[#faf7fc] text-[#6f5587] transition hover:border-[#cdbad9] hover:bg-[#f4edf8] hover:text-[#432855] sm:hidden"
                >
                  <span className="text-[1.35rem] leading-none">{"\u00d7"}</span>
                </button>
                <button
                  type="submit"
                  className="hidden h-12 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white sm:inline-flex"
                >
                  Търси
                </button>
              </form>

              {showSearchResults && deferredSearchValue.trim() ? (
                <div className={searchResultsWrapperClassName}>
                  {searchResults.length ? (
                    <>
                      <div
                        ref={searchResultsRef}
                        className="overflow-y-auto pr-3 [scrollbar-gutter:stable]"
                        style={searchResultsStyle}
                      >
                        <div className="space-y-3">
                          {searchResults.map((product) => {
                            const image = product.imageSrc[0];

                            return (
                              <Link
                                key={product.id}
                                href={`/products/${product.id}`}
                                onClick={handleSearchClose}
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
          <div className={menuDrawerClassName}>
            <div className={menuHeaderClassName}>
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
              className={floatingCloseButtonClassName}
            >
              <span className="text-2xl leading-none">{"\u00d7"}</span>
            </button>

            <div className={menuContentClassName}>
              <div className={quickLinksColumnClassName}>
                <div className={quickLinksLogoClassName}>
                  <Image src={logo} alt="Brami" className="h-auto w-[86px]" />
                </div>

                <div className={quickLinksBodyClassName}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
                    Бързи връзки
                  </p>
                  <div className={quickLinksListClassName}>
                    {quickLinks.map((item) => {
                      const iconClassName =
                        "flex h-12 w-12 items-center justify-center rounded-full border border-[#d8cae3] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,241,251,0.98)_100%)] text-[#432855] shadow-[0_10px_24px_rgba(67,40,85,0.14)] transition hover:border-[#cbb7d8] hover:bg-white";
                      const content = (
                        <>
                          <span className={iconClassName}>{item.icon}</span>
                            <span className={quickLinkLabelClassName}>
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
                            className={quickLinkItemClassName}
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
                          className={quickLinkItemClassName}
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                  <div className={emailBlockClassName}>
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

                <nav className={menuNavClassName}>
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
