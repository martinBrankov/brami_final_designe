"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BottomBar } from "@/components/bottom-bar";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { Navbar } from "@/components/navbar";
import { VisitTracker } from "@/components/visit-tracker";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin-panel");

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
