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
    { href: "/", label: "\u041d\u0430\u0447\u0430\u043b\u043e" },
    { href: "/products", label: "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438" },
    { href: "/contact", label: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u0438" },
    { href: "/about", label: "\u0417\u0430 \u043d\u0430\u0441" },
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
        <div className="relative flex h-16 w-full items-center justify-between px-6 sm:px-10 lg:px-14">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((value) => !value)}
            className="-ml-1 flex h-12 w-12 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3]"
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
              className="h-auto w-[92px]"
            />
          </Link>

          <div className="-mr-1 ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              aria-label="\u0422\u044a\u0440\u0441\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438"
              onClick={() => setIsSearchOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3]"
            >
              <SearchIcon />
            </button>

            <Link
              href="/products?favorites=1"
              aria-label="\u041b\u044e\u0431\u0438\u043c\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438"
              className="relative flex h-12 w-12 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3]"
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
              className="relative flex h-12 w-12 items-center justify-center rounded-full text-[#4B2E6F] transition hover:bg-[#e9ddf3]"
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
            aria-label="\u0417\u0430\u0442\u0432\u043e\u0440\u0438 \u0442\u044a\u0440\u0441\u0435\u043d\u0435\u0442\u043e"
            className="absolute inset-0"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="relative flex h-full items-start justify-center overflow-hidden pt-12 sm:pt-16">
            <div
              className="relative flex max-h-[calc(100vh-8rem)] w-[min(720px,100%)] flex-col overflow-hidden rounded-[28px] border border-[#e6dcef] bg-[#fdfdfd] p-5 shadow-[0_24px_80px_rgba(67,40,85,0.18)] sm:max-h-[calc(100vh-10rem)] sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-serif text-3xl text-[#432855]">
                  {"\u0422\u044a\u0440\u0441\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438"}
                </h2>
                <button
                  type="button"
                  aria-label="\u0417\u0430\u0442\u0432\u043e\u0440\u0438 \u0442\u044a\u0440\u0441\u0435\u043d\u0435\u0442\u043e"
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
                  placeholder="\u0412\u044a\u0432\u0435\u0434\u0438 \u0438\u043c\u0435 \u043d\u0430 \u043f\u0440\u043e\u0434\u0443\u043a\u0442"
                  className="h-12 flex-1 rounded-[18px] border border-[#ddd3e4] bg-[#faf7fc] px-4 text-[#432855] outline-none transition focus:border-[#9f79ac]"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white"
                >
                  {"\u0422\u044a\u0440\u0441\u0438"}
                </button>
              </form>

              {showSearchResults && deferredSearchValue.trim() ? (
                <div className="mt-5">
                  {searchResults.length ? (
                    <>
                      <p className="text-sm font-medium text-[#8f72a7]">
                        {"\u041d\u0430\u043c\u0435\u0440\u0435\u043d\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438"}
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
                      {"\u041d\u044f\u043c\u0430 \u043d\u0430\u043c\u0435\u0440\u0435\u043d\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438 \u043f\u043e \u0442\u043e\u0432\u0430 \u0442\u044a\u0440\u0441\u0435\u043d\u0435."}
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
          <div className="relative h-full w-[min(320px,84vw)] border-r border-[#e9deef] bg-[#fdfdfd] px-5 py-6 shadow-[0_24px_80px_rgba(67,40,85,0.18)]">
            <div className="mb-8 flex items-center justify-between">
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

            <nav className="flex flex-col">
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
      ) : null}
    </>
  );
}
