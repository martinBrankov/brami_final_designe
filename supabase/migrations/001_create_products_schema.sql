-- Products schema migration
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  slug TEXT   NOT NULL UNIQUE
);

CREATE TABLE audiences (
  id   SERIAL PRIMARY KEY,
  slug TEXT   NOT NULL UNIQUE
);

CREATE TABLE products (
  id               INTEGER      PRIMARY KEY,
  name             TEXT         NOT NULL,
  brand            TEXT         NOT NULL DEFAULT 'other',
  badge            TEXT         NOT NULL DEFAULT 'none',
  discount_percent INTEGER,
  price_eur        NUMERIC(10,2) NOT NULL,
  price_bgn        NUMERIC(10,2) NOT NULL,
  packaging        TEXT         NOT NULL,
  weight           NUMERIC(10,4) NOT NULL DEFAULT 0.2,
  rating           NUMERIC(3,1) NOT NULL DEFAULT 5,
  description      TEXT         NOT NULL DEFAULT ''
);

CREATE TABLE product_categories (
  product_id  INTEGER NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE product_audiences (
  product_id  INTEGER NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  audience_id INTEGER NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, audience_id)
);

CREATE TABLE product_images (
  id         SERIAL  PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_src  TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, sort_order)
);

CREATE TABLE product_highlights (
  id         SERIAL  PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  text       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, sort_order)
);

CREATE TABLE product_comments (
  id           SERIAL       PRIMARY KEY,
  product_id   INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name  TEXT         NOT NULL,
  comment      TEXT         NOT NULL,
  rating       NUMERIC(3,1),
  comment_date TEXT         NOT NULL,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  UNIQUE (product_id, sort_order)
);

CREATE TABLE related_products (
  product_id         INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_product_id)
);

-- Enable Row Level Security (read-only for public)
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_audiences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE related_products   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON products          FOR SELECT USING (true);
CREATE POLICY "public_read" ON categories        FOR SELECT USING (true);
CREATE POLICY "public_read" ON audiences         FOR SELECT USING (true);
CREATE POLICY "public_read" ON product_categories FOR SELECT USING (true);
CREATE POLICY "public_read" ON product_audiences  FOR SELECT USING (true);
CREATE POLICY "public_read" ON product_images     FOR SELECT USING (true);
CREATE POLICY "public_read" ON product_highlights FOR SELECT USING (true);
CREATE POLICY "public_read" ON product_comments   FOR SELECT USING (true);
CREATE POLICY "public_read" ON related_products   FOR SELECT USING (true);

-- To reset and re-seed, run:
-- TRUNCATE related_products, product_comments, product_highlights,
--          product_images, product_audiences, product_categories,
--          products, audiences, categories CASCADE;
