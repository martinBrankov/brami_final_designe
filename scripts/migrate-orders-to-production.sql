-- =============================================================================
-- Orders migration for production
-- Generated: 2026-05-28T21:29:36.565Z
-- Orders: 2  |  Items: 4
-- Safe to run multiple times (fully idempotent).
-- Does NOT touch: products, blog_posts, blog_blocks, user_profiles or any other table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. customer_orders table
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customer_orders (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          TEXT          NOT NULL UNIQUE,
  status                TEXT          NOT NULL DEFAULT 'Потвърдена',
  customer_full_name    TEXT          NOT NULL,
  customer_email        TEXT          NOT NULL,
  customer_phone        TEXT          NOT NULL,
  delivery_method_label TEXT          NOT NULL,
  delivery_destination  TEXT          NOT NULL,
  delivery_notes        TEXT          NOT NULL DEFAULT '',
  subtotal              NUMERIC(10,2) NOT NULL,
  shipping              NUMERIC(10,2) NOT NULL,
  total                 NUMERIC(10,2) NOT NULL,
  order_created_at      TEXT          NOT NULL,
  raw_payload           JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. customer_order_items table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_order_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID          NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  product_id   INTEGER       REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT          NOT NULL,
  packaging    TEXT          NOT NULL,
  image_url    TEXT,
  product_url  TEXT,
  quantity     INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL,
  total_price  NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_orders_created_at_idx ON customer_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS customer_orders_status_idx ON customer_orders (status);
CREATE INDEX IF NOT EXISTS customer_order_items_order_id_idx ON customer_order_items (order_id);

-- ---------------------------------------------------------------------------
-- 3. Row-level security (admin service role bypasses RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE customer_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_order_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Data — customer_orders (2 rows)
-- ---------------------------------------------------------------------------
INSERT INTO customer_orders (id, order_number, status, customer_full_name, customer_email, customer_phone, delivery_method_label, delivery_destination, delivery_notes, subtotal, shipping, total, order_created_at, raw_payload, created_at, updated_at) VALUES ('4f6417c4-d7ee-4494-b2c6-d02e4b6b674c', 'BR-20260503-318911', 'Потвърдена', 'Мартин Бранков', 'martin.brankov@gmail.com', '+359 898 85 65 45', 'До офис на Спиди', 'КАЗИЧЕНЕ, с. КАЗИЧЕНЕ [1532] ул. ХАН КРУМ No 4, 1532', 'ТЕСТ', 9.82, 2.5, 12.32, '4.05.2026 г., 00:55:21 ч.', '{"items":[{"id":7,"name":"Душ гел с шафран","imageUrl":"http://localhost:3000/_next/static/media/01.5673aa65.jpg","quantity":1,"packaging":"250мл.","unitPrice":9.82,"totalPrice":9.82}],"status":"Потвърдена","totals":{"total":12.32,"shipping":2.5,"subtotal":9.82},"orderId":"BR-20260503-318911","customer":{"email":"martin.brankov@gmail.com","phone":"+359 898 85 65 45","fullName":"Мартин Бранков"},"delivery":{"notes":"ТЕСТ","destination":"КАЗИЧЕНЕ, с. КАЗИЧЕНЕ [1532] ул. ХАН КРУМ No 4, 1532","methodLabel":"До офис на Спиди"},"createdAt":"4.05.2026 г., 00:55:21 ч."}', '2026-05-03T21:55:16.827158+00:00', '2026-05-28T19:27:06.432+00:00') ON CONFLICT (id) DO UPDATE SET status='Потвърдена', order_number='BR-20260503-318911', customer_full_name='Мартин Бранков', customer_email='martin.brankov@gmail.com', customer_phone='+359 898 85 65 45', delivery_method_label='До офис на Спиди', delivery_destination='КАЗИЧЕНЕ, с. КАЗИЧЕНЕ [1532] ул. ХАН КРУМ No 4, 1532', delivery_notes='ТЕСТ', subtotal=9.82, shipping=2.5, total=12.32, order_created_at='4.05.2026 г., 00:55:21 ч.', raw_payload='{"items":[{"id":7,"name":"Душ гел с шафран","imageUrl":"http://localhost:3000/_next/static/media/01.5673aa65.jpg","quantity":1,"packaging":"250мл.","unitPrice":9.82,"totalPrice":9.82}],"status":"Потвърдена","totals":{"total":12.32,"shipping":2.5,"subtotal":9.82},"orderId":"BR-20260503-318911","customer":{"email":"martin.brankov@gmail.com","phone":"+359 898 85 65 45","fullName":"Мартин Бранков"},"delivery":{"notes":"ТЕСТ","destination":"КАЗИЧЕНЕ, с. КАЗИЧЕНЕ [1532] ул. ХАН КРУМ No 4, 1532","methodLabel":"До офис на Спиди"},"createdAt":"4.05.2026 г., 00:55:21 ч."}', updated_at='2026-05-28T19:27:06.432+00:00';
INSERT INTO customer_orders (id, order_number, status, customer_full_name, customer_email, customer_phone, delivery_method_label, delivery_destination, delivery_notes, subtotal, shipping, total, order_created_at, raw_payload, created_at, updated_at) VALUES ('f39ad7da-0e6f-4df7-a71d-8818492834a5', 'BR-20260504-230140', 'Доставена', 'Мартин Бранков', 'martin.brankov@gmail.com', '+359 898 85 65 45', 'До офис на Спиди', 'КАЗИЧЕНЕ, с. КАЗИЧЕНЕ [1532] ул. ХАН КРУМ No 4, 1532', '', 43.94, 2.5, 46.44, '4.05.2026 г., 21:35:30 ч.', '{"items":[{"id":5,"name":"Душ гел за коса и тяло","imageUrl":"http://localhost:3000/_next/static/media/01.2698675b.jpg","quantity":1,"packaging":"300мл.","unitPrice":12.5,"totalPrice":12.5},{"id":4,"name":"Душ гел","imageUrl":"http://localhost:3000/_next/static/media/01.35133a32.jpg","quantity":1,"packaging":"250мл.","unitPrice":11.5,"totalPrice":11.5},{"id":3,"name":"Балсам за коса с шафран","imageUrl":"http://localhost:3000/_next/static/media/01.4cadbfdc.jpg","quantity":1,"packaging":"250мл.","unitPrice":19.94,"totalPrice":19.94}],"status":"Потвърдена","totals":{"total":46.44,"shipping":2.5,"subtotal":43.94},"orderId":"BR-20260504-230140","customer":{"email":"martin.brankov@gmail.com","phone":"+359 898 85 65 45","fullName":"Мартин Бранков"},"delivery":{"notes":"","destination":"КАЗИЧЕНЕ, с. КАЗИЧЕНЕ [1532] ул. ХАН КРУМ No 4, 1532","methodLabel":"До офис на Спиди"},"createdAt":"4.05.2026 г., 21:35:30 ч."}', '2026-05-04T18:35:33.306086+00:00', '2026-05-28T20:17:12.09+00:00') ON CONFLICT (id) DO UPDATE SET status='Доставена', order_number='BR-20260504-230140', customer_full_name='Мартин Бранков', customer_email='martin.brankov@gmail.com', customer_phone='+359 898 85 65 45', delivery_method_label='До офис на Спиди', delivery_destination='КАЗИЧЕНЕ, с. КАЗИЧЕНЕ [1532] ул. ХАН КРУМ No 4, 1532', delivery_notes='', subtotal=43.94, shipping=2.5, total=46.44, order_created_at='4.05.2026 г., 21:35:30 ч.', raw_payload='{"items":[{"id":5,"name":"Душ гел за коса и тяло","imageUrl":"http://localhost:3000/_next/static/media/01.2698675b.jpg","quantity":1,"packaging":"300мл.","unitPrice":12.5,"totalPrice":12.5},{"id":4,"name":"Душ гел","imageUrl":"http://localhost:3000/_next/static/media/01.35133a32.jpg","quantity":1,"packaging":"250мл.","unitPrice":11.5,"totalPrice":11.5},{"id":3,"name":"Балсам за коса с шафран","imageUrl":"http://localhost:3000/_next/static/media/01.4cadbfdc.jpg","quantity":1,"packaging":"250мл.","unitPrice":19.94,"totalPrice":19.94}],"status":"Потвърдена","totals":{"total":46.44,"shipping":2.5,"subtotal":43.94},"orderId":"BR-20260504-230140","customer":{"email":"martin.brankov@gmail.com","phone":"+359 898 85 65 45","fullName":"Мартин Бранков"},"delivery":{"notes":"","destination":"КАЗИЧЕНЕ, с. КАЗИЧЕНЕ [1532] ул. ХАН КРУМ No 4, 1532","methodLabel":"До офис на Спиди"},"createdAt":"4.05.2026 г., 21:35:30 ч."}', updated_at='2026-05-28T20:17:12.09+00:00';

-- ---------------------------------------------------------------------------
-- 5. Data — customer_order_items (4 rows)
-- ---------------------------------------------------------------------------
INSERT INTO customer_order_items (id, order_id, product_id, product_name, packaging, image_url, product_url, quantity, unit_price, total_price, created_at) VALUES ('c32293b7-39d6-48aa-bc9a-d48b2a9922ec', '4f6417c4-d7ee-4494-b2c6-d02e4b6b674c', 7, 'Душ гел с шафран', '250мл.', 'http://localhost:3000/_next/static/media/01.5673aa65.jpg', 'http://localhost:3000/products/7', 1, 9.82, 9.82, '2026-05-03T21:55:17.027073+00:00') ON CONFLICT (id) DO UPDATE SET product_id=7, product_name='Душ гел с шафран', packaging='250мл.', image_url='http://localhost:3000/_next/static/media/01.5673aa65.jpg', product_url='http://localhost:3000/products/7', quantity=1, unit_price=9.82, total_price=9.82;
INSERT INTO customer_order_items (id, order_id, product_id, product_name, packaging, image_url, product_url, quantity, unit_price, total_price, created_at) VALUES ('9f049f69-5e62-49e8-a724-cf5d7c368fe9', 'f39ad7da-0e6f-4df7-a71d-8818492834a5', 5, 'Душ гел за коса и тяло', '300мл.', 'http://localhost:3000/_next/static/media/01.2698675b.jpg', 'http://localhost:3000/products/5', 1, 12.5, 12.5, '2026-05-04T18:35:33.541263+00:00') ON CONFLICT (id) DO UPDATE SET product_id=5, product_name='Душ гел за коса и тяло', packaging='300мл.', image_url='http://localhost:3000/_next/static/media/01.2698675b.jpg', product_url='http://localhost:3000/products/5', quantity=1, unit_price=12.5, total_price=12.5;
INSERT INTO customer_order_items (id, order_id, product_id, product_name, packaging, image_url, product_url, quantity, unit_price, total_price, created_at) VALUES ('818f9d23-5d13-4116-a1e8-2bdf2b704d8a', 'f39ad7da-0e6f-4df7-a71d-8818492834a5', 4, 'Душ гел', '250мл.', 'http://localhost:3000/_next/static/media/01.35133a32.jpg', 'http://localhost:3000/products/4', 1, 11.5, 11.5, '2026-05-04T18:35:33.541263+00:00') ON CONFLICT (id) DO UPDATE SET product_id=4, product_name='Душ гел', packaging='250мл.', image_url='http://localhost:3000/_next/static/media/01.35133a32.jpg', product_url='http://localhost:3000/products/4', quantity=1, unit_price=11.5, total_price=11.5;
INSERT INTO customer_order_items (id, order_id, product_id, product_name, packaging, image_url, product_url, quantity, unit_price, total_price, created_at) VALUES ('d10b0f66-2ad7-467a-b7c6-9cae65888061', 'f39ad7da-0e6f-4df7-a71d-8818492834a5', 3, 'Балсам за коса с шафран', '250мл.', 'http://localhost:3000/_next/static/media/01.4cadbfdc.jpg', 'http://localhost:3000/products/3', 1, 19.94, 19.94, '2026-05-04T18:35:33.541263+00:00') ON CONFLICT (id) DO UPDATE SET product_id=3, product_name='Балсам за коса с шафран', packaging='250мл.', image_url='http://localhost:3000/_next/static/media/01.4cadbfdc.jpg', product_url='http://localhost:3000/products/3', quantity=1, unit_price=19.94, total_price=19.94;

-- Done.