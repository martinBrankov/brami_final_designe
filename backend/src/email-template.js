function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value) {
  return `${Number(value).toFixed(2)} лв.`;
}

export function createOrderEmail({
  orderId,
  customer,
  delivery,
  items,
  totals,
  status,
  createdAt,
  recipient = "customer",
}) {
  const rowsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee4f4;">${escapeHtml(item.name)}</td>
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
    ? `Brami нова поръчка ${orderId} - ${status}`
    : `Brami поръчка ${orderId} - ${status}`;
  const eyebrow = isSalesRecipient ? "Нова поръчка" : "Потвърждение на поръчка";
  const heading = isSalesRecipient ? `Нова поръчка ${escapeHtml(orderId)}` : `Поръчка ${escapeHtml(orderId)}`;
  const introText = isSalesRecipient
    ? "Получена е нова поръчка от онлайн магазина. По-долу са всички детайли за обработка."
    : `Здравейте, ${escapeHtml(customer.fullName)}. Получихме поръчката ви и подготвяме обработката ѝ.`;

  const html = `
    <div style="margin:0;padding:24px;background:#f7f2fb;font-family:Arial,sans-serif;color:#432855;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e6dcef;border-radius:24px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(100deg,#9f79ac 0%,#432855 100%);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.86;">${eyebrow}</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${heading}</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;">Статус: ${escapeHtml(status)}</p>
        </div>

        <div style="padding:28px;">
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">${introText}</p>

          <div style="display:grid;gap:16px;margin-bottom:22px;">
            <div style="padding:16px 18px;border:1px solid #ece3f2;border-radius:18px;background:#fcfbfd;">
              <h2 style="margin:0 0 10px;font-size:16px;">Данни за поръчката</h2>
              <p style="margin:4px 0;font-size:14px;">Номер: <strong>${escapeHtml(orderId)}</strong></p>
              <p style="margin:4px 0;font-size:14px;">Дата: ${escapeHtml(createdAt)}</p>
              <p style="margin:4px 0;font-size:14px;">Клиент: ${escapeHtml(customer.fullName)}</p>
              <p style="margin:4px 0;font-size:14px;">Имейл: ${escapeHtml(customer.email)}</p>
              <p style="margin:4px 0;font-size:14px;">Телефон: ${escapeHtml(customer.phone)}</p>
            </div>

            <div style="padding:16px 18px;border:1px solid #ece3f2;border-radius:18px;background:#fcfbfd;">
              <h2 style="margin:0 0 10px;font-size:16px;">Доставка</h2>
              <p style="margin:4px 0;font-size:14px;">Метод: ${escapeHtml(delivery.methodLabel)}</p>
              <p style="margin:4px 0;font-size:14px;">Адрес/офис: ${escapeHtml(delivery.destination)}</p>
              ${delivery.notes ? `<p style="margin:4px 0;font-size:14px;">Бележки: ${escapeHtml(delivery.notes)}</p>` : ""}
            </div>
          </div>

          <h2 style="margin:0 0 12px;font-size:18px;">Продукти</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #ece3f2;border-radius:18px;overflow:hidden;">
            <thead style="background:#faf7fc;">
              <tr>
                <th style="padding:12px;text-align:left;font-size:13px;">Продукт</th>
                <th style="padding:12px;text-align:left;font-size:13px;">Разфасовка</th>
                <th style="padding:12px;text-align:center;font-size:13px;">Брой</th>
                <th style="padding:12px;text-align:right;font-size:13px;">Ед. цена</th>
                <th style="padding:12px;text-align:right;font-size:13px;">Общо</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div style="margin-top:18px;margin-left:auto;max-width:320px;padding:16px 18px;border:1px solid #ece3f2;border-radius:18px;background:#fcfbfd;">
            <p style="margin:4px 0;font-size:14px;display:flex;justify-content:space-between;"><span>Продукти</span><strong>${formatCurrency(totals.subtotal)}</strong></p>
            <p style="margin:4px 0;font-size:14px;display:flex;justify-content:space-between;"><span>Доставка</span><strong>${formatCurrency(totals.shipping)}</strong></p>
            <p style="margin:10px 0 0;padding-top:10px;border-top:1px solid #ece3f2;font-size:16px;display:flex;justify-content:space-between;"><span>Общо</span><strong>${formatCurrency(totals.total)}</strong></p>
          </div>
        </div>
      </div>
    </div>
  `;

  const textLines = [
    isSalesRecipient ? `Нова поръчка ${orderId}` : `Поръчка ${orderId}`,
    `Статус: ${status}`,
    "",
    `Клиент: ${customer.fullName}`,
    `Имейл: ${customer.email}`,
    `Телефон: ${customer.phone}`,
    `Дата: ${createdAt}`,
    "",
    `Доставка: ${delivery.methodLabel}`,
    `Адрес/офис: ${delivery.destination}`,
    delivery.notes ? `Бележки: ${delivery.notes}` : "",
    "",
    "Продукти:",
    ...items.map(
      (item) => `- ${item.name} (${item.packaging}) x${item.quantity} - ${formatCurrency(item.totalPrice)}`,
    ),
    "",
    `Продукти: ${formatCurrency(totals.subtotal)}`,
    `Доставка: ${formatCurrency(totals.shipping)}`,
    `Общо: ${formatCurrency(totals.total)}`,
  ].filter(Boolean);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
