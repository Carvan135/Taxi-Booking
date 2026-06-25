import {
  getEmailFromAddress,
  isEmailConfigured,
  isResendApiKeyConfigured,
  isResendFromEmailConfigured,
} from "@/lib/email/config";
import { getRuntimeEnv } from "@/lib/env/runtime";
import { isGeoapifyConfigured } from "@/lib/env/geoapify";
import {
  getStripePublishableKey,
  isStripePublishableKeyConfigured,
} from "@/lib/stripe/publishable-key";
import { isSmsConfigured } from "@/lib/sms/config";
import { hasServiceRoleConfig } from "@/lib/supabase/admin";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthChecks = {
  supabasePublicEnv: boolean;
  supabaseServiceRoleConfigured: boolean;
  geoapifyConfigured: boolean;
  emailConfigured: boolean;
  resendApiKeyConfigured: boolean;
  resendFromEmailConfigured: boolean;
  stripePublishableKeyConfigured: boolean;
  smsConfigured: boolean;
  cronSecretConfigured: boolean;
};

export type HealthReport = {
  ok: boolean;
  status: HealthStatus;
  timestamp: string;
  version: string;
  nodeEnv: string;
  uptimeSeconds: number;
  checks: HealthChecks;
  emailFrom: string | null;
  publishableKey: string | null;
};

const APP_VERSION = process.env.npm_package_version ?? "0.1.0";

function buildChecks(): HealthChecks {
  return {
    supabasePublicEnv: isSupabasePublicEnvConfigured(),
    supabaseServiceRoleConfigured: hasServiceRoleConfig(),
    geoapifyConfigured: isGeoapifyConfigured(),
    emailConfigured: isEmailConfigured(),
    resendApiKeyConfigured: isResendApiKeyConfigured(),
    resendFromEmailConfigured: isResendFromEmailConfigured(),
    stripePublishableKeyConfigured: isStripePublishableKeyConfigured(),
    smsConfigured: isSmsConfigured(),
    cronSecretConfigured: Boolean(getRuntimeEnv("CRON_SECRET")),
  };
}

function deriveStatus(checks: HealthChecks, readiness: boolean): HealthStatus {
  if (readiness) {
    const optionalConfigured = [
      checks.emailConfigured,
      checks.geoapifyConfigured,
      checks.stripePublishableKeyConfigured,
    ].filter(Boolean).length;

    if (optionalConfigured < 2) return "degraded";
    return "healthy";
  }

  if (checks.supabasePublicEnv) return "degraded";
  return "unhealthy";
}

export function buildHealthReport(options?: { readiness?: boolean }): HealthReport {
  const checks = buildChecks();
  const readiness =
    options?.readiness ??
    (checks.supabasePublicEnv && checks.supabaseServiceRoleConfigured);

  const status = deriveStatus(checks, readiness);

  return {
    ok: status !== "unhealthy",
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    nodeEnv: process.env.NODE_ENV ?? "development",
    uptimeSeconds: Math.round(process.uptime()),
    checks,
    emailFrom: isEmailConfigured() ? getEmailFromAddress() : null,
    publishableKey: getStripePublishableKey(),
  };
}
