import type { EmailTranslator } from "@/lib/order-mail/i18n";

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number) {
  const eur = Number(value);

  return `\u20AC${eur.toFixed(2)}`;
}

// Stored order statuses (Bulgarian) → message keys in email.json.
const STATUS_KEYS: Record<string, string> = {
  "Потвърдена": "confirmed",
  "В обработка": "processing",
  "Изпратена": "shipped",
  "Доставена": "delivered",
  "Отказана": "cancelled",
};

function statusLabel(t: EmailTranslator, status: string) {
  const key = STATUS_KEYS[status];
  return key ? t(`statusLabels.${key}`) : status;
}

type OrderStatusEmailPayload = {
  orderNumber: string;
  customerFullName: string;
  status: string;
  /** Translator for the customer's language ("Email" namespace). */
  t: EmailTranslator;
};

export function createOrderStatusUpdateEmail({
  orderNumber,
  customerFullName,
  status: rawStatus,
  t,
}: OrderStatusEmailPayload) {
  const status = statusLabel(t, rawStatus);
  const subject = t("statusSubject", { order: orderNumber, status });
  const statusKey = STATUS_KEYS[rawStatus];
  const message = statusKey ? t(`statusMessages.${statusKey}`) : t("statusChanged", { status });

  const html = `
    <div style="margin:0;padding:24px;background:#f7f2fb;font-family:Arial,sans-serif;color:#432855;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6dcef;border-radius:24px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(100deg,#9f79ac 0%,#432855 100%);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.86;">${escapeHtml(t("statusEyebrow"))}</p>
          <h1 style="margin:0;font-size:26px;line-height:1.2;">${escapeHtml(t("order", { order: orderNumber }))}</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;">${escapeHtml(t("newStatus"))} <strong>${escapeHtml(status)}</strong></p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;">${escapeHtml(t("greeting", { name: customerFullName }))}</p>
          <p style="margin:0;font-size:15px;line-height:1.7;">${escapeHtml(message)}</p>
        </div>
      </div>
    </div>
  `;

  const text = [
    t("order", { order: orderNumber }),
    `${t("newStatus")} ${status}`,
    "",
    t("greeting", { name: customerFullName }),
    message,
  ].join("\n");

  return { subject, html, text };
}

