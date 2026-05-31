import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminOrderStatusControl } from "@/components/admin-order-status-control";
import { AdminPrintButton } from "@/components/admin-print-button";
import { AdminShell } from "@/components/admin-shell";
import { getAdminOrderById } from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const { id } = await params;
  const [session, order] = await Promise.all([
    requireAdminSession(),
    getAdminOrderById(id),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <AdminShell
      session={session}
      currentPath="/admin-panel/orders"
      title={`Поръчка ${order.orderNumber}`}
      description="Детайлен преглед на клиент, доставка, артикули и суми."
    >
      <div className="admin-print-hidden mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/admin-panel/orders"
          className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[#d2c8b8] bg-white px-4 text-sm font-semibold text-[#1d2733] transition hover:bg-[#f8f4ec]"
        >
          Назад към поръчките
        </Link>
        <AdminPrintButton />
      </div>

      <div className="admin-print-area">

      {/* ── Invoice layout (print only) ────────────────────────── */}
      <div className="admin-print-invoice" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#111827', lineHeight: 1.5 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '10px', borderBottom: '2px solid #111827', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '20pt', fontWeight: 800, letterSpacing: '0.05em', color: '#1d2733', lineHeight: 1 }}>ПОРЪЧКА</p>
            <p style={{ fontSize: '10pt', color: '#6a7480', marginTop: '4px' }}>{order.orderNumber}</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', color: '#4f5b66', lineHeight: 1.7 }}>
            <p>{new Date(order.createdAt).toLocaleDateString('bg-BG')}</p>
            <p>{new Date(order.createdAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}</p>
            <p style={{ marginTop: '4px', fontWeight: 700, color: '#1d2733' }}>{order.status}</p>
          </div>
        </div>

        {/* Customer + Delivery */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a6f45', marginBottom: '5px' }}>Клиент</p>
            <p style={{ fontWeight: 600, color: '#1d2733', fontSize: '10pt' }}>{order.customerFullName}</p>
            <p style={{ color: '#4f5b66', marginTop: '2px' }}>{order.customerEmail}</p>
            <p style={{ color: '#4f5b66', marginTop: '2px' }}>{order.customerPhone}</p>
          </div>
          <div>
            <p style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a6f45', marginBottom: '5px' }}>Доставка</p>
            <p style={{ fontWeight: 600, color: '#1d2733' }}>{order.deliveryMethodLabel}</p>
            <p style={{ color: '#4f5b66', marginTop: '2px' }}>{order.deliveryDestination}</p>
            {order.deliveryNotes ? <p style={{ color: '#6a7480', marginTop: '2px', fontStyle: 'italic' }}>{order.deliveryNotes}</p> : null}
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr style={{ borderTop: '1.5px solid #1d2733', borderBottom: '1px solid #1d2733' }}>
              <th style={{ textAlign: 'left', padding: '5px 0', fontWeight: 700, fontSize: '7pt', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6a7480' }}>Продукт</th>
              <th style={{ textAlign: 'center', padding: '5px 8px', fontWeight: 700, fontSize: '7pt', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6a7480' }}>Опаковка</th>
              <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, fontSize: '7pt', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6a7480' }}>Ед. цена</th>
              <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, fontSize: '7pt', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6a7480' }}>Брой</th>
              <th style={{ textAlign: 'right', padding: '5px 0', fontWeight: 700, fontSize: '7pt', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6a7480' }}>Сума</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '5px 0', fontWeight: 600, color: '#1d2733' }}>{item.productName}</td>
                <td style={{ padding: '5px 8px', color: '#4f5b66', textAlign: 'center' }}>{item.packaging}</td>
                <td style={{ padding: '5px 8px', color: '#4f5b66', textAlign: 'right' }}>{item.unitPrice.toFixed(2)} €</td>
                <td style={{ padding: '5px 8px', color: '#4f5b66', textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ padding: '5px 0', fontWeight: 600, color: '#1d2733', textAlign: 'right' }}>{item.totalPrice.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ fontSize: '9pt', borderCollapse: 'collapse', minWidth: '230px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 20px 2px 0', color: '#4f5b66' }}>Подсума</td>
                <td style={{ textAlign: 'right', color: '#1d2733' }}>{order.subtotal.toFixed(2)} €</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 20px 2px 0', color: '#4f5b66' }}>Доставка</td>
                <td style={{ textAlign: 'right', color: '#1d2733' }}>{order.shipping.toFixed(2)} €</td>
              </tr>
              <tr style={{ borderTop: '1.5px solid #1d2733' }}>
                <td style={{ padding: '5px 20px 0 0', fontWeight: 700, fontSize: '10.5pt', color: '#1d2733' }}>Общо</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '10.5pt', color: '#1d2733', paddingTop: '5px' }}>{order.total.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
      {/* ── End invoice layout ──────────────────────────────────── */}

      <div className="admin-print-cards grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="rounded-[8px] border border-[#ddd7cb] bg-white p-5 shadow-[0_20px_50px_rgba(20,28,38,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eee7dc] pb-5">
            <div>
              <div className="admin-print-hidden">
                <AdminOrderStatusControl
                  orderId={order.id}
                  status={order.status}
                  saveMode="manual"
                />
              </div>
              <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6f45] print:block">
                {order.status}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#1d2733]">
                {order.customerFullName}
              </h2>
              <p className="mt-2 text-sm text-[#5f6b76]">
                Създадена: {new Date(order.createdAt).toLocaleString("bg-BG")}
              </p>
            </div>

            <div className="text-left xl:text-right">
              <p className="text-sm text-[#5f6b76]">Общо</p>
              <p className="mt-1 text-2xl font-semibold text-[#1d2733]">
                {order.total.toFixed(2)} €
              </p>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-base font-semibold text-[#1d2733]">Артикули</h3>
            <div className="mt-4 overflow-hidden rounded-[8px] border border-[#e7dfd1]">
              <div className="hidden grid-cols-[1fr_110px_90px_120px] gap-4 border-b border-[#e7dfd1] bg-[#fcfbf8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61] md:grid">
                <span>Продукт</span>
                <span>Ед. цена</span>
                <span>Брой</span>
                <span className="text-right">Общо</span>
              </div>

              <div className="divide-y divide-[#eee7dc]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_110px_90px_120px] md:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1d2733]">{item.productName}</p>
                      <p className="mt-1 text-sm text-[#5f6b76]">{item.packaging}</p>
                      {item.productUrl ? (
                        <a
                          href={item.productUrl}
                          className="mt-2 inline-flex text-sm font-medium text-[#6f5a33] underline-offset-4 hover:underline"
                        >
                          Отвори продукта
                        </a>
                      ) : null}
                    </div>

                    <p className="text-sm text-[#4f5b66]">{item.unitPrice.toFixed(2)} €</p>
                    <p className="text-sm text-[#4f5b66]">{item.quantity}</p>
                    <p className="text-left text-sm font-semibold text-[#1d2733] md:text-right">
                      {item.totalPrice.toFixed(2)} €
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[8px] border border-[#ddd7cb] bg-white p-5 shadow-[0_20px_50px_rgba(20,28,38,0.05)]">
            <h3 className="text-base font-semibold text-[#1d2733]">Клиент</h3>
            <div className="mt-4 space-y-3 text-sm text-[#4f5b66]">
              <p>
                <span className="font-semibold text-[#1d2733]">Име:</span>{" "}
                {order.customerFullName}
              </p>
              <p>
                <span className="font-semibold text-[#1d2733]">Имейл:</span>{" "}
                {order.customerEmail}
              </p>
              <p>
                <span className="font-semibold text-[#1d2733]">Телефон:</span>{" "}
                {order.customerPhone}
              </p>
            </div>
          </section>

          <section className="rounded-[8px] border border-[#ddd7cb] bg-white p-5 shadow-[0_20px_50px_rgba(20,28,38,0.05)]">
            <h3 className="text-base font-semibold text-[#1d2733]">Доставка</h3>
            <div className="mt-4 space-y-3 text-sm text-[#4f5b66]">
              <p>
                <span className="font-semibold text-[#1d2733]">Метод:</span>{" "}
                {order.deliveryMethodLabel}
              </p>
              <p>
                <span className="font-semibold text-[#1d2733]">Адрес:</span>{" "}
                {order.deliveryDestination}
              </p>
              {order.deliveryNotes ? (
                <p>
                  <span className="font-semibold text-[#1d2733]">Бележки:</span>{" "}
                  {order.deliveryNotes}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[8px] border border-[#ddd7cb] bg-white p-5 shadow-[0_20px_50px_rgba(20,28,38,0.05)]">
            <h3 className="text-base font-semibold text-[#1d2733]">Суми</h3>
            <div className="mt-4 space-y-3 text-sm text-[#4f5b66]">
              <div className="flex items-center justify-between">
                <span>Междинна сума</span>
                <span>{order.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Доставка</span>
                <span>{order.shipping.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#e7dfd1] pt-3 font-semibold text-[#1d2733]">
                <span>Общо</span>
                <span>{order.total.toFixed(2)} €</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      </div>
    </AdminShell>
  );
}
