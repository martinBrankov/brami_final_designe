import { NextResponse } from "next/server";

import { createMailer, getSender } from "@/lib/order-mail/mailer";

export const runtime = "nodejs";

type CancellationRequestBody = {
  products?: string;
  orderInfo?: string;
  customerName?: string;
  customerAddress?: string;
  phone?: string;
  email?: string;
  date?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CancellationRequestBody | null;

  if (
    !body ||
    !isNonEmptyString(body.products) ||
    !isNonEmptyString(body.orderInfo) ||
    !isNonEmptyString(body.customerName) ||
    !isNonEmptyString(body.customerAddress) ||
    !isNonEmptyString(body.phone) ||
    !isNonEmptyString(body.email) ||
    !isNonEmptyString(body.date)
  ) {
    return NextResponse.json({ error: "Invalid cancellation form payload." }, { status: 400 });
  }

  const fields = {
    products: body.products.trim(),
    orderInfo: body.orderInfo.trim(),
    customerName: body.customerName.trim(),
    customerAddress: body.customerAddress.trim(),
    phone: body.phone.trim(),
    email: body.email.trim(),
    date: body.date.trim(),
  };

  try {
    const transporter = createMailer();

    await transporter.sendMail({
      from: getSender(),
      to: "sales@brami.shop",
      subject: `Brami формуляр за отказ – ${fields.customerName}`,
      text: [
        "ФОРМУЛЯР ЗА ОТКАЗ ОТ ДОГОВОР",
        "",
        "До: Брами Трейд ЕООД",
        "Адрес: България, гр. София 1588, Кривина, ул. Демокрация № 13",
        "Имейл: sales@brami.shop",
        "",
        "С настоящото уведомявам, че се отказвам от договора за покупка на следните стоки:",
        fields.products,
        "",
        "Поръчано на / Номер на поръчката / Получено на:",
        fields.orderInfo,
        "",
        "Име на потребителя:",
        fields.customerName,
        "",
        "Адрес на потребителя:",
        fields.customerAddress,
        "",
        "Телефон:",
        fields.phone,
        "",
        "Имейл:",
        fields.email,
        "",
        "Дата:",
        fields.date,
      ].join("\n"),
      html: `
        <div style="margin:0;padding:24px;background:#f7f2fb;font-family:Arial,sans-serif;color:#432855;">
          <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e6dcef;border-radius:24px;overflow:hidden;">
            <div style="padding:24px 28px;background:linear-gradient(100deg,#9f79ac 0%,#432855 100%);color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.86;">Формуляр за отказ</p>
              <h1 style="margin:0;font-size:28px;line-height:1.2;">Отказ от договор</h1>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 18px;font-size:14px;line-height:1.7;">До: Брами Трейд ЕООД<br>Адрес: България, гр. София 1588, Кривина, ул. Демокрация № 13<br>Имейл: sales@brami.shop</p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">С настоящото уведомявам, че се отказвам от договора за покупка на следните стоки:</p>
              <div style="padding:14px 18px;border:1px solid #ece3f2;border-radius:16px;background:#fcfbfd;margin-bottom:18px;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(fields.products)}</div>
              <table style="width:100%;border-collapse:collapse;border:1px solid #ece3f2;border-radius:18px;overflow:hidden;">
                <tbody>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;width:40%;background:#faf7fc;">Поръчано на / Номер / Получено на</td>
                    <td style="padding:12px 16px;font-size:14px;white-space:pre-wrap;">${escapeHtml(fields.orderInfo)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">Име</td>
                    <td style="padding:12px 16px;font-size:14px;">${escapeHtml(fields.customerName)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">Адрес</td>
                    <td style="padding:12px 16px;font-size:14px;white-space:pre-wrap;">${escapeHtml(fields.customerAddress)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">Телефон</td>
                    <td style="padding:12px 16px;font-size:14px;">${escapeHtml(fields.phone)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">Имейл</td>
                    <td style="padding:12px 16px;font-size:14px;">${escapeHtml(fields.email)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">Дата</td>
                    <td style="padding:12px 16px;font-size:14px;">${escapeHtml(fields.date)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("Failed to send cancellation form email", error);
    return NextResponse.json({ error: "Failed to send cancellation form email." }, { status: 500 });
  }
}
