"use client";

import { useState } from "react";

import type { AdminOrderRecord, AdminUserProfile, AdminProductRecord } from "@/lib/admin-data";

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
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="border-l-2 py-1 pl-4" style={{ borderColor: accent }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6f45]">{label}</p>
      <p className="mt-1.5 text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-[#7c8a96]">{sub}</p> : null}
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
    { label: "Super User", key: "super_user", color: "#c9a227" },
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

// ── Main export ───────────────────────────────────────────────────────────────

export function AdminStats({
  orders,
  users,
  products,
}: {
  orders: AdminOrderRecord[];
  users: AdminUserProfile[];
  products: AdminProductRecord[];
}) {
  return (
    <div className="space-y-3">
      <OrdersStats orders={orders} />
      <ProductSalesStats orders={orders} />
      <UsersStats users={users} />
      <ProductsStats products={products} />
    </div>
  );
}
