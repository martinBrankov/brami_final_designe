import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { updateAdminOrderStatus } from "@/lib/admin-data";
import { createOrderStatusUpdateEmail } from "@/lib/order-mail/email-template";
import { createMailer, getSender } from "@/lib/order-mail/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  await requireAdminSession();

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
    const status = typeof body?.status === "string" ? body.status.trim() : "";

    if (!status) {
      return NextResponse.json({ error: "Missing order status." }, { status: 400 });
    }

    const order = await updateAdminOrderStatus(id, status);

    // Notify the customer about the status change. Email failures must not
    // block the status update itself.
    if (order.customerEmail) {
      try {
        const message = createOrderStatusUpdateEmail({
          orderNumber: order.orderNumber,
          customerFullName: order.customerFullName,
          status,
        });
        const transporter = createMailer();
        await transporter.sendMail({
          from: getSender(),
          to: order.customerEmail,
          subject: message.subject,
          html: message.html,
          text: message.text,
        });
      } catch (mailError) {
        console.error("Failed to send order status email", mailError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order status." },
      { status: 400 },
    );
  }
}
