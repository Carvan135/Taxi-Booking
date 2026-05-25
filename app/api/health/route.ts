import { NextResponse } from "next/server";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";

/** Deployment probe — no secrets. Excluded from auth middleware. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabasePublicEnv: isSupabasePublicEnvConfigured(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  });
}
