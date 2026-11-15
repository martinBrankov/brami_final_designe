"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BottomBar } from "@/components/bottom-bar";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { Navbar } from "@/components/navbar";
import { VisitTracker } from "@/components/visit-tracker";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // pathname keeps the locale prefix (/en/admin-panel).
  const isAdminRoute = /^(\/[a-z]{2})?\/admin-panel(\/|$)/.test(pathname);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <VisitTracker />
      </Suspense>
      <Navbar />
      <div className="content-protected flex-1">{children}</div>
      <BottomBar />
      <CookieConsentBanner />
    </>
  );
}
