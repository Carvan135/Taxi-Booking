import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeEnv } from "@/lib/env/runtime";
import {
  assertSupabaseServiceRoleKey,
  getSupabaseServiceRoleKey,
  isSupabaseServiceRoleKeyValid,
} from "@/lib/supabase/service-role-key";

export { isSupabaseServiceRoleKeyValid, getSupabaseServiceRoleKeyRole } from "@/lib/supabase/service-role-key";

export function hasServiceRoleConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      getSupabaseServiceRoleKey(),
  );
}

/**
 * Service-role client when env is configured; otherwise null (no throw).
 * Prefer this in Server Components so missing deploy secrets do not crash pages.
 */
export function tryCreateAdminClient(): SupabaseClient | null {
  const url =
    getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL") ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) return null;
  if (!isSupabaseServiceRoleKeyValid()) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server-only Supabase client with service-role privileges.
 * Never import this from client components.
 */
export function createAdminClient(): SupabaseClient {
  assertSupabaseServiceRoleKey();
  const url =
    getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL") ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

