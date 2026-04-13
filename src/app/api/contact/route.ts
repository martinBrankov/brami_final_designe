import { NextResponse } from "next/server";

import { createMailer, getSender } from "@/lib/order-mail/mailer";

export const runtime = "nodejs";

type ContactRequestBody = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ContactRequestBody | null;

  if (
    !body ||
    !isNonEmptyString(body.name) ||
    !isNonEmptyString(body.email) ||
    !isNonEmptyString(body.subject) ||
    !isNonEmptyString(body.message)
  ) {
    return NextResponse.json({ error: "Invalid contact form payload." }, { status: 400 });
  }

  const recipient = "info@brami.shop";
  const normalizedName = body.name.trim();
  const normalizedEmail = body.email.trim();
  const normalizedSubject = body.subject.trim();
  const normalizedMessage = body.message.trim();

  try {
    const transporter = createMailer();

    await transporter.sendMail({
      from: getSender(),
      to: recipient,
      replyTo: normalizedEmail,
      subject: `Brami contact form: ${normalizedSubject}`,
      text: [
        `Name: ${normalizedName}`,
        `Email: ${normalizedEmail}`,
        `Subject: ${normalizedSubject}`,
        "",
        normalizedMessage,
      ].join("\n"),
      html: `
        <div style="margin:0;padding:24px;background:#f7f2fb;font-family:Arial,sans-serif;color:#432855;">
          <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e6dcef;border-radius:24px;overflow:hidden;">
            <div style="padding:24px 28px;background:linear-gradient(100deg,#9f79ac 0%,#432855 100%);color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.86;">Contact Form</p>
              <h1 style="margin:0;font-size:28px;line-height:1.2;">${normalizedSubject}</h1>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 10px;font-size:14px;"><strong>Name:</strong> ${normalizedName}</p>
              <p style="margin:0 0 10px;font-size:14px;"><strong>Email:</strong> ${normalizedEmail}</p>
              <p style="margin:0 0 18px;font-size:14px;"><strong>Reply-To:</strong> ${normalizedEmail}</p>
              <div style="padding:16px 18px;border:1px solid #ece3f2;border-radius:18px;background:#fcfbfd;white-space:pre-wrap;font-size:15px;line-height:1.7;">${normalizedMessage}</div>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("Failed to send contact form email", error);
    return NextResponse.json({ error: "Failed to send contact form email." }, { status: 500 });
  }
}
