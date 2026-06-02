import { NextResponse } from "next/server";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";

/** Deployment probe — no secrets. Excluded from auth middleware. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabasePublicEnv: isSupabasePublicEnvConfigured(),
    geoapifyConfigured: isGeoapifyConfigured(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  });
}
