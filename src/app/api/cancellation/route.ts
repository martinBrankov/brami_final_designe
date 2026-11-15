import { NextResponse } from "next/server";

import { createMailer, getMailRecipient, getSender } from "@/lib/order-mail/mailer";
import { getRequestLocale, localizeApiError } from "@/lib/api-i18n";
import { getEmailTranslator } from "@/lib/order-mail/i18n";

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
    return NextResponse.json({ error: await localizeApiError("Invalid cancellation form payload.") }, { status: 400 });
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
    const t = await getEmailTranslator(await getRequestLocale());

    await transporter.sendMail({
      from: getSender(),
      to: getMailRecipient("sales@brami.shop"),
      subject: t("withdrawal.subject", { name: fields.customerName }),
      text: [
        t("withdrawal.title"),
        "",
        t("withdrawal.recipient"),
        t("withdrawal.address"),
        t("withdrawal.contact"),
        "",
        t("withdrawal.intro"),
        fields.products,
        "",
        t("withdrawal.orderInfo"),
        fields.orderInfo,
        "",
        t("withdrawal.name"),
        fields.customerName,
        "",
        t("withdrawal.customerAddress"),
        fields.customerAddress,
        "",
        t("phone"),
        fields.phone,
        "",
        t("email"),
        fields.email,
        "",
        t("date"),
        fields.date,
      ].join("\n"),
      html: `
        <div style="margin:0;padding:24px;background:#f7f2fb;font-family:Arial,sans-serif;color:#432855;">
          <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e6dcef;border-radius:24px;overflow:hidden;">
            <div style="padding:24px 28px;background:linear-gradient(100deg,#9f79ac 0%,#432855 100%);color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.86;">${escapeHtml(t("withdrawal.eyebrow"))}</p>
              <h1 style="margin:0;font-size:28px;line-height:1.2;">${escapeHtml(t("withdrawal.title"))}</h1>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 18px;font-size:14px;line-height:1.7;">${escapeHtml(t("withdrawal.recipient"))}<br>${escapeHtml(t("withdrawal.address"))}<br>${escapeHtml(t("withdrawal.contact"))}</p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">${escapeHtml(t("withdrawal.intro"))}</p>
              <div style="padding:14px 18px;border:1px solid #ece3f2;border-radius:16px;background:#fcfbfd;margin-bottom:18px;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(fields.products)}</div>
              <table style="width:100%;border-collapse:collapse;border:1px solid #ece3f2;border-radius:18px;overflow:hidden;">
                <tbody>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;width:40%;background:#faf7fc;">${escapeHtml(t("withdrawal.orderInfo"))}</td>
                    <td style="padding:12px 16px;font-size:14px;white-space:pre-wrap;">${escapeHtml(fields.orderInfo)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">${escapeHtml(t("withdrawal.name"))}</td>
                    <td style="padding:12px 16px;font-size:14px;">${escapeHtml(fields.customerName)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">${escapeHtml(t("withdrawal.customerAddress"))}</td>
                    <td style="padding:12px 16px;font-size:14px;white-space:pre-wrap;">${escapeHtml(fields.customerAddress)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">${escapeHtml(t("phone"))}</td>
                    <td style="padding:12px 16px;font-size:14px;">${escapeHtml(fields.phone)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #ece3f2;">
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">${escapeHtml(t("email"))}</td>
                    <td style="padding:12px 16px;font-size:14px;">${escapeHtml(fields.email)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;font-size:13px;font-weight:600;background:#faf7fc;">${escapeHtml(t("date"))}</td>
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
    return NextResponse.json({ error: await localizeApiError("Failed to send cancellation form email.") }, { status: 500 });
  }
}
