import "dotenv/config";
import express from "express";

import { createMailer, getSender } from "./mailer.js";
import { createOrderEmail } from "./email-template.js";

const app = express();
const port = Number(process.env.PORT || 4001);
const salesRecipient = process.env.SALES_ORDER_EMAIL || "sales@brami.shop";
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(express.json({ limit: "1mb" }));
app.use((request, response, next) => {
  const requestOrigin = request.headers.origin;

  if (
    requestOrigin &&
    (allowedOrigins.has(requestOrigin) || /^https?:\/\/192\.168\.\d+\.\d+:3000$/.test(requestOrigin))
  ) {
    response.header("Access-Control-Allow-Origin", requestOrigin);
  } else {
    response.header("Access-Control-Allow-Origin", Array.from(allowedOrigins)[0] || "http://localhost:3000");
  }

  response.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.header("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/orders/confirmation", async (request, response) => {
  const { orderId, customer, delivery, items, totals, status, createdAt } = request.body ?? {};

  if (
    !orderId ||
    !customer?.email ||
    !customer?.fullName ||
    !customer?.phone ||
    !delivery?.methodLabel ||
    !delivery?.destination ||
    !Array.isArray(items) ||
    !items.length ||
    !totals
  ) {
    response.status(400).json({ error: "Invalid order payload." });
    return;
  }

  try {
    const transporter = createMailer();
    const normalizedStatus = status || "Потвърдена";
    const normalizedCreatedAt = createdAt || new Date().toLocaleString("bg-BG");

    const customerMessage = createOrderEmail({
      orderId,
      customer,
      delivery,
      items,
      totals,
      status: normalizedStatus,
      createdAt: normalizedCreatedAt,
      recipient: "customer",
    });

    const salesMessage = createOrderEmail({
      orderId,
      customer,
      delivery,
      items,
      totals,
      status: normalizedStatus,
      createdAt: normalizedCreatedAt,
      recipient: "sales",
    });

    await Promise.all([
      transporter.sendMail({
        from: getSender(),
        to: customer.email,
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

    response.status(202).json({ ok: true });
  } catch (error) {
    console.error("Failed to send order confirmation email", error);
    response.status(500).json({ error: "Failed to send order confirmation email." });
  }
});

app.listen(port, () => {
  console.log(`Order mail backend listening on http://localhost:${port}`);
});
