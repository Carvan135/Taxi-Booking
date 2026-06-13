import { NextResponse } from "next/server";
import { getEmailFromAddress, isEmailConfigured } from "@/lib/email/config";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import {
  getStripePublishableKey,
  isStripePublishableKeyConfigured,
} from "@/lib/stripe/publishable-key";
import { hasServiceRoleConfig } from "@/lib/supabase/admin";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";

/** Deployment probe — no secrets. Excluded from auth middleware. */
export async function GET() {
  const publishableKey = getStripePublishableKey();

  return NextResponse.json({
    ok: true,
    supabasePublicEnv: isSupabasePublicEnvConfigured(),
    supabaseServiceRoleConfigured: hasServiceRoleConfig(),
    geoapifyConfigured: isGeoapifyConfigured(),
    emailConfigured: isEmailConfigured(),
    emailFrom: isEmailConfigured() ? getEmailFromAddress() : null,
    stripePublishableKeyConfigured: isStripePublishableKeyConfigured(),
    publishableKey,
  });
}
