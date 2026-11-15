import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";

export const dynamic = "force-dynamic";

// The admin panel must never be indexed (also disallowed in robots.txt).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // The root provider leaves out the admin texts; this one passes all messages.
  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
