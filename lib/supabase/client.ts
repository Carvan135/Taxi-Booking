import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/env/supabase-public";

export function createClient() {
  const supabaseEnv = getSupabasePublicEnv();
  if (!supabaseEnv) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(
    supabaseEnv.url,
    supabaseEnv.anonKey,
  );
}
