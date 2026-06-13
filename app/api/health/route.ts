import { NextResponse } from "next/server";
import { getEmailFromAddress, isEmailConfigured } from "@/lib/email/config";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import { hasServiceRoleConfig } from "@/lib/supabase/admin";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";

/** Deployment probe — no secrets. Excluded from auth middleware. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabasePublicEnv: isSupabasePublicEnvConfigured(),
    supabaseServiceRoleConfigured: hasServiceRoleConfig(),
    geoapifyConfigured: isGeoapifyConfigured(),
    emailConfigured: isEmailConfigured(),
    emailFrom: isEmailConfigured() ? getEmailFromAddress() : null,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  });
}
