"use client";

import { useLocale, useTranslations } from "next-intl";

import { useState } from "react";

import type {
  AdminOrderRecord,
  AdminUserProfile,
  AdminProductRecord,
  AdminVisitRecord,
  AdminVisitorRecord,
} from "@/lib/admin-data";
import { detectAiSource } from "@/lib/ai-referrals";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sumBy<T>(items: T[], val: (item: T) => number) {
  return items.reduce((s, item) => s + val(item), 0);
}

function countBy<T>(items: T[], pred: (item: T) => boolean) {
  return items.filter(pred).length;
}

function groupCount<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function last6Months(locale: string) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString(locale, { month: "short", year: "2-digit" }),
    };
  });
}

// ── Primitive components ──────────────────────────────────────────────────────

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#e7dfd1]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 py-4 text-left"
      >
        <span className="h-4 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="flex-1 text-base font-semibold text-[#1d2733]">{title}</h2>
        <svg
          className="h-4 w-4 shrink-0 text-[#8a9099] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="pb-6 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  hint,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="border-l-2 py-1 pl-4" style={{ borderColor: accent }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">{label}</p>
      <p className="mt-1.5 text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-[#7c8a96]">{sub}</p> : null}
      {hint ? (
        <p className="mt-1.5 text-[10px] leading-[1.35] text-[#9aa3ad]">{hint}</p>
      ) : null}
    </div>
  );
}

function HBar({
  label,
  value,
  max,
  color,
  note,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  note?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm text-[#1d2733]">{label}</span>
        <span className="shrink-0 text-xs font-semibold" style={{ color }}>
          {note ?? value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#f0ece4]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-t border-[#e7dfd1] pt-4 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#7c6f61]">{children}</p>;
}

function Empty() {
  const t = useTranslations("AdminStats");
  return <p className="text-sm text-[#7c8a96]">{t("nyamaDanni")}</p>;
}

// ── Monthly bar chart ─────────────────────────────────────────────────────────

function MonthlyBarChart({
  data,
}: {
  data: { label: string; revenue: number; count: number }[];
}) {
  const t = useTranslations("AdminStats");
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="flex items-end gap-2" style={{ height: "128px" }}>
      {data.map((d, i) => {
        const barH = Math.round((d.revenue / maxRev) * 96);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-col items-center justify-end" style={{ height: "96px" }}>
              {d.revenue > 0 ? (
                <p className="mb-1 text-[9px] font-semibold text-[#8a6f45]">
                  €{d.revenue.toFixed(0)}
                </p>
              ) : null}
              <div
                className="w-full rounded-t-[3px] bg-[#8a6f45]"
                style={{ height: `${Math.max(barH, d.revenue > 0 ? 4 : 0)}px` }}
              />
            </div>
            <p className="text-[9px] text-[#6a7480]">{d.label}</p>
            {d.count > 0 ? (
              <p className="text-[9px] font-medium text-[#8a9aaa]">{t("pcs", { count: d.count })}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Orders ────────────────────────────────────────────────────────────────────

function OrdersStats({ orders }: { orders: AdminOrderRecord[] }) {
  const t = useTranslations("AdminStats");
  const dateLocale = useLocale() === "en" ? "en-GB" : "bg-BG";
  const active = orders.filter((o) => o.status !== "Отказана");
  const revenue = sumBy(active, (o) => o.total);
  const avgOrder = active.length > 0 ? revenue / active.length : 0;
  const totalItems = sumBy(orders, (o) => sumBy(o.items, (i) => i.quantity));

  const now = new Date();
  const thisMonthRevenue = sumBy(
    active.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }),
    (o) => o.total,
  );

  const monthlyData = last6Months(dateLocale).map(({ year, month, label }) => {
    const mo = active.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return { label, revenue: sumBy(mo, (o) => o.total), count: mo.length };
  });

  const statusCounts = groupCount(orders, (o) => o.status);
  const statuses = [
    { label: t("potvardeni"), key: t("potvardena"), color: "#0891b2" },
    { label: t("vObrabotka"), key: t("vObrabotka"), color: "#c9a227" },
    { label: t("izprateni"), key: t("izpratena"), color: "#3d73b8" },
    { label: t("dostaveni"), key: t("dostavena"), color: "#218a54" },
    { label: t("otkazani"), key: t("otkazana"), color: "#b64242" },
  ];
  const maxStatus = Math.max(...statuses.map((s) => statusCounts[s.key] ?? 0), 1);

  const deliveryCounts = groupCount(orders, (o) => o.deliveryMethodLabel);
  const deliveryEntries = Object.entries(deliveryCounts).sort((a, b) => b[1] - a[1]);
  const maxDelivery = Math.max(...deliveryEntries.map((e) => e[1]), 1);

  const cancelledRevLost = sumBy(
    orders.filter((o) => o.status === "Отказана"),
    (o) => o.total,
  );

  return (
    <Section title={t("porachki")} color="#8a6f45">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("obshtoPrihodi")}
          value={`€ ${revenue.toFixed(2)}`}
          sub={t("bezOtkazaniPorachki")}
          accent="#218a54"
        />
        <MetricCard
          label={t("prihodiMesetsa")}
          value={`€ ${thisMonthRevenue.toFixed(2)}`}
          sub={now.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}
          accent="#3d73b8"
        />
        <MetricCard
          label={t("srednaPorachka")}
          value={`€ ${avgOrder.toFixed(2)}`}
          sub={t("porachkiObshto", { count: orders.length })}
          accent="#8a6f45"
        />
        <MetricCard
          label={t("prodadeniBroyki")}
          value={String(totalItems)}
          sub={t("artikuliOtVsichkiPorachki")}
          accent="#6a4fa3"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardTitle>{t("prihodiPoMesetsiPoslednite")}</CardTitle>
          <MonthlyBarChart data={monthlyData} />
        </Card>

        <Card>
          <CardTitle>{t("razpredeleniePoStatus")}</CardTitle>
          <div className="space-y-3">
            {statuses.map((s) => (
              <HBar
                key={s.key}
                label={s.label}
                value={statusCounts[s.key] ?? 0}
                max={maxStatus}
                color={s.color}
                note={t("br", { key: statusCounts[s.key] ?? 0 })}
              />
            ))}
          </div>
          {cancelledRevLost > 0 ? (
            <p className="mt-4 text-xs text-[#7c8a96]">
              {t("propusnatiPrihodiOtOtkazani")}
              <span className="font-semibold text-[#b64242]">€ {cancelledRevLost.toFixed(2)}</span>
            </p>
          ) : null}
        </Card>
      </div>

      {deliveryEntries.length > 0 ? (
        <Card>
          <CardTitle>{t("metodiNaDostavka")}</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deliveryEntries.map(([method, cnt]) => (
              <HBar
                key={method}
                label={method}
                value={cnt}
                max={maxDelivery}
                color="#8a6f45"
                note={t("br2", { cnt })}
              />
            ))}
          </div>
        </Card>
      ) : null}
    </Section>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────

function UsersStats({ users }: { users: AdminUserProfile[] }) {
  const t = useTranslations("AdminStats");
  const dateLocale = useLocale() === "en" ? "en-GB" : "bg-BG";
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisMonth = countBy(users, (u) => {
    const d = new Date(u.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const thisWeek = countBy(users, (u) => new Date(u.createdAt) >= weekAgo);
  const marketing = countBy(users, (u) => u.marketingSubscription);
  const marketingPct =
    users.length > 0 ? Math.round((marketing / users.length) * 100) : 0;

  const roleCounts = groupCount(users, (u) => u.role);
  const roles = [
    { label: t("potrebiteli"), key: "user", color: "#3d73b8" },
    { label: t("targovtsi"), key: "merchant", color: "#c9a227" },
    { label: t("administratori"), key: "admin", color: "#b64242" },
  ];
  const maxRole = Math.max(...roles.map((r) => roleCounts[r.key] ?? 0), 1);

  const cityCounts = groupCount(
    users.filter((u) => u.city),
    (u) => u.city,
  );
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const maxCity = Math.max(...topCities.map((c) => c[1]), 1);

  const countryCounts = groupCount(
    users.filter((u) => u.country),
    (u) => u.country,
  );
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCountry = Math.max(...topCountries.map((c) => c[1]), 1);

  return (
    <Section title={t("potrebiteli")} color="#3d73b8">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("obshtoPotrebiteli")} value={String(users.length)} accent="#3d73b8" />
        <MetricCard
          label={t("noviTaziSedmitsa")}
          value={String(thisWeek)}
          sub={t("poslednite7Dni")}
          accent="#218a54"
        />
        <MetricCard
          label={t("noviToyaMesets")}
          value={String(thisMonth)}
          sub={now.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}
          accent="#8a6f45"
        />
        <MetricCard
          label={t("marketingAbonati")}
          value={String(marketing)}
          sub={t("otVsichki", { marketingPct })}
          accent="#6a4fa3"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>{t("roli")}</CardTitle>
          <div className="space-y-3">
            {roles.map((r) => (
              <HBar
                key={r.key}
                label={r.label}
                value={roleCounts[r.key] ?? 0}
                max={maxRole}
                color={r.color}
                note={t("br", { key: roleCounts[r.key] ?? 0 })}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{t("topGradove")}</CardTitle>
          {topCities.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {topCities.map(([city, cnt]) => (
                <HBar
                  key={city}
                  label={city}
                  value={cnt}
                  max={maxCity}
                  color="#3d73b8"
                  note={t("br2", { cnt })}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t("topDarzhavi")}</CardTitle>
          {topCountries.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {topCountries.map(([country, cnt]) => (
                <HBar
                  key={country}
                  label={country}
                  value={cnt}
                  max={maxCountry}
                  color="#0891b2"
                  note={t("br2", { cnt })}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </Section>
  );
}

// ── Products ──────────────────────────────────────────────────────────────────

function ProductsStats({ products }: { products: AdminProductRecord[] }) {
  const t = useTranslations("AdminStats");
  const avgPrice =
    products.length > 0 ? sumBy(products, (p) => p.priceEur) / products.length : 0;
  const minPrice = products.length > 0 ? Math.min(...products.map((p) => p.priceEur)) : 0;
  const maxPrice = products.length > 0 ? Math.max(...products.map((p) => p.priceEur)) : 0;

  const brandCounts = groupCount(products, (p) => p.brand);
  const brands = [
    { label: "Brami", key: "brami", color: "#8a6f45" },
    { label: "Voditsa", key: "Voditsa", color: "#218a54" },
    { label: "Shafpol Beauty", key: "Shafpol Beauty", color: "#c58a2f" },
    { label: t("drugo"), key: "other", color: "#6a7480" },
  ];
  const maxBrand = Math.max(...brands.map((b) => brandCounts[b.key] ?? 0), 1);

  const badgeCounts = groupCount(products, (p) => p.badge);
  const badges = [
    { label: "Bestseller", key: "bestseller", color: "#c9a227" },
    { label: "Sale", key: "sale", color: "#b64242" },
    { label: t("novo"), key: "new", color: "#218a54" },
    { label: t("lyubimo"), key: "favorite", color: "#e06fa0" },
    { label: "Featured", key: "featured", color: "#3d73b8" },
    { label: t("zaDetsa"), key: "kids", color: "#e0872c" },
    { label: t("bezBadzh"), key: "none", color: "#8c96a0" },
  ].filter((b) => (badgeCounts[b.key] ?? 0) > 0);
  const maxBadge = Math.max(...badges.map((b) => badgeCounts[b.key] ?? 0), 1);

  const allCategories = products.flatMap((p) => p.categories);
  const catCounts = allCategories.reduce<Record<string, number>>((acc, c) => {
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCat = Math.max(...topCategories.map((c) => c[1]), 1);

  const withDiscount = countBy(products, (p) => (p.discountPercent ?? 0) > 0);
  const avgRating =
    products.length > 0
      ? sumBy(products, (p) => p.rating) / products.length
      : 0;

  return (
    <Section title={t("produkti")} color="#218a54">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("obshtoProdukti")} value={String(products.length)} accent="#218a54" />
        <MetricCard
          label={t("srednaTsena")}
          value={`€ ${avgPrice.toFixed(2)}`}
          sub={t("minMaks", { minPrice: minPrice.toFixed(2), maxPrice: maxPrice.toFixed(2) })}
          accent="#8a6f45"
        />
        <MetricCard
          label={t("sNamalenie")}
          value={String(withDiscount)}
          sub={
            products.length > 0
              ? t("otKataloga", { count: Math.round((withDiscount / products.length) * 100) })
              : "—"
          }
          accent="#b64242"
        />
        <MetricCard
          label={t("srednaOtsenka")}
          value={avgRating.toFixed(1)}
          sub={t("otVsichkiProdukti")}
          accent="#c9a227"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>{t("poMarka")}</CardTitle>
          <div className="space-y-3">
            {brands.map((b) => (
              <HBar
                key={b.key}
                label={b.label}
                value={brandCounts[b.key] ?? 0}
                max={maxBrand}
                color={b.color}
                note={t("br", { key: brandCounts[b.key] ?? 0 })}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{t("poBadzh")}</CardTitle>
          {badges.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {badges.map((b) => (
                <HBar
                  key={b.key}
                  label={b.label}
                  value={badgeCounts[b.key] ?? 0}
                  max={maxBadge}
                  color={b.color}
                  note={t("br", { key: badgeCounts[b.key] ?? 0 })}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t("topKategorii")}</CardTitle>
          {topCategories.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {topCategories.map(([cat, cnt]) => (
                <HBar
                  key={cat}
                  label={cat}
                  value={cnt}
                  max={maxCat}
                  color="#218a54"
                  note={t("br2", { cnt })}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </Section>
  );
}

// ── Product Sales ─────────────────────────────────────────────────────────────

type ProductSaleEntry = {
  name: string;
  packaging: string;
  ordersCount: number;
  totalQty: number;
  totalRevenue: number;
  avgUnitPrice: number;
};

function ProductSalesStats({ orders }: { orders: AdminOrderRecord[] }) {
  const t = useTranslations("AdminStats");
  const activeOrders = orders.filter((o) => o.status !== "Отказана");

  const productMap = new Map<string, ProductSaleEntry>();
  for (const order of activeOrders) {
    for (const item of order.items) {
      const key = `${item.productName}||${item.packaging}`;
      const existing = productMap.get(key);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalQty += item.quantity;
        existing.totalRevenue += item.totalPrice;
      } else {
        productMap.set(key, {
          name: item.productName,
          packaging: item.packaging,
          ordersCount: 1,
          totalQty: item.quantity,
          totalRevenue: item.totalPrice,
          avgUnitPrice: item.unitPrice,
        });
      }
    }
  }

  const entries = Array.from(productMap.values());

  if (entries.length === 0) {
    return (
      <Section title={t("prodazhbiPoProdukt")} color="#6a4fa3">
        <Empty />
      </Section>
    );
  }

  const byRevenue = [...entries].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
  const byQty = [...entries].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10);
  const tableEntries = [...entries].sort((a, b) => b.totalRevenue - a.totalRevenue);

  const maxRevenue = Math.max(...byRevenue.map((e) => e.totalRevenue), 1);
  const maxQty = Math.max(...byQty.map((e) => e.totalQty), 1);

  const totalRevenue = sumBy(entries, (e) => e.totalRevenue);
  const totalQty = sumBy(entries, (e) => e.totalQty);
  const uniqueProducts = entries.length;

  return (
    <Section title={t("prodazhbiPoProdukt")} color="#6a4fa3">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label={t("unikalniProdukta")}
          value={String(uniqueProducts)}
          sub={t("razlichniSkuTa")}
          accent="#6a4fa3"
        />
        <MetricCard
          label={t("obshtoProdadeniBroyki")}
          value={String(totalQty)}
          sub={t("otAktivniPorachki")}
          accent="#8a6f45"
        />
        <MetricCard
          label={t("obshtoPrihodiOtArtikuli")}
          value={`€ ${totalRevenue.toFixed(2)}`}
          sub={t("bezOtkazaniPorachki")}
          accent="#218a54"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("top10PoPrihodi")}</CardTitle>
          <div className="space-y-3">
            {byRevenue.map((e) => (
              <HBar
                key={`${e.name}||${e.packaging}`}
                label={e.packaging ? `${e.name} · ${e.packaging}` : e.name}
                value={e.totalRevenue}
                max={maxRevenue}
                color="#6a4fa3"
                note={`€ ${e.totalRevenue.toFixed(2)}`}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{t("top10PoProdadeni")}</CardTitle>
          <div className="space-y-3">
            {byQty.map((e) => (
              <HBar
                key={`${e.name}||${e.packaging}`}
                label={e.packaging ? `${e.name} · ${e.packaging}` : e.name}
                value={e.totalQty}
                max={maxQty}
                color="#8a6f45"
                note={t("br3", { totalQty: e.totalQty })}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>{t("palnaSpravka")}</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7dfd1]">
                <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  {t("produkt")}
                </th>
                <th className="pb-2.5 pr-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  {t("porachki")}
                </th>
                <th className="pb-2.5 pr-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  {t("broyki")}
                </th>
                <th className="pb-2.5 pr-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  {t("edTsena")}
                </th>
                <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  {t("prihod")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece4]">
              {tableEntries.map((e, i) => (
                <tr key={i} className="group">
                  <td className="py-2.5 pr-4">
                    <p className="text-sm font-medium text-[#1d2733]">{e.name}</p>
                    {e.packaging ? (
                      <p className="text-xs text-[#6a7480]">{e.packaging}</p>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-1 text-right text-sm text-[#4f5b66]">
                    {e.ordersCount}
                  </td>
                  <td className="py-2.5 pr-1 text-right text-sm font-medium text-[#4f5b66]">
                    {e.totalQty}
                  </td>
                  <td className="py-2.5 pr-1 text-right text-sm text-[#4f5b66]">
                    € {e.avgUnitPrice.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right text-sm font-semibold text-[#1d2733]">
                    € {e.totalRevenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#ddd7cb]">
                <td className="pt-3 text-xs font-semibold text-[#8a6f45]">{t("obshto")}</td>
                <td />
                <td className="pt-3 text-right text-sm font-bold text-[#1d2733]">{totalQty}</td>
                <td />
                <td className="pt-3 text-right text-sm font-bold text-[#1d2733]">
                  € {totalRevenue.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </Section>
  );
}

// ── Visits ────────────────────────────────────────────────────────────────────

/** `t` is bound to the AdminStats namespace (units under "duration"). */
function formatDuration(ms: number, t: (key: string, values?: Record<string, number>) => string) {
  if (ms < 1000) return t("duration.underSecond");
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return t("duration.seconds", { s: totalSec });
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes < 60) return seconds > 0 ? t("duration.minutesSeconds", { m: minutes, s: seconds }) : t("duration.minutes", { m: minutes });
  const hours = Math.floor(minutes / 60);
  const restMin = minutes % 60;
  return restMin > 0 ? t("duration.hoursMinutes", { h: hours, m: restMin }) : t("duration.hours", { h: hours });
}

function formatRelative(iso: string, locale: string) {
  const date = new Date(iso);
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function landingPathOnly(path: string) {
  return path.split("?")[0] || "/";
}

function hostFromReferrer(ref: string | null) {
  if (!ref) return null;
  try {
    return new URL(ref).hostname;
  } catch {
    return null;
  }
}

function flagFromCountryCode(code: string | null | undefined) {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6;
  const a = "A".charCodeAt(0);
  const cc = code.toUpperCase();
  return String.fromCodePoint(base + cc.charCodeAt(0) - a, base + cc.charCodeAt(1) - a);
}

function geoLabel(visit: { city: string | null; region: string | null; country: string | null }) {
  const parts = [visit.city, visit.region, visit.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ── Visits time chart ─────────────────────────────────────────────────────────

type Granularity = "day" | "week" | "month";

type Bucket = { key: string; start: Date; end: Date; label: string };

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildBuckets(granularity: Granularity, locale: string): Bucket[] {
  const now = new Date();
  const buckets: Bucket[] = [];

  if (granularity === "day") {
    // 24 hourly buckets covering today.
    const todayStart = startOfDay(now);
    for (let hour = 0; hour < 24; hour += 1) {
      const start = new Date(todayStart.getTime() + hour * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      buckets.push({
        key: start.toISOString(),
        start,
        end,
        label: `${String(hour).padStart(2, "0")}h`,
      });
    }
    return buckets;
  }

  // "week" → last 7 days, "month" → last 30 days, both as daily buckets
  // ending with today.
  const dayCount = granularity === "week" ? 7 : 30;
  const todayStart = startOfDay(now);
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() - i);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    buckets.push({
      key: start.toISOString(),
      start,
      end,
      label: start.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
    });
  }
  return buckets;
}

function VisitsTimeChart({
  visits,
  visitors,
}: {
  visits: AdminVisitRecord[];
  visitors: AdminVisitorRecord[];
}) {
  const t = useTranslations("AdminStats");
  const dateLocale = useLocale() === "en" ? "en-GB" : "bg-BG";
  const [granularity, setGranularity] = useState<Granularity>("day");
  const buckets = buildBuckets(granularity, dateLocale);
  const earliestStart = buckets[0]?.start.getTime() ?? 0;

  // visitor_id → first session timestamp (so we can count "new visitors" per bucket)
  const visitorFirstSeen = new Map<string, number>();
  for (const v of visitors) {
    visitorFirstSeen.set(v.id, new Date(v.firstSeenAt).getTime());
  }

  const data = buckets.map((bucket) => {
    const startMs = bucket.start.getTime();
    const endMs = bucket.end.getTime();
    const inRange = visits.filter((v) => {
      const t = new Date(v.startedAt).getTime();
      return t >= startMs && t < endMs;
    });
    const uniqueVisitorIds = new Set(
      inRange.map((v) => v.visitorId).filter((id): id is string => Boolean(id)),
    );
    const newVisitorIds = Array.from(uniqueVisitorIds).filter((id) => {
      const first = visitorFirstSeen.get(id);
      return first != null && first >= startMs && first < endMs;
    });
    return {
      label: bucket.label,
      sessions: inRange.length,
      visitors: uniqueVisitorIds.size,
      newVisitors: newVisitorIds.length,
    };
  });

  const maxValue = Math.max(...data.map((d) => Math.max(d.sessions, d.visitors)), 1);
  const totalSessions = sumBy(data, (d) => d.sessions);
  const totalVisitors = (() => {
    const set = new Set<string>();
    for (const v of visits) {
      if (!v.visitorId) continue;
      const t = new Date(v.startedAt).getTime();
      if (t >= earliestStart) set.add(v.visitorId);
    }
    return set.size;
  })();

  const granularityButtons: Array<{ value: Granularity; label: string }> = [
    { value: "day", label: t("den") },
    { value: "week", label: t("sedmitsa") },
    { value: "month", label: t("mesets") },
  ];

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <CardTitle>
          {granularity === "day"
            ? t("sesiiIUnikalniPotrebiteli")
            : granularity === "week"
              ? t("sesiiIUnikalniPotrebiteli2")
              : t("sesiiIUnikalniPotrebiteli3")}
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#7c8a96]">
            {t("unikSesiiVPerioda", { totalVisitors, totalSessions })}
          </span>
          <div className="flex overflow-hidden rounded-full border border-[#e7dfd1]">
            {granularityButtons.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setGranularity(btn.value)}
                className={`px-3 py-1 text-[11px] font-medium transition ${
                  granularity === btn.value
                    ? "bg-[#1d2733] text-white"
                    : "bg-white text-[#4f5b66] hover:bg-[#f4efe5]"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-4 text-[10px] text-[#6a7480]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-[#0891b2]" /> {t("legendUnique")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-[#3d73b8]" /> {t("legendSessions")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-[#218a54]" /> {t("legendNew")}
        </span>
      </div>

      <div
        className={`flex items-end ${granularity === "week" ? "gap-2" : "gap-1"}`}
        style={{ height: "160px" }}
      >
        {data.map((d, i) => {
          const visitorH = Math.round((d.visitors / maxValue) * 100);
          const sessionH = Math.round((d.sessions / maxValue) * 100);
          const newH = Math.round((d.newVisitors / maxValue) * 100);
          // Thin out labels on dense charts to avoid clutter:
          // day = every 2 hours, month = every 5 days, week = every day.
          const showLabel =
            granularity === "day"
              ? i % 2 === 0
              : granularity === "month"
                ? i % 5 === 0
                : true;
          // Show each metric's count above its own bar, for every view
          // including the hourly day view.
          const bars = [
            { value: d.visitors, h: visitorH, color: "#0891b2", title: t("unik", { label: d.label, visitors: d.visitors }) },
            { value: d.sessions, h: sessionH, color: "#3d73b8", title: t("sesii", { label: d.label, sessions: d.sessions }) },
            { value: d.newVisitors, h: newH, color: "#218a54", title: t("novi", { label: d.label, newVisitors: d.newVisitors }) },
          ];
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="flex w-full items-end justify-center gap-[2px]"
                style={{ height: "128px" }}
              >
                {bars.map((b, bi) => (
                  <div key={bi} className="flex w-1/3 flex-col items-center justify-end">
                    {b.value > 0 ? (
                      <p
                        className="mb-0.5 text-[8px] font-semibold leading-none"
                        style={{ color: b.color }}
                      >
                        {b.value}
                      </p>
                    ) : null}
                    <div
                      className="w-full rounded-t-[3px]"
                      style={{
                        height: `${Math.max(b.h, b.value > 0 ? 3 : 0)}px`,
                        backgroundColor: b.color,
                      }}
                      title={b.title}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-[#6a7480]">{showLabel ? d.label : " "}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function VisitRow({
  visit,
  isReturning,
}: {
  visit: AdminVisitRecord;
  isReturning: boolean;
}) {
  const t = useTranslations("AdminStats");
  const dateLocale = useLocale() === "en" ? "en-GB" : "bg-BG";
  const [open, setOpen] = useState(false);
  const durationMs =
    new Date(visit.lastSeenAt).getTime() - new Date(visit.startedAt).getTime();
  const refHost = hostFromReferrer(visit.referrer) ?? t("direktno");
  const flag = flagFromCountryCode(visit.countryCode);
  const geo = geoLabel(visit);

  return (
    <div className="border-b border-[#f0ece4]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-medium text-[#1d2733]">
            {flag ? <span aria-hidden>{flag}</span> : null}
            <span className="truncate">{visit.landingPath ?? "—"}</span>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                isReturning
                  ? "bg-[#e9f1e6] text-[#218a54]"
                  : "bg-[#eef2f7] text-[#3d73b8]"
              }`}
            >
              {isReturning ? t("vrashtashtSe") : t("nov")}
            </span>
          </p>
          <p className="truncate text-xs text-[#6a7480]">
            {t("ot", { startedAt: formatRelative(visit.startedAt, dateLocale), neizvestnaLokatsiya: geo ?? t("neizvestnaLokatsiya"), refHost })}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-[#3d73b8]">
          {t("str", { pageviewCount: visit.pageviewCount })}
        </span>
        <span className="shrink-0 text-xs text-[#7c8a96]">
          {formatDuration(Math.max(durationMs, 0), t)}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-[#8a9099] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div className="pb-4 pl-1 pr-1">
          {visit.userAgent ? (
            <p className="mb-2 text-[11px] text-[#8a9099]">{visit.userAgent}</p>
          ) : null}
          <ol className="space-y-1.5 border-l border-[#e7dfd1] pl-3">
            {visit.pageviews.map((pv, i) => (
              <li key={pv.id} className="text-xs text-[#4f5b66]">
                <span className="mr-2 inline-block w-5 text-right text-[10px] font-semibold text-[#8a6f45]">
                  {i + 1}.
                </span>
                <span className="font-medium text-[#1d2733]">{pv.path}</span>
                {pv.title ? (
                  <span className="ml-2 text-[#7c8a96]">— {pv.title}</span>
                ) : null}
                <span className="ml-2 text-[10px] text-[#8a9099]">
                  {new Date(pv.viewedAt).toLocaleTimeString(dateLocale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function VisitsStats({
  visits,
  visitors,
}: {
  visits: AdminVisitRecord[];
  visitors: AdminVisitorRecord[];
}) {
  const t = useTranslations("AdminStats");
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  const todayVisits = visits.filter((v) => new Date(v.startedAt).getTime() >= dayStart);
  const weekVisits = visits.filter((v) => new Date(v.startedAt).getTime() >= weekAgo);
  const totalPageviews = sumBy(visits, (v) => v.pageviewCount);
  const avgPageviews = visits.length > 0 ? totalPageviews / visits.length : 0;
  const avgDuration =
    visits.length > 0
      ? sumBy(visits, (v) =>
          Math.max(new Date(v.lastSeenAt).getTime() - new Date(v.startedAt).getTime(), 0),
        ) / visits.length
      : 0;

  // Unique vs returning visitors
  const totalVisitors = visitors.length;
  const returningVisitors = visitors.filter((v) => v.visitCount > 1).length;
  const newVisitors = totalVisitors - returningVisitors;
  const returningPct =
    totalVisitors > 0 ? Math.round((returningVisitors / totalVisitors) * 100) : 0;
  const todayVisitors = visitors.filter((v) => new Date(v.firstSeenAt).getTime() >= dayStart).length;

  // Map visitor_id → visitCount so we can tag each visit as new/returning
  const visitorCountMap = new Map(visitors.map((v) => [v.id, v.visitCount]));
  const isReturningVisit = (visit: AdminVisitRecord) => {
    if (!visit.visitorId) return false;
    return (visitorCountMap.get(visit.visitorId) ?? 0) > 1;
  };

  // Geo aggregates from visits (so we see distribution by session, not by person)
  const countryAgg = visits
    .filter((v) => v.country)
    .reduce<Record<string, { count: number; code: string | null }>>((acc, v) => {
      const key = v.country as string;
      acc[key] = {
        count: (acc[key]?.count ?? 0) + 1,
        code: acc[key]?.code ?? v.countryCode,
      };
      return acc;
    }, {});
  const topCountries = Object.entries(countryAgg)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);
  const maxCountry = Math.max(...topCountries.map((e) => e[1].count), 1);

  const cityCounts = groupCount(
    visits.filter((v) => v.city),
    (v) => `${v.city}, ${v.countryCode ?? v.country ?? "?"}`,
  );
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCity = Math.max(...topCities.map((e) => e[1]), 1);

  // Top landing paths
  const landingCounts = groupCount(
    visits.filter((v) => v.landingPath),
    (v) => v.landingPath as string,
  );
  const topLandings = Object.entries(landingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxLanding = Math.max(...topLandings.map((e) => e[1]), 1);

  // Top viewed paths (across all pageviews)
  const pathCounts = visits
    .flatMap((v) => v.pageviews.map((pv) => pv.path))
    .reduce<Record<string, number>>((acc, path) => {
      acc[path] = (acc[path] ?? 0) + 1;
      return acc;
    }, {});
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxPath = Math.max(...topPaths.map((e) => e[1]), 1);

  // Referrers
  const referrerCounts = visits.reduce<Record<string, number>>((acc, v) => {
    const host = hostFromReferrer(v.referrer) ?? t("direktno");
    acc[host] = (acc[host] ?? 0) + 1;
    return acc;
  }, {});
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxReferrer = Math.max(...topReferrers.map((e) => e[1]), 1);

  // Visits from AI assistants (referrer or utm_source)
  const aiVisits = visits
    .map((v) => ({ visit: v, source: detectAiSource(v.referrer, v.landingPath) }))
    .filter((entry): entry is { visit: AdminVisitRecord; source: NonNullable<typeof entry.source> } => entry.source !== null);
  const aiSourceCounts = Object.entries(
    aiVisits.reduce<Record<string, number>>((acc, { source }) => {
      acc[source.label] = (acc[source.label] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxAiSource = Math.max(...aiSourceCounts.map((e) => e[1]), 1);
  const aiLandingCounts = Object.entries(
    aiVisits.reduce<Record<string, number>>((acc, { visit }) => {
      const path = landingPathOnly(visit.landingPath ?? "/");
      acc[path] = (acc[path] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxAiLanding = Math.max(...aiLandingCounts.map((e) => e[1]), 1);
  const aiPercent = visits.length > 0 ? Math.round((aiVisits.length / visits.length) * 1000) / 10 : 0;

  // Recent visits to show in expandable list
  const recentVisits = visits.slice(0, 25);

  return (
    <Section title={t("poseshteniya")} color="#0891b2">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("unikalniPotrebiteli")}
          value={String(totalVisitors)}
          sub={t("noviVrashtashtiSe", { newVisitors, returningVisitors })}
          hint={t("broyRazlichniUstroystvaBrauzari")}
          accent="#0891b2"
        />
        <MetricCard
          label={t("vrashtashtiSe")}
          value={`${returningPct} %`}
          sub={t("ot2", { returningVisitors, totalVisitors })}
          hint={t("kakavDyalOtUnikalnite")}
          accent="#218a54"
        />
        <MetricCard
          label={t("sesiiObshto")}
          value={String(visits.length)}
          sub={t("pregledaNaStranitsa", { totalPageviews })}
          hint={t("broyPoseshteniyaEdnaSesiya")}
          accent="#3d73b8"
        />
        <MetricCard
          label={t("srednoStrSesiya")}
          value={avgPageviews.toFixed(1)}
          sub={t("srednaProdalzhitelnost", { avgDuration: formatDuration(avgDuration, t) })}
          hint={t("srednoKolkoStranitsiRazglezhda")}
          accent="#8a6f45"
        />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label={t("noviPotrebiteliDnes")}
          value={String(todayVisitors)}
          sub={t("zaParviPatNa")}
          hint={t("potrebiteliChietoParvoV")}
          accent="#218a54"
        />
        <MetricCard
          label={t("sesiiDnes")}
          value={String(todayVisits.length)}
          sub={t("pregleda", { pageviewCount: sumBy(todayVisits, (v) => v.pageviewCount) })}
          hint={t("obshtBroyPoseshteniyaZapochnali")}
          accent="#0891b2"
        />
        <MetricCard
          label={t("sesiiPoslednite7Dni")}
          value={String(weekVisits.length)}
          sub={t("pregleda", { pageviewCount: sumBy(weekVisits, (v) => v.pageviewCount) })}
          hint={t("obshtBroySesiiZa")}
          accent="#6a4fa3"
        />
      </div>

      <div className="mb-4">
        <VisitsTimeChart visits={visits} visitors={visitors} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("aiVisitsTitle")}</CardTitle>
          <p className="-mt-2 mb-4 text-xs text-[#6a7480]">
            {t("aiVisitsSummary", { count: aiVisits.length, total: visits.length, percent: aiPercent })}
          </p>
          {aiSourceCounts.length === 0 ? (
            <p className="text-sm text-[#6a7480]">{t("aiVisitsNone")}</p>
          ) : (
            <div className="space-y-3">
              {aiSourceCounts.map(([label, cnt]) => (
                <HBar key={label} label={label} value={cnt} max={maxAiSource} color="#7c4dbd" note={`${cnt}`} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t("aiLandingTitle")}</CardTitle>
          {aiLandingCounts.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {aiLandingCounts.map(([path, cnt]) => (
                <HBar key={path} label={path} value={cnt} max={maxAiLanding} color="#a07ad6" note={`${cnt}`} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("topDarzhavi")}</CardTitle>
          {topCountries.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {topCountries.map(([country, info]) => {
                const flag = flagFromCountryCode(info.code);
                return (
                  <HBar
                    key={country}
                    label={flag ? `${flag}  ${country}` : country}
                    value={info.count}
                    max={maxCountry}
                    color="#0891b2"
                    note={`${info.count}`}
                  />
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t("topGradove")}</CardTitle>
          {topCities.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {topCities.map(([city, cnt]) => (
                <HBar
                  key={city}
                  label={city}
                  value={cnt}
                  max={maxCity}
                  color="#3d73b8"
                  note={`${cnt}`}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("topStranitsiVsichkiPregledi")}</CardTitle>
          {topPaths.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {topPaths.map(([path, cnt]) => (
                <HBar
                  key={path}
                  label={path}
                  value={cnt}
                  max={maxPath}
                  color="#0891b2"
                  note={`${cnt}`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t("topVhodniStranitsi")}</CardTitle>
          {topLandings.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {topLandings.map(([path, cnt]) => (
                <HBar
                  key={path}
                  label={path}
                  value={cnt}
                  max={maxLanding}
                  color="#3d73b8"
                  note={`${cnt}`}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("iztochnitsiReferrer")}</CardTitle>
          {topReferrers.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {topReferrers.map(([host, cnt]) => (
                <HBar
                  key={host}
                  label={host}
                  value={cnt}
                  max={maxReferrer}
                  color="#6a4fa3"
                  note={`${cnt}`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t("recentVisits", { count: recentVisits.length })}</CardTitle>
          {recentVisits.length === 0 ? (
            <Empty />
          ) : (
            <div>
              {recentVisits.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  isReturning={isReturningVisit(visit)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </Section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AdminStats({
  orders,
  users,
  products,
  visits,
  visitors,
}: {
  orders: AdminOrderRecord[];
  users: AdminUserProfile[];
  products: AdminProductRecord[];
  visits: AdminVisitRecord[];
  visitors: AdminVisitorRecord[];
}) {
  return (
    <div className="space-y-3">
      <VisitsStats visits={visits} visitors={visitors} />
      <OrdersStats orders={orders} />
      <ProductSalesStats orders={orders} />
      <UsersStats users={users} />
      <ProductsStats products={products} />
    </div>
  );
}