type OrderItem = {
  id?: string;
  name: string;
  packaging: string;
  imageUrl?: string;
  productUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type OrderEmailPayload = {
  orderId: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  delivery: {
    methodLabel: string;
    destination: string;
    notes?: string;
  };
  items: OrderItem[];
  totals: {
    subtotal: number;
    shipping: number;
    total: number;
  };
  status: string;
  createdAt: string;
  recipient?: "customer" | "sales";
  /** Translator for the recipient's language ("Email" namespace). */
  t: EmailTranslator;
};

export function createOrderEmail({
  orderId,
  customer,
  delivery,
  items,
  totals,
  status: rawStatus,
  createdAt,
  recipient = "customer",
  t,
}: OrderEmailPayload) {
  const status = statusLabel(t, rawStatus);
  const rowsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee4f4;width:72px;">
            ${
              item.imageUrl
                ? item.productUrl
                  ? `<a href="${escapeHtml(item.productUrl)}" style="display:block;width:52px;"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:10px;object-fit:cover;border:1px solid #ece3f2;" /></a>`
                  : `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:10px;object-fit:cover;border:1px solid #ece3f2;" />`
                : ""
            }
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee4f4;">${
            item.productUrl
              ? `<a href="${escapeHtml(item.productUrl)}" style="color:#432855;text-decoration:underline;">${escapeHtml(item.name)}</a>`
              : escapeHtml(item.name)
          }</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee4f4;">${escapeHtml(item.packaging)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee4f4;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee4f4;text-align:right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee4f4;text-align:right;">${formatCurrency(item.totalPrice)}</td>
        </tr>
      `,
    )
    .join("");

  const isSalesRecipient = recipient === "sales";
  const subject = isSalesRecipient
    ? t("salesSubject", { order: orderId, status })
    : t("customerSubject", { order: orderId, status });
  const eyebrow = escapeHtml(isSalesRecipient ? t("salesEyebrow") : t("customerEyebrow"));
  const heading = escapeHtml(
    isSalesRecipient ? t("newOrder", { order: orderId }) : t("order", { order: orderId }),
  );
  const introText = escapeHtml(
    isSalesRecipient ? t("salesIntro") : t("customerIntro", { name: customer.fullName }),
  );

  const html = `
    <div style="margin:0;padding:24px;background:#f7f2fb;font-family:Arial,sans-serif;color:#432855;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e6dcef;border-radius:24px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(100deg,#9f79ac 0%,#432855 100%);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.86;">${eyebrow}</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${heading}</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;">${escapeHtml(t("status"))} ${escapeHtml(status)}</p>
        </div>

        <div style="padding:28px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">${introText}</p>

          <div style="display:grid;gap:16px;margin-bottom:22px;">
            <div style="padding:16px 18px;border:1px solid #ece3f2;border-radius:18px;background:#fcfbfd;">
              <h2 style="margin:0 0 10px;font-size:16px;">${escapeHtml(t("orderDetails"))}</h2>
              <p style="margin:4px 0;font-size:14px;">${escapeHtml(t("number"))} <strong>${escapeHtml(orderId)}</strong></p>
              <p style="margin:4px 0;font-size:14px;">${escapeHtml(t("date"))} ${escapeHtml(createdAt)}</p>
              <p style="margin:4px 0;font-size:14px;">${escapeHtml(t("customer"))} ${escapeHtml(customer.fullName)}</p>
              <p style="margin:4px 0;font-size:14px;">${escapeHtml(t("email"))} ${escapeHtml(customer.email)}</p>
              <p style="margin:4px 0;font-size:14px;">${escapeHtml(t("phone"))} ${escapeHtml(customer.phone)}</p>
            </div>

            <div style="padding:16px 18px;border:1px solid #ece3f2;border-radius:18px;background:#fcfbfd;">
              <h2 style="margin:0 0 10px;font-size:16px;">${escapeHtml(t("delivery"))}</h2>
              <p style="margin:4px 0;font-size:14px;">${escapeHtml(t("method"))} ${escapeHtml(delivery.methodLabel)}</p>
              <p style="margin:4px 0;font-size:14px;">${escapeHtml(t("destination"))} ${escapeHtml(delivery.destination)}</p>
              ${delivery.notes ? `<p style="margin:4px 0;font-size:14px;">${escapeHtml(t("notes"))} ${escapeHtml(delivery.notes)}</p>` : ""}
            </div>
          </div>

          <h2 style="margin:0 0 12px;font-size:18px;">${escapeHtml(t("products"))}</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #ece3f2;border-radius:18px;overflow:hidden;">
            <thead style="background:#faf7fc;">
              <tr>
                <th style="padding:12px;text-align:left;font-size:13px;">${escapeHtml(t("colImage"))}</th>
                <th style="padding:12px;text-align:left;font-size:13px;">${escapeHtml(t("colProduct"))}</th>
                <th style="padding:12px;text-align:left;font-size:13px;">${escapeHtml(t("colPackaging"))}</th>
                <th style="padding:12px;text-align:center;font-size:13px;">${escapeHtml(t("colQuantity"))}</th>
                <th style="padding:12px;text-align:right;font-size:13px;">${escapeHtml(t("colUnitPrice"))}</th>
                <th style="padding:12px;text-align:right;font-size:13px;">${escapeHtml(t("colTotal"))}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div style="margin-top:18px;margin-left:auto;max-width:320px;padding:16px 18px;border:1px solid #ece3f2;border-radius:18px;background:#fcfbfd;">
            <p style="margin:4px 0;font-size:14px;display:flex;justify-content:space-between;"><span>${escapeHtml(t("products"))}</span><strong>${formatCurrency(totals.subtotal)}</strong></p>
            <p style="margin:4px 0;font-size:14px;display:flex;justify-content:space-between;"><span>${escapeHtml(t("delivery"))}</span><strong>${formatCurrency(totals.shipping)}</strong></p>
            <p style="margin:10px 0 0;padding-top:10px;border-top:1px solid #ece3f2;font-size:16px;display:flex;justify-content:space-between;"><span>${escapeHtml(t("total"))}</span><strong>${formatCurrency(totals.total)}</strong></p>
          </div>
        </div>
      </div>
    </div>
  `;

  const textLines = [
    isSalesRecipient ? t("newOrder", { order: orderId }) : t("order", { order: orderId }),
    `${t("status")} ${status}`,
    "",
    `${t("customer")} ${customer.fullName}`,
    `${t("email")} ${customer.email}`,
    `${t("phone")} ${customer.phone}`,
    `${t("date")} ${createdAt}`,
    "",
    `${t("delivery")}: ${delivery.methodLabel}`,
    `${t("destination")} ${delivery.destination}`,
    delivery.notes ? `${t("notes")} ${delivery.notes}` : "",
    "",
    `${t("products")}:`,
    ...items.map(
      (item) =>
        `- ${item.name} (${item.packaging}) x${item.quantity} - ${formatCurrency(item.totalPrice)}${
          item.productUrl ? ` - ${item.productUrl}` : ""
        }`,
    ),
    "",
    `${t("products")}: ${formatCurrency(totals.subtotal)}`,
    `${t("delivery")}: ${formatCurrency(totals.shipping)}`,
    `${t("total")}: ${formatCurrency(totals.total)}`,
  ].filter(Boolean);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
