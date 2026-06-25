import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeEnv } from "@/lib/env/runtime";

export function hasServiceRoleConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

/**
 * Service-role client when env is configured; otherwise null (no throw).
 * Prefer this in Server Components so missing deploy secrets do not crash pages.
 */
export function tryCreateAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server-only Supabase client with service-role privileges.
 * Never import this from client components.
 */
export function createAdminClient(): SupabaseClient {
  const client = tryCreateAdminClient();
  if (!client) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return client;
}

