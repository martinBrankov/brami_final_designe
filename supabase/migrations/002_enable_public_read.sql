-- Enable public read access for all product tables.
-- Run this in Supabase Dashboard → SQL Editor if tables were created without RLS policies.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'products', 'categories', 'audiences',
    'product_categories', 'product_audiences',
    'product_images', 'product_highlights',
    'product_comments', 'related_products'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Drop policy if it already exists to avoid conflicts
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS public_read ON %I', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    EXECUTE format('CREATE POLICY public_read ON %I FOR SELECT USING (true)', t);
  END LOOP;
END $$;
