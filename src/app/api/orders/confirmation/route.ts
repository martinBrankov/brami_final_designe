import { NextResponse } from "next/server";

import { createOrderEmail } from "@/lib/order-mail/email-template";
import { createMailer, getSender } from "@/lib/order-mail/mailer";

export const runtime = "nodejs";

type OrderRequestBody = {
  orderId?: string;
  customer?: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  delivery?: {
    methodLabel?: string;
    destination?: string;
    notes?: string;
  };
  items?: Array<{
    id?: string;
    name?: string;
    packaging?: string;
    imageUrl?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
  }>;
  totals?: {
    subtotal?: number;
    shipping?: number;
    total?: number;
  };
  status?: string;
  createdAt?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidOrderPayload(body: OrderRequestBody) {
  return (
    isNonEmptyString(body.orderId) &&
    isNonEmptyString(body.customer?.email) &&
    isNonEmptyString(body.customer?.fullName) &&
    isNonEmptyString(body.customer?.phone) &&
    isNonEmptyString(body.delivery?.methodLabel) &&
    isNonEmptyString(body.delivery?.destination) &&
    Array.isArray(body.items) &&
    body.items.length > 0 &&
    body.items.every(
      (item) =>
        isNonEmptyString(item.name) &&
        isNonEmptyString(item.packaging) &&
        isValidNumber(item.quantity) &&
        isValidNumber(item.unitPrice) &&
        isValidNumber(item.totalPrice),
    ) &&
    isValidNumber(body.totals?.subtotal) &&
    isValidNumber(body.totals?.shipping) &&
    isValidNumber(body.totals?.total)
  );
}

export async function POST(request: Request) {
  const salesRecipient = process.env.SALES_ORDER_EMAIL || "sales@brami.shop";
  const body = (await request.json().catch(() => null)) as OrderRequestBody | null;

  if (!body || !isValidOrderPayload(body)) {
    return NextResponse.json({ error: "Invalid order payload." }, { status: 400 });
  }

  try {
    const transporter = createMailer();
    const normalizedStatus = body.status || "Потвърдена";
    const normalizedCreatedAt = body.createdAt || new Date().toLocaleString("bg-BG");
    const normalizedOrder = {
      orderId: body.orderId!,
      customer: {
        fullName: body.customer!.fullName!,
        email: body.customer!.email!,
        phone: body.customer!.phone!,
      },
      delivery: {
        methodLabel: body.delivery!.methodLabel!,
        destination: body.delivery!.destination!,
        notes: body.delivery?.notes,
      },
      items: body.items!.map((item) => ({
        name: item.name!,
        packaging: item.packaging!,
        imageUrl: item.imageUrl,
        quantity: item.quantity!,
        unitPrice: item.unitPrice!,
        totalPrice: item.totalPrice!,
      })),
      totals: {
        subtotal: body.totals!.subtotal!,
        shipping: body.totals!.shipping!,
        total: body.totals!.total!,
      },
    };

    const customerMessage = createOrderEmail({
      orderId: normalizedOrder.orderId,
      customer: normalizedOrder.customer,
      delivery: normalizedOrder.delivery,
      items: normalizedOrder.items,
      totals: normalizedOrder.totals,
      status: normalizedStatus,
      createdAt: normalizedCreatedAt,
      recipient: "customer",
    });

    const salesMessage = createOrderEmail({
      orderId: normalizedOrder.orderId,
      customer: normalizedOrder.customer,
      delivery: normalizedOrder.delivery,
      items: normalizedOrder.items,
      totals: normalizedOrder.totals,
      status: normalizedStatus,
      createdAt: normalizedCreatedAt,
      recipient: "sales",
    });

    await Promise.all([
      transporter.sendMail({
        from: getSender(),
        to: normalizedOrder.customer.email,
        subject: customerMessage.subject,
        html: customerMessage.html,
        text: customerMessage.text,
      }),
      transporter.sendMail({
        from: getSender(),
        to: salesRecipient,
        subject: salesMessage.subject,
        html: salesMessage.html,
        text: salesMessage.text,
      }),
    ]);

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("Failed to send order confirmation email", error);
    return NextResponse.json(
      { error: "Failed to send order confirmation email." },
      { status: 500 },
    );
  }
}
