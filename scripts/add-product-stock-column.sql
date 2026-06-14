-- Adds a stock/quantity column to products.
-- Run once in the Supabase SQL editor (or via psql) against your database.

-- 1) Add the column (idempotent). New products default to 0.
alter table public.products
  add column if not exists stock_quantity integer not null default 0;

-- 2) Backfill existing products so the storefront keeps working until the
--    real stock levels are entered from the admin panel. Adjust 100 as needed,
--    or remove this statement if you prefer existing products to start at 0.
update public.products
  set stock_quantity = 100
  where stock_quantity = 0;

-- 3) Keep stock from ever going negative.
alter table public.products
  drop constraint if exists products_stock_quantity_nonnegative;
alter table public.products
  add constraint products_stock_quantity_nonnegative
  check (stock_quantity >= 0);
