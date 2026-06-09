"use client";

import { useState } from "react";

import type {
  AdminOrderRecord,
  AdminUserProfile,
  AdminProductRecord,
  AdminVisitRecord,
  AdminVisitorRecord,
} from "@/lib/admin-data";

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

function last6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("bg-BG", { month: "short", year: "2-digit" }),
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
  return <p className="text-sm text-[#7c8a96]">Няма данни</p>;
}

// ── Monthly bar chart ─────────────────────────────────────────────────────────

function MonthlyBarChart({
  data,
}: {
  data: { label: string; revenue: number; count: number }[];
}) {
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
              <p className="text-[9px] font-medium text-[#8a9aaa]">{d.count} бр.</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Orders ────────────────────────────────────────────────────────────────────

function OrdersStats({ orders }: { orders: AdminOrderRecord[] }) {
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

  const monthlyData = last6Months().map(({ year, month, label }) => {
    const mo = active.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return { label, revenue: sumBy(mo, (o) => o.total), count: mo.length };
  });

  const statusCounts = groupCount(orders, (o) => o.status);
  const statuses = [
    { label: "Потвърдени", key: "Потвърдена", color: "#0891b2" },
    { label: "В обработка", key: "В обработка", color: "#c9a227" },
    { label: "Изпратени", key: "Изпратена", color: "#3d73b8" },
    { label: "Доставени", key: "Доставена", color: "#218a54" },
    { label: "Отказани", key: "Отказана", color: "#b64242" },
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
    <Section title="Поръчки" color="#8a6f45">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Общо приходи"
          value={`€ ${revenue.toFixed(2)}`}
          sub="без отказани поръчки"
          accent="#218a54"
        />
        <MetricCard
          label="Приходи — месеца"
          value={`€ ${thisMonthRevenue.toFixed(2)}`}
          sub={now.toLocaleDateString("bg-BG", { month: "long", year: "numeric" })}
          accent="#3d73b8"
        />
        <MetricCard
          label="Средна поръчка"
          value={`€ ${avgOrder.toFixed(2)}`}
          sub={`${orders.length} поръчки общо`}
          accent="#8a6f45"
        />
        <MetricCard
          label="Продадени бройки"
          value={String(totalItems)}
          sub="артикули от всички поръчки"
          accent="#6a4fa3"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardTitle>Приходи по месеци (последните 6)</CardTitle>
          <MonthlyBarChart data={monthlyData} />
        </Card>

        <Card>
          <CardTitle>Разпределение по статус</CardTitle>
          <div className="space-y-3">
            {statuses.map((s) => (
              <HBar
                key={s.key}
                label={s.label}
                value={statusCounts[s.key] ?? 0}
                max={maxStatus}
                color={s.color}
                note={`${statusCounts[s.key] ?? 0} бр.`}
              />
            ))}
          </div>
          {cancelledRevLost > 0 ? (
            <p className="mt-4 text-xs text-[#7c8a96]">
              Пропуснати приходи от отказани:{" "}
              <span className="font-semibold text-[#b64242]">€ {cancelledRevLost.toFixed(2)}</span>
            </p>
          ) : null}
        </Card>
      </div>

      {deliveryEntries.length > 0 ? (
        <Card>
          <CardTitle>Методи на доставка</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deliveryEntries.map(([method, cnt]) => (
              <HBar
                key={method}
                label={method}
                value={cnt}
                max={maxDelivery}
                color="#8a6f45"
                note={`${cnt} бр.`}
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
    { label: "Потребители", key: "user", color: "#3d73b8" },
    { label: "Търговци", key: "merchant", color: "#c9a227" },
    { label: "Администратори", key: "admin", color: "#b64242" },
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
    <Section title="Потребители" color="#3d73b8">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Общо потребители" value={String(users.length)} accent="#3d73b8" />
        <MetricCard
          label="Нови — тази седмица"
          value={String(thisWeek)}
          sub="последните 7 дни"
          accent="#218a54"
        />
        <MetricCard
          label="Нови — тоя месец"
          value={String(thisMonth)}
          sub={now.toLocaleDateString("bg-BG", { month: "long", year: "numeric" })}
          accent="#8a6f45"
        />
        <MetricCard
          label="Маркетинг абонати"
          value={String(marketing)}
          sub={`${marketingPct} % от всички`}
          accent="#6a4fa3"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Роли</CardTitle>
          <div className="space-y-3">
            {roles.map((r) => (
              <HBar
                key={r.key}
                label={r.label}
                value={roleCounts[r.key] ?? 0}
                max={maxRole}
                color={r.color}
                note={`${roleCounts[r.key] ?? 0} бр.`}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Топ градове</CardTitle>
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
                  note={`${cnt} бр.`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Топ държави</CardTitle>
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
                  note={`${cnt} бр.`}
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
  const avgPrice =
    products.length > 0 ? sumBy(products, (p) => p.priceEur) / products.length : 0;
  const minPrice = products.length > 0 ? Math.min(...products.map((p) => p.priceEur)) : 0;
  const maxPrice = products.length > 0 ? Math.max(...products.map((p) => p.priceEur)) : 0;

  const brandCounts = groupCount(products, (p) => p.brand);
  const brands = [
    { label: "Brami", key: "brami", color: "#8a6f45" },
    { label: "Voditsa", key: "Voditsa", color: "#218a54" },
    { label: "Друго", key: "other", color: "#6a7480" },
  ];
  const maxBrand = Math.max(...brands.map((b) => brandCounts[b.key] ?? 0), 1);

  const badgeCounts = groupCount(products, (p) => p.badge);
  const badges = [
    { label: "Bestseller", key: "bestseller", color: "#c9a227" },
    { label: "Sale", key: "sale", color: "#b64242" },
    { label: "Ново", key: "new", color: "#218a54" },
    { label: "Любимо", key: "favorite", color: "#e06fa0" },
    { label: "Featured", key: "featured", color: "#3d73b8" },
    { label: "Без бадж", key: "none", color: "#8c96a0" },
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
    <Section title="Продукти" color="#218a54">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Общо продукти" value={String(products.length)} accent="#218a54" />
        <MetricCard
          label="Средна цена"
          value={`€ ${avgPrice.toFixed(2)}`}
          sub={`мин. €${minPrice.toFixed(2)} — макс. €${maxPrice.toFixed(2)}`}
          accent="#8a6f45"
        />
        <MetricCard
          label="С намаление"
          value={String(withDiscount)}
          sub={
            products.length > 0
              ? `${Math.round((withDiscount / products.length) * 100)} % от каталога`
              : "—"
          }
          accent="#b64242"
        />
        <MetricCard
          label="Средна оценка"
          value={avgRating.toFixed(1)}
          sub="от всички продукти"
          accent="#c9a227"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>По марка</CardTitle>
          <div className="space-y-3">
            {brands.map((b) => (
              <HBar
                key={b.key}
                label={b.label}
                value={brandCounts[b.key] ?? 0}
                max={maxBrand}
                color={b.color}
                note={`${brandCounts[b.key] ?? 0} бр.`}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>По бадж</CardTitle>
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
                  note={`${badgeCounts[b.key] ?? 0} бр.`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Топ категории</CardTitle>
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
                  note={`${cnt} бр.`}
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
      <Section title="Продажби по продукт" color="#6a4fa3">
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
    <Section title="Продажби по продукт" color="#6a4fa3">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Уникални продукта"
          value={String(uniqueProducts)}
          sub="различни SKU-та"
          accent="#6a4fa3"
        />
        <MetricCard
          label="Общо продадени бройки"
          value={String(totalQty)}
          sub="от активни поръчки"
          accent="#8a6f45"
        />
        <MetricCard
          label="Общо приходи от артикули"
          value={`€ ${totalRevenue.toFixed(2)}`}
          sub="без отказани поръчки"
          accent="#218a54"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Топ 10 по приходи</CardTitle>
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
          <CardTitle>Топ 10 по продадени бройки</CardTitle>
          <div className="space-y-3">
            {byQty.map((e) => (
              <HBar
                key={`${e.name}||${e.packaging}`}
                label={e.packaging ? `${e.name} · ${e.packaging}` : e.name}
                value={e.totalQty}
                max={maxQty}
                color="#8a6f45"
                note={`${e.totalQty} бр.`}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Пълна справка</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e7dfd1]">
                <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  Продукт
                </th>
                <th className="pb-2.5 pr-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  Поръчки
                </th>
                <th className="pb-2.5 pr-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  Бройки
                </th>
                <th className="pb-2.5 pr-1 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  Ед. цена
                </th>
                <th className="pb-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6f45]">
                  Приход
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
                <td className="pt-3 text-xs font-semibold text-[#8a6f45]">Общо</td>
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

function formatDuration(ms: number) {
  if (ms < 1000) return "<1 сек";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} сек`;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes} мин ${seconds} сек` : `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const restMin = minutes % 60;
  return restMin > 0 ? `${hours} ч ${restMin} мин` : `${hours} ч`;
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function startOfWeek(date: Date) {
  // ISO week starting Monday
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildBuckets(granularity: Granularity): Bucket[] {
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

  if (granularity === "week") {
    // 8 weekly buckets ending with the current week.
    for (let i = 7; i >= 0; i -= 1) {
      const start = startOfWeek(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7),
      );
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      buckets.push({
        key: start.toISOString(),
        start,
        end,
        label: start.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit" }),
      });
    }
    return buckets;
  }

  // 6 monthly buckets ending with the current month.
  for (let i = 5; i >= 0; i -= 1) {
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    buckets.push({
      key: start.toISOString(),
      start,
      end,
      label: start.toLocaleDateString("bg-BG", { month: "short", year: "2-digit" }),
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
  const [granularity, setGranularity] = useState<Granularity>("day");
  const buckets = buildBuckets(granularity);
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
    { value: "day", label: "Ден" },
    { value: "week", label: "Седмица" },
    { value: "month", label: "Месец" },
  ];

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <CardTitle>
          {granularity === "day"
            ? "Сесии и уникални потребители днес (по час)"
            : "Сесии и уникални потребители във времето"}
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#7c8a96]">
            {totalVisitors} уник. · {totalSessions} сесии в периода
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
          <span className="inline-block h-2 w-3 rounded-sm bg-[#0891b2]" /> уник. потребители
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-[#3d73b8]" /> сесии
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-[#218a54]" /> нови потребители
        </span>
      </div>

      <div
        className={`flex items-end ${granularity === "day" ? "gap-1" : "gap-2"}`}
        style={{ height: "160px" }}
      >
        {data.map((d, i) => {
          const visitorH = Math.round((d.visitors / maxValue) * 120);
          const sessionH = Math.round((d.sessions / maxValue) * 120);
          const newH = Math.round((d.newVisitors / maxValue) * 120);
          // For 24-hour day view, only label every 2 hours to avoid clutter.
          const showLabel = granularity !== "day" || i % 2 === 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="flex w-full items-end justify-center gap-[2px]"
                style={{ height: "128px" }}
              >
                <div
                  className="w-1/3 rounded-t-[3px] bg-[#0891b2]"
                  style={{ height: `${Math.max(visitorH, d.visitors > 0 ? 3 : 0)}px` }}
                  title={`${d.label}: ${d.visitors} уник.`}
                />
                <div
                  className="w-1/3 rounded-t-[3px] bg-[#3d73b8]"
                  style={{ height: `${Math.max(sessionH, d.sessions > 0 ? 3 : 0)}px` }}
                  title={`${d.label}: ${d.sessions} сесии`}
                />
                <div
                  className="w-1/3 rounded-t-[3px] bg-[#218a54]"
                  style={{ height: `${Math.max(newH, d.newVisitors > 0 ? 3 : 0)}px` }}
                  title={`${d.label}: ${d.newVisitors} нови`}
                />
              </div>
              <p className="text-[9px] text-[#6a7480]">{showLabel ? d.label : " "}</p>
              {(d.sessions > 0 || d.visitors > 0) && granularity !== "day" ? (
                <p className="text-[9px] font-medium text-[#1d2733]">
                  {d.visitors}/{d.sessions}
                </p>
              ) : null}
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
  const [open, setOpen] = useState(false);
  const durationMs =
    new Date(visit.lastSeenAt).getTime() - new Date(visit.startedAt).getTime();
  const refHost = hostFromReferrer(visit.referrer) ?? "директно";
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
              {isReturning ? "Връщащ се" : "Нов"}
            </span>
          </p>
          <p className="truncate text-xs text-[#6a7480]">
            {formatRelative(visit.startedAt)} · {geo ?? "неизвестна локация"} · от {refHost}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-[#3d73b8]">
          {visit.pageviewCount} стр.
        </span>
        <span className="shrink-0 text-xs text-[#7c8a96]">
          {formatDuration(Math.max(durationMs, 0))}
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
                  {new Date(pv.viewedAt).toLocaleTimeString("bg-BG", {
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
    const host = hostFromReferrer(v.referrer) ?? "директно";
    acc[host] = (acc[host] ?? 0) + 1;
    return acc;
  }, {});
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxReferrer = Math.max(...topReferrers.map((e) => e[1]), 1);

  // Recent visits to show in expandable list
  const recentVisits = visits.slice(0, 25);

  return (
    <Section title="Посещения" color="#0891b2">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Уникални потребители"
          value={String(totalVisitors)}
          sub={`${newVisitors} нови · ${returningVisitors} връщащи се`}
          hint="Брой различни устройства/браузъри, които някога са посещавали сайта. Един човек = един потребител (на базата на постоянен токен в localStorage и фингърпринт)."
          accent="#0891b2"
        />
        <MetricCard
          label="% връщащи се"
          value={`${returningPct} %`}
          sub={`${returningVisitors} от ${totalVisitors}`}
          hint="Какъв дял от уникалните потребители са се връщали поне още веднъж (имат повече от една сесия). Висок процент означава лоялна аудитория."
          accent="#218a54"
        />
        <MetricCard
          label="Сесии общо"
          value={String(visits.length)}
          sub={`${totalPageviews} прегледа на страница`}
          hint="Брой посещения. Една сесия = един път, в който някой влиза на сайта. Ако напусне и се върне по-късно, броим нова сесия."
          accent="#3d73b8"
        />
        <MetricCard
          label="Средно стр./сесия"
          value={avgPageviews.toFixed(1)}
          sub={`~${formatDuration(avgDuration)} средна продължителност`}
          hint="Средно колко страници разглежда един посетител в рамките на една сесия и колко време прекарва на сайта."
          accent="#8a6f45"
        />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Нови потребители днес"
          value={String(todayVisitors)}
          sub="за първи път на сайта"
          hint="Потребители, чието първо в историята посещение е днес. Не включва връщащи се хора, дори ако влизат за първи път за деня."
          accent="#218a54"
        />
        <MetricCard
          label="Сесии днес"
          value={String(todayVisits.length)}
          sub={`${sumBy(todayVisits, (v) => v.pageviewCount)} прегледа`}
          hint="Общ брой посещения, започнали днес от 00:00. Включва както нови, така и връщащи се потребители."
          accent="#0891b2"
        />
        <MetricCard
          label="Сесии последните 7 дни"
          value={String(weekVisits.length)}
          sub={`${sumBy(weekVisits, (v) => v.pageviewCount)} прегледа`}
          hint="Общ брой сесии за изминалата седмица. Полезно за бърз преглед на седмичния трафик."
          accent="#6a4fa3"
        />
      </div>

      <div className="mb-4">
        <VisitsTimeChart visits={visits} visitors={visitors} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Топ държави</CardTitle>
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
          <CardTitle>Топ градове</CardTitle>
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
          <CardTitle>Топ страници (всички прегледи)</CardTitle>
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
          <CardTitle>Топ входни страници</CardTitle>
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
          <CardTitle>Източници (referrer)</CardTitle>
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
          <CardTitle>Последни {recentVisits.length} посещения</CardTitle>
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
