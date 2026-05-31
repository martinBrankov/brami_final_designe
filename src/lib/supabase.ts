import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createSupabaseClient() {
  const supabaseKey =
    typeof window === "undefined"
      ? (supabaseServiceRoleKey || supabaseAnonKey)
      : supabaseAnonKey;

  if (!supabaseKey) {
    throw new Error("Missing Supabase key for current runtime");
  }

  return createClient(supabaseUrl, supabaseKey);
}
