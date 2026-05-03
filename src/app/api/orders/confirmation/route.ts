import { NextResponse } from "next/server";

import { createOrderEmail } from "@/lib/order-mail/email-template";
import { createMailer, getSender } from "@/lib/order-mail/mailer";
import { getProducts, getProductById } from "@/data/products";

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
    id?: string | number;
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

function resolveSiteUrl(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    const protocol =
      forwardedProto || (host.includes("localhost") || host.startsWith("192.168.") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

function normalizeProductId(value: string | number | undefined) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function toAbsoluteUrl(siteUrl: string, value?: string) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return value.startsWith("/") ? `${siteUrl}${value}` : `${siteUrl}/${value}`;
}

async function resolveProductImageUrl(
  siteUrl: string,
  item: { id?: string | number; imageUrl?: string },
  allProducts: Awaited<ReturnType<typeof getProducts>>,
) {
  const requestImageUrl = toAbsoluteUrl(siteUrl, item.imageUrl);

  if (requestImageUrl) {
    return requestImageUrl;
  }

  const productId = normalizeProductId(item.id);

  if (productId === null) {
    return undefined;
  }

  const product = getProductById(allProducts, productId);
  const primaryImage = product?.imageSrc[0];

  if (typeof primaryImage === "string") {
    return toAbsoluteUrl(siteUrl, primaryImage);
  }

  if (
    typeof primaryImage === "object" &&
    primaryImage !== null &&
    "src" in primaryImage &&
    typeof primaryImage.src === "string"
  ) {
    return toAbsoluteUrl(siteUrl, primaryImage.src);
  }

  return undefined;
}

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
    const siteUrl = resolveSiteUrl(request);
    const transporter = createMailer();
    const allProducts = await getProducts();
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
      items: await Promise.all(
        body.items!.map(async (item) => ({
          id: item.id != null ? String(item.id) : undefined,
          name: item.name!,
          packaging: item.packaging!,
          imageUrl: await resolveProductImageUrl(siteUrl, item, allProducts),
          productUrl: item.id != null ? `${siteUrl}/products/${item.id}` : undefined,
          quantity: item.quantity!,
          unitPrice: item.unitPrice!,
          totalPrice: item.totalPrice!,
        })),
      ),
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
