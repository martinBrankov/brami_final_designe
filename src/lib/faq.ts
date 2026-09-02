import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getClientIp, hashRequestIdentity } from "@/lib/marketing-subscribers";
import { slugifyQuestion } from "@/lib/faq-slug";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FaqStatus = "pending" | "draft" | "published";
export type FaqSource = "admin" | "user";

export type FaqEntry = {
  id: string;
  question: string;
  answer: string | null;
  slug: string | null;
  category: string | null;
  status: FaqStatus;
  source: FaqSource;
  askerName: string | null;
  askerEmail: string | null;
  position: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type FaqEntryRow = {
  id: string;
  question: string;
  answer: string | null;
  slug: string | null;
  category: string | null;
  status: FaqStatus;
  source: FaqSource;
  asker_name: string | null;
  asker_email: string | null;
  position: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export const FAQ_COLUMNS =
  "id, question, answer, slug, category, status, source, asker_name, asker_email, position, published_at, created_at, updated_at";

export const MIN_QUESTION_LENGTH = 10;
export const MAX_QUESTION_LENGTH = 1000;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_QUESTIONS_PER_IP_PER_HOUR = 5;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function mapFaqEntry(row: FaqEntryRow): FaqEntry {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer ?? null,
    slug: row.slug ?? null,
    category: row.category ?? null,
    status: row.status,
    source: row.source,
    askerName: row.asker_name ?? null,
    askerEmail: row.asker_email ?? null,
    position: Number(row.position ?? 0),
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Public queries ────────────────────────────────────────────────────────────

export async function getPublishedFaqEntries(): Promise<FaqEntry[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("faq_entries")
    .select(FAQ_COLUMNS)
    .eq("status", "published")
    .order("position", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch FAQ entries: ${error.message}`);
  }

  return ((data ?? []) as FaqEntryRow[]).map(mapFaqEntry);
}

export async function getFaqEntryBySlug(slug: string): Promise<FaqEntry | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("faq_entries")
    .select(FAQ_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch FAQ entry "${slug}": ${error.message}`);
  }

  return data ? mapFaqEntry(data as FaqEntryRow) : null;
}

export async function getFaqSlugs(): Promise<string[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("faq_entries")
    .select("slug")
    .eq("status", "published")
    .not("slug", "is", null);

  if (error) return [];
  return ((data ?? []) as { slug: string | null }[])
    .map((row) => row.slug)
    .filter((slug): slug is string => Boolean(slug));
}

// ── Slugs ─────────────────────────────────────────────────────────────────────

/**
 * Builds a slug that is free in `faq_entries`. `excludeId` keeps an entry from
 * colliding with its own current slug while being edited.
 */
export async function buildUniqueFaqSlug(
  desired: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyQuestion(desired) || "vapros";
  const supabase = createSupabaseAdminClient();

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    let query = supabase.from("faq_entries").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Failed to check FAQ slug: ${error.message}`);
    }
    if (!data) return candidate;
  }

  return `${base}-${Date.now()}`;
}

// ── Public submission ─────────────────────────────────────────────────────────

export type FaqSubmissionInput = {
  question?: unknown;
  name?: unknown;
  email?: unknown;
};

export type FaqSubmissionResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function isValidEmail(value: string) {
  return value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function isRateLimited(ipHash: string) {
  const supabase = createSupabaseAdminClient();
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("faq_question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", sinceIso);

  if (error) {
    throw new Error(`Failed to check FAQ submission attempts: ${error.message}`);
  }

  return (count ?? 0) >= MAX_QUESTIONS_PER_IP_PER_HOUR;
}

/**
 * Stores a visitor question as `pending` — it stays invisible on the site until
 * an administrator writes an answer and publishes it.
 */
export async function submitFaqQuestion(
  request: Request,
  input: FaqSubmissionInput,
): Promise<FaqSubmissionResult> {
  const question = typeof input.question === "string" ? input.question.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Въпросът трябва да е между ${MIN_QUESTION_LENGTH} и ${MAX_QUESTION_LENGTH} символа.`,
    };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, status: 400, error: "Името е твърде дълго." };
  }

  if (email && !isValidEmail(email)) {
    return { ok: false, status: 400, error: "Имейлът изглежда невалиден." };
  }

  const ipHash = hashRequestIdentity(getClientIp(request));

  if (await isRateLimited(ipHash)) {
    return {
      ok: false,
      status: 429,
      error: "Изпрати твърде много въпроси. Опитай отново след час.",
    };
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("faq_entries").insert({
    question,
    status: "pending",
    source: "user",
    asker_name: name || null,
    asker_email: email || null,
  });

  if (error) {
    throw new Error(`Failed to store FAQ question: ${error.message}`);
  }

  await supabase.from("faq_question_attempts").insert({ ip_hash: ipHash });

  return { ok: true };
}
