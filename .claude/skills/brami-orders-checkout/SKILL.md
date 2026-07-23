---
name: brami-orders-checkout
description: Brami количка, checkout и поръчки — CartProvider, Speedy доставка, промокодове, потвърждение по имейл, мърчант комисиони. Използвай при работа с поръчки, доставка, плащане, промо кодове или комисионни изчисления.
---

# Brami — Количка, Checkout и Поръчки

## Количка (CartProvider)

`src/components/cart-provider.tsx` — `"use client"`, Context + localStorage.

State: `items: CartItem[]`, `promoCode: PromoCodeResult | null`, `shippingMethod`.

Ключови функции:
- `addToCart(product, quantity?)` — добавя/увеличава
- `removeFromCart(productId)` — премахва
- `updateQuantity(productId, qty)` — промяна
- `applyPromoCode(code)` — валидира промокод чрез `api/auth/promo/validate`
- `clearCart()` — изчистване след поръчка

Цени и изчисления (всичко в EUR):
- `subtotal` — сума преди отстъпки
- `discountAmount` — от промокод или потребителска отстъпка
- `shippingCost` — 0 ако `subtotal >= FREE_SHIPPING_THRESHOLD_EUR (70 EUR)`, иначе по тарифа
- `total` — финална сума

> Цените се показват като `"€X/Yлв."`. Курс `BGN_TO_EUR = 1.95583` в `src/data/products.ts`.

## Checkout страница

`src/app/cart/page.tsx` (server) + `src/components/checkout-form.tsx` (client).

Стъпки:
1. Преглед на количката
2. Избор на доставка (Speedy офис/локер или до адрес)
3. Въвеждане на данни (имена, телефон, адрес/офис)
4. Прилагане на промокод
5. Потвърждение → `api/orders/confirmation`

## Speedy Интеграция

`src/lib/speedy.ts` — API wrapper за Speedy (`SPEEDY_USERNAME`, `SPEEDY_PASSWORD` в env).

API routes:
- `api/speedy/offices` — списък офиси/APT локери
- `api/speedy/shipment` — създаване на товарителница

`src/components/speedy-office-picker.tsx` — UI за избор на офис с търсене.

Доставка до офис/локер: Speedy API. Доставка до адрес: фиксирана тарифа от `products.ts`.

## Поръчки

### Създаване (`api/orders/confirmation`)
POST с тялото на поръчката → записва в `orders` + `order_items` таблици → изпраща имейл → `clearCart()`.

Логика:
1. Валидация на промокод ако е приложен
2. Изчисляване на мърчант комисиона (`src/lib/commission-status.ts`)
3. Запис в Supabase
4. `sendOrderConfirmationEmail()` — до клиент + копие до Brami

### Потребителски поръчки (`src/lib/user-orders.ts`)
- `getUserOrders(userId)` → `Order[]`
- `getOrderById(orderId, userId)` → `Order | null`
- `cancelOrder(orderId, userId)` — само ако статус позволява

### Админ управление (`api/admin/orders/[id]`)
- Промяна на статус: `pending → processing → shipped → delivered / cancelled`
- Само `requireAdminSession()`

## Имейли за Поръчки

`src/lib/order-mail/` — nodemailer.

- `sendOrderConfirmationEmail(order)` — до клиента с HTML template
- `sendOrderStatusUpdateEmail(order)` — при промяна на статус
- Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Промокодове

`src/lib/promo-codes.ts` + таблица `promo_codes` (виж skill `brami-db-schema`):
- **Всеки код е на мърчант** (`merchant_id` е задължителен) — няма generic кодове.
- Полета: `code`, `discount_percent` (за клиента), `commission_percent` (за мърчанта), `is_active`.
- Няма `type`/`max_uses`/`expires_at` — контролът е само `is_active`.
- `validatePromoCode(code)` → отстъпка + мърчант + комисиона.

API route `api/auth/promo/validate` (POST) — достъпен от CartProvider клиент-сайд.

## Мърчант Комисиони

`src/lib/commission-status.ts`:
- **Комисионите НЕ са отделна таблица** — записват се като колони върху `customer_orders`
  (`promo_merchant_id`, `promo_commission_percent`, `promo_commission_paid_at`).
- Изплащане = попълване на `promo_commission_paid_at` / `promo_commission_paid_by`
  (само пълен админ, `api/admin/commissions/mark`).

## Потребителски Отстъпки

`src/lib/user-discount.ts`:
- Натрупан оборот → ниво → % отстъпка
- Прилага се автоматично при checkout ако потребителят е логнат
- Не се кумулира с промокод (взема се по-добрата)

## Supabase Таблици (точни имена — виж `brami-db-schema`)

| Таблица | Описание |
|---------|----------|
| `customer_orders` | Поръчки (order_number, status BG, customer_*, subtotal/shipping/total, raw_payload, promo_*) |
| `customer_order_items` | Редове (product_id?, product_name, quantity, unit_price, total_price) |
| `promo_codes` | Мърчант кодове (code, merchant_id, discount_percent, commission_percent, is_active) |

> Комисионите живеят в `customer_orders.promo_*` колоните — няма `commissions` таблица.
