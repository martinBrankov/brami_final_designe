"use client";

import { useState } from "react";

import { AdminOrderStatusControl, getOrderStatusIcon } from "@/components/admin-order-status-control";
import { AdminPrintButton } from "@/components/admin-print-button";
import type { AdminOrderRecord } from "@/lib/admin-data";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Потвърдена":  "bg-cyan-50    text-cyan-700    border-cyan-200",
    "В обработка": "bg-amber-50   text-amber-700   border-amber-200",
    "Изпратена":   "bg-blue-50    text-blue-700    border-blue-200",
    "Доставена":   "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Отказана":    "bg-red-50     text-red-700     border-red-200",
  };
  const cls = styles[status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {getOrderStatusIcon(status)}
      {status}
    </span>
  );
}

function OrderDetail({ order, onClose }: { order: AdminOrderRecord; onClose: () => void }) {
  return (
    <div>
      <div className="admin-print-hidden mb-5 space-y-2">
        <div className="flex items-center justify-end gap-2">
          <AdminPrintButton />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d2c8b8] bg-white text-[#5f6b76] transition hover:bg-[#f8f4ec]"
            aria-label="Затвори"
          >
            ✕
          </button>
        </div>
        <h2 className="text-lg font-semibold text-[#1d2733]">Поръчка {order.orderNumber}</h2>
      </div>

      <div className="admin-print-area">

        {/* ── Invoice layout (print only) ─────────────────────── */}
        <div className="admin-print-invoice" style={{ fontFamily: "Arial, sans-serif", fontSize: "9pt", color: "#111827", lineHeight: 1.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "10px", borderBottom: "2px solid #111827", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "20pt", fontWeight: 800, letterSpacing: "0.05em", color: "#1d2733", lineHeight: 1 }}>ПОРЪЧКА</p>
              <p style={{ fontSize: "10pt", color: "#6a7480", marginTop: "4px" }}>{order.orderNumber}</p>
            </div>
            <div style={{ textAlign: "right", fontSize: "9pt", color: "#4f5b66", lineHeight: 1.7 }}>
              <p>{new Date(order.createdAt).toLocaleDateString("bg-BG")}</p>
              <p>{new Date(order.createdAt).toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}</p>
              <p style={{ marginTop: "4px", fontWeight: 700, color: "#1d2733" }}>{order.status}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "16px" }}>
            <div>
              <p style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a6f45", marginBottom: "5px" }}>Клиент</p>
              <p style={{ fontWeight: 600, color: "#1d2733", fontSize: "10pt" }}>{order.customerFullName}</p>
              <p style={{ color: "#4f5b66", marginTop: "2px" }}>{order.customerEmail}</p>
              <p style={{ color: "#4f5b66", marginTop: "2px" }}>{order.customerPhone}</p>
            </div>
            <div>
              <p style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a6f45", marginBottom: "5px" }}>Доставка</p>
              <p style={{ fontWeight: 600, color: "#1d2733" }}>{order.deliveryMethodLabel}</p>
              <p style={{ color: "#4f5b66", marginTop: "2px" }}>{order.deliveryDestination}</p>
              {order.deliveryNotes ? <p style={{ color: "#6a7480", marginTop: "2px", fontStyle: "italic" }}>{order.deliveryNotes}</p> : null}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
            <thead>
              <tr style={{ borderTop: "1.5px solid #1d2733", borderBottom: "1px solid #1d2733" }}>
                <th style={{ textAlign: "left", padding: "5px 0", fontWeight: 700, fontSize: "7pt", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a7480" }}>Продукт</th>
                <th style={{ textAlign: "center", padding: "5px 8px", fontWeight: 700, fontSize: "7pt", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a7480" }}>Опаковка</th>
                <th style={{ textAlign: "right", padding: "5px 8px", fontWeight: 700, fontSize: "7pt", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a7480" }}>Ед. цена</th>
                <th style={{ textAlign: "right", padding: "5px 8px", fontWeight: 700, fontSize: "7pt", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a7480" }}>Брой</th>
                <th style={{ textAlign: "right", padding: "5px 0", fontWeight: 700, fontSize: "7pt", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a7480" }}>Сума</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "5px 0", fontWeight: 600, color: "#1d2733" }}>{item.productName}</td>
                  <td style={{ padding: "5px 8px", color: "#4f5b66", textAlign: "center" }}>{item.packaging}</td>
                  <td style={{ padding: "5px 8px", color: "#4f5b66", textAlign: "right" }}>{item.unitPrice.toFixed(2)} €</td>
                  <td style={{ padding: "5px 8px", color: "#4f5b66", textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ padding: "5px 0", fontWeight: 600, color: "#1d2733", textAlign: "right" }}>{item.totalPrice.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
            <table style={{ fontSize: "9pt", borderCollapse: "collapse", minWidth: "230px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "2px 20px 2px 0", color: "#4f5b66" }}>Подсума</td>
                  <td style={{ textAlign: "right", color: "#1d2733" }}>{order.subtotal.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 20px 2px 0", color: "#4f5b66" }}>Доставка</td>
                  <td style={{ textAlign: "right", color: "#1d2733" }}>{order.shipping.toFixed(2)} €</td>
                </tr>
                <tr style={{ borderTop: "1.5px solid #1d2733" }}>
                  <td style={{ padding: "5px 20px 0 0", fontWeight: 700, fontSize: "10.5pt", color: "#1d2733" }}>Общо</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: "10.5pt", color: "#1d2733", paddingTop: "5px" }}>{order.total.toFixed(2)} €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* ── End invoice layout ──────────────────────────────── */}

        <div className="admin-print-cards grid gap-x-12 gap-y-0 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <section>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e7dfd1] pb-5">
              <div>
                <div className="admin-print-hidden">
                  <AdminOrderStatusControl orderId={order.id} status={order.status} saveMode="manual" />
                </div>
                <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6f45] print:block">
                  {order.status}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#1d2733]">{order.customerFullName}</h2>
                <p className="mt-2 text-sm text-[#5f6b76]">
                  Създадена: {new Date(order.createdAt).toLocaleString("bg-BG")}
                </p>
              </div>
              <div className="text-left xl:text-right">
                <p className="text-sm text-[#5f6b76]">Общо</p>
                <p className="mt-1 text-2xl font-semibold text-[#1d2733]">{order.total.toFixed(2)} €</p>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61]">Артикули</h3>
              <div className="hidden grid-cols-[1fr_110px_90px_120px] gap-4 border-b border-[#e7dfd1] pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61] md:grid">
                <span>Продукт</span>
                <span>Ед. цена</span>
                <span>Брой</span>
                <span className="text-right">Общо</span>
              </div>
              <div className="divide-y divide-[#e7dfd1]">
                {order.items.map((item) => (
                  <div key={item.id} className="grid gap-3 py-4 md:grid-cols-[1fr_110px_90px_120px] md:items-center">
                    <div>
                      <p className="text-sm font-semibold text-[#1d2733]">{item.productName}</p>
                      <p className="mt-1 text-sm text-[#5f6b76]">{item.packaging}</p>
                      {item.productUrl ? (
                        <a href={item.productUrl} className="mt-2 inline-flex text-sm font-medium text-[#6f5a33] underline-offset-4 hover:underline">
                          Отвори продукта
                        </a>
                      ) : null}
                    </div>
                    <p className="text-sm text-[#4f5b66]">{item.unitPrice.toFixed(2)} €</p>
                    <p className="text-sm text-[#4f5b66]">{item.quantity}</p>
                    <p className="text-left text-sm font-semibold text-[#1d2733] md:text-right">{item.totalPrice.toFixed(2)} €</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="divide-y divide-[#e7dfd1]">
            <section className="py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61]">Клиент</h3>
              <div className="space-y-2 text-sm text-[#4f5b66]">
                <p><span className="font-semibold text-[#1d2733]">Име:</span> {order.customerFullName}</p>
                <p><span className="font-semibold text-[#1d2733]">Имейл:</span> {order.customerEmail}</p>
                <p><span className="font-semibold text-[#1d2733]">Телефон:</span> {order.customerPhone}</p>
              </div>
            </section>

            <section className="py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61]">Доставка</h3>
              <div className="space-y-2 text-sm text-[#4f5b66]">
                <p><span className="font-semibold text-[#1d2733]">Метод:</span> {order.deliveryMethodLabel}</p>
                <p><span className="font-semibold text-[#1d2733]">Адрес:</span> {order.deliveryDestination}</p>
                {order.deliveryNotes ? (
                  <p><span className="font-semibold text-[#1d2733]">Бележки:</span> {order.deliveryNotes}</p>
                ) : null}
              </div>
            </section>

            <section className="py-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61]">Суми</h3>
              <div className="space-y-2 text-sm text-[#4f5b66]">
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
    </div>
  );
}

export function AdminOrdersManager({ orders }: { orders: AdminOrderRecord[] }) {
  const [modalOrder, setModalOrder] = useState<AdminOrderRecord | null>(null);

  if (!orders.length) {
    return (
      <p className="py-12 text-center text-sm text-[#5f6b76]">Няма записани поръчки.</p>
    );
  }

  return (
    <>
      <div>
        <div className="hidden grid-cols-[minmax(130px,1fr)_minmax(170px,1.2fr)_minmax(90px,0.65fr)_110px_190px_88px] gap-3 border-b border-[#e7dfd1] pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c6f61] lg:grid">
          <span>Поръчка</span>
          <span>Клиент</span>
          <span>Сума</span>
          <span>Дата</span>
          <span>Статус</span>
          <span className="text-right">Детайли</span>
        </div>

        <div className="divide-y divide-[#e7dfd1]">
            {orders.map((order) => (
              <div
                key={order.id}
                className="grid gap-4 py-4 lg:grid-cols-[minmax(130px,1fr)_minmax(170px,1.2fr)_minmax(90px,0.65fr)_110px_190px_88px] lg:items-center lg:gap-3"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45] lg:hidden">Поръчка</p>
                  <p className="text-sm font-semibold text-[#1d2733]">{order.orderNumber}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45] lg:hidden">Клиент</p>
                  <p className="text-sm font-semibold text-[#1d2733]">{order.customerFullName}</p>
                  <p className="mt-1 text-xs text-[#6a7480]">{order.customerEmail}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45] lg:hidden">Сума</p>
                  <p className="text-sm font-semibold text-[#1d2733]">{order.total.toFixed(2)} €</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45] lg:hidden">Дата</p>
                  <div className="text-sm text-[#4f5b66]">
                    <p>{new Date(order.createdAt).toLocaleDateString("bg-BG")}</p>
                    <p className="mt-0.5 text-xs text-[#6a7480]">
                      {new Date(order.createdAt).toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6f45] lg:hidden">Статус</p>
                  <div className="mt-1.5"><StatusBadge status={order.status} /></div>
                </div>

                <div className="flex justify-end order-first lg:order-none">
                  <button
                    type="button"
                    onClick={() => setModalOrder(order)}
                    title="Отвори"
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#d2c8b8] text-[#1d2733] transition hover:bg-[#f8f4ec]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {modalOrder !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-8">
            <OrderDetail order={modalOrder} onClose={() => setModalOrder(null)} />
          </div>
        </div>
      )}
    </>
  );
}
