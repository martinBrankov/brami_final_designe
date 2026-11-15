"use client";

import { useSearchParams } from "next/navigation";

import { sectionActionClassName } from "@/components/section-intro";
import { Link } from "@/i18n/navigation";

/**
 * "Back to cart" on the legal pages, shown when the visitor came from the
 * cart (?from=cart). Read in the browser so the page itself stays cacheable;
 * render it inside <Suspense>.
 */
export function LegalBackButton({ label }: { label: string }) {
  const searchParams = useSearchParams();

  if (searchParams.get("from") !== "cart") {
    return null;
  }

  return (
    <Link
      href={
        searchParams.get("step") === "delivery"
          ? { pathname: "/cart", query: { step: "delivery" } }
          : "/cart"
      }
      className={sectionActionClassName}
    >
      {label}
    </Link>
  );
}
