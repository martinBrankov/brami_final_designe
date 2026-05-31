-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  slug          text NOT NULL UNIQUE,
  eyebrow       text,
  excerpt       text,
  cover_image   text,
  read_time     text,
  published_at  date,
  is_featured   boolean NOT NULL DEFAULT false,
  published     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Create blog_blocks table
CREATE TABLE IF NOT EXISTS blog_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image')),
  content    text,
  position   integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS blog_blocks_post_id_idx ON blog_blocks(post_id);

-- Allow anonymous read for published posts (public blog)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read published posts"
  ON blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY "public read blocks of published posts"
  ON blog_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts p
      WHERE p.id = blog_blocks.post_id
        AND p.published = true
    )
  );

-- blog-images storage bucket (public, for cover + block images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
ON CONFLICT (id) DO NOTHING;
