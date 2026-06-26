import { getRuntimeEnv } from "@/lib/env/runtime";

/** Decode JWT payload without verification (role check only). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const json = decodeURIComponent(
      Array.from(binary, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(
        "",
      ),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
}

/** JWT `role` claim from SUPABASE_SERVICE_ROLE_KEY (e.g. service_role, anon). */
export function getSupabaseServiceRoleKeyRole(): string | null {
  const key = getSupabaseServiceRoleKey();
  if (!key) return null;
  const payload = decodeJwtPayload(key);
  const role = payload?.role;
  return typeof role === "string" ? role : null;
}

/** True when the configured key is the service_role secret (bypasses RLS). */
export function isSupabaseServiceRoleKeyValid(): boolean {
  return getSupabaseServiceRoleKeyRole() === "service_role";
}

export function assertSupabaseServiceRoleKey(): void {
  const key = getSupabaseServiceRoleKey();
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set the service_role secret from Supabase Dashboard → Settings → API.",
    );
  }
  const role = getSupabaseServiceRoleKeyRole();
  if (role !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY has JWT role "${role ?? "unknown"}" — must be "service_role". ` +
        "You likely pasted the anon/public key. Use Settings → API → service_role (secret).",
    );
  }
}
