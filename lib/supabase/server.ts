import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Service-role client for webhooks and server-only jobs (no user cookies). */
export { createAdminClient as createServiceRoleClient } from "@/lib/supabase/admin";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
