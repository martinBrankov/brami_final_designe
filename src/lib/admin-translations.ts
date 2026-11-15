import "server-only";

import { slugifyQuestion } from "@/lib/faq-slug";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Helpers for saving English versions from the admin into `translations`
// JSONB columns ({ en: { ... } }). Empty fields are removed, so the site
// falls back to Bulgarian for them.

type Translations = Record<string, Record<string, unknown>>;

export function asTranslations(value: unknown): Translations {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Translations) : {};
}

/** Replaces translations.en with `fields`, dropping empty values. */
export function withEnglish(existing: unknown, fields: Record<string, string | undefined>): Translations {
  const current = asTranslations(existing);
  // undefined = field not sent (keep it); "" = cleared (remove it).
  const sent = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
  const english = Object.fromEntries(
    Object.entries({ ...(current.en ?? {}), ...sent }).filter(
      ([, value]) => typeof value !== "string" || value.trim() !== "",
    ),
  );
  const next = { ...current };
  if (Object.keys(english).length) next.en = english;
  else delete next.en;
  return next;
}

export function toEnglishSlug(value: string): string {
  return slugifyQuestion(value);
}

/** Throws when another row of `table` already uses `slug` as its English slug. */
export async function assertUniqueEnglishSlug(
  table: "blog_posts" | "faq_entries" | "products",
  slug: string,
  excludeId: string | number,
) {
  if (!slug) return;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("translations->en->>slug", slug)
    .neq("id", excludeId)
    .limit(1);
  if (error) throw new Error(error.message);
  if (data?.length) throw new Error(`The English URL slug "${slug}" is already used.`);
}
