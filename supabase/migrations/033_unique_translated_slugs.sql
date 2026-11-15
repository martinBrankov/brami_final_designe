-- Database-level uniqueness for English URL slugs (translations->'en'->>'slug').
-- The admin also checks this before saving; the indexes guard imports and
-- direct edits. Run after 032_i18n_seo.sql. Idempotent.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS products_en_slug_key
  ON products ((translations->'en'->>'slug'))
  WHERE translations->'en'->>'slug' IS NOT NULL;

-- Keep sitemap lastmod and BlogPosting.dateModified accurate for every writer,
-- including content imports and edits in Supabase Studio.
CREATE OR REPLACE FUNCTION public.touch_blog_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (to_jsonb(NEW) - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'updated_at') THEN
    NEW.updated_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_blog_updated_at();

CREATE OR REPLACE FUNCTION public.touch_blog_after_block_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW IS NOT DISTINCT FROM OLD THEN
    RETURN NULL;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    UPDATE public.blog_posts SET updated_at = clock_timestamp() WHERE id = NEW.post_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE public.blog_posts SET updated_at = clock_timestamp() WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.post_id IS DISTINCT FROM NEW.post_id THEN
    UPDATE public.blog_posts SET updated_at = clock_timestamp() WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER blog_blocks_updated_at
  AFTER INSERT OR UPDATE OR DELETE ON public.blog_blocks
  FOR EACH ROW EXECUTE FUNCTION public.touch_blog_after_block_change();

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_en_slug_key
  ON blog_posts ((translations->'en'->>'slug'))
  WHERE translations->'en'->>'slug' IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS faq_entries_en_slug_key
  ON faq_entries ((translations->'en'->>'slug'))
  WHERE translations->'en'->>'slug' IS NOT NULL;

COMMIT;
