# Backend Mail Service

## Start

1. Copy `.env.example` to `.env`
2. Fill in the SMTP settings
3. Optional: set `SALES_ORDER_EMAIL` if you want a different internal recipient than `sales@brami.shop`
4. Run `npm install`
5. Run `npm run dev`

The service listens on `http://localhost:4001` by default.

## Endpoint

`POST /api/orders/confirmation`

Accepts an order payload from the frontend checkout and sends a confirmation email to the customer and an internal order email to the sales inbox.
