-- Allow 'image' block type alongside 'text' in blog_blocks

-- Drop existing check constraint(s) on the type column (name may vary)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'blog_blocks'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%type%'
  )
  LOOP
    EXECUTE format('ALTER TABLE blog_blocks DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE blog_blocks
  ADD CONSTRAINT blog_blocks_type_check CHECK (type IN ('text', 'image'));

-- Create the blog-images storage bucket (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read from the bucket
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'blog-images public read',
  'blog-images',
  'SELECT',
  'true'
)
ON CONFLICT DO NOTHING;
