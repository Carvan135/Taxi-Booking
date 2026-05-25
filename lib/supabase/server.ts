import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/env/supabase-public";

/** Service-role client for webhooks and server-only jobs (no user cookies). */
export { createAdminClient as createServiceRoleClient } from "@/lib/supabase/admin";

export function createClient() {
  const supabaseEnv = getSupabasePublicEnv();
  if (!supabaseEnv) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = cookies();

  return createServerClient(
    supabaseEnv.url,
    supabaseEnv.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          void headers;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component without mutable cookies; middleware keeps session fresh.
          }
        },
      },
    },
  );
}
