-- User-submitted product reviews (one rating + comment per user per product).
-- Run once in the Supabase SQL editor (or via psql) against your database.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id integer not null references public.products(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A user can review a given product only once.
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_id_idx
  on public.product_reviews (product_id);

-- Reviews are public to read (mirrors the other product_* tables). Writes go
-- through the service-role key from the API, which bypasses RLS.
grant select on public.product_reviews to anon, authenticated;
