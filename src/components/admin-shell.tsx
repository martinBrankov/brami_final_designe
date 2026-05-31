import type React from "react";
import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/images/logo.png";
import type { AdminSession } from "@/lib/admin-auth";

const ROLE_LABELS: Record<string, string> = {
  user: "Потребител",
  super_user: "Супер потребител",
  admin: "Админ",
};

const navItems = [
  { href: "/admin-panel/products", label: "Продукти" },
  { href: "/admin-panel/users", label: "Потребители" },
  { href: "/admin-panel/orders", label: "Поръчки" },
  { href: "/admin-panel/stats", label: "Статистики" },
  { href: "/admin-panel/blog", label: "Блог" },
];

export function AdminShell({
  session,
  currentPath,
  title,
  description,
  children,
}: {
  session: AdminSession;
  currentPath: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f4efe5_0%,#eef2f4_52%,#ffffff_100%)] text-[#1d2733] lg:flex-row" style={{ userSelect: "text", WebkitUserSelect: "text" } as React.CSSProperties}>
        <aside className="shrink-0 border-b border-[#d9d4ca] bg-[#1d2733] px-6 py-6 text-white lg:flex lg:min-h-screen lg:w-[280px] lg:flex-col lg:border-b-0 lg:border-r lg:px-7">
          <div className="mb-8">
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="1.8" fill="none" opacity="0.85"/>
                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.85"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">{session.username}</p>
                  <p className="text-xs text-white/60">{ROLE_LABELS[session.role] ?? session.role}</p>
                </div>
              </div>
              <form action="/api/admin/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Изход
                </button>
              </form>
            </div>
          </div>

          <div className="mb-6 border-t border-white/10" />

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-[#1d2733]"
                      : "bg-white/5 text-white/82 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden border-t border-white/10 pt-6 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Технически съпорт</p>
            <p className="mt-1 text-sm font-medium text-white/80">Мартин Бранков</p>
            <p className="mt-0.5 text-sm text-white/60">0898 85 65 45</p>
          </div>
        </aside>

        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10">
          <div className="mb-6 flex h-[148px] items-center gap-6 overflow-hidden border-b border-[#e7dfd1] pb-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f45]">
                Control Center
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#1d2733]">
                {title}
              </h1>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5f6b76]">{description}</p>
            </div>
            <div className="hidden shrink-0 lg:block">
              <Image src={logo} alt="Brami" width={110} height={40} className="object-contain" />
            </div>
          </div>

          {children}
        </section>
    </main>
  );
}
