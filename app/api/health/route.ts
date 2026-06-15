import { NextResponse } from "next/server";
import { getEmailFromAddress, isEmailConfigured, isResendApiKeyConfigured, isResendFromEmailConfigured } from "@/lib/email/config";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import {
  getStripePublishableKey,
  isStripePublishableKeyConfigured,
} from "@/lib/stripe/publishable-key";
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
    resendApiKeyConfigured: isResendApiKeyConfigured(),
    resendFromEmailConfigured: isResendFromEmailConfigured(),
    emailFrom: isEmailConfigured() ? getEmailFromAddress() : null,
    stripePublishableKeyConfigured: isStripePublishableKeyConfigured(),
    publishableKey: getStripePublishableKey(),
  });
}
