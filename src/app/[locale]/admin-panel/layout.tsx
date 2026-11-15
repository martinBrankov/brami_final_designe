import type { Metadata } from "next";

// The admin panel must never be indexed (also disallowed in robots.txt).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
