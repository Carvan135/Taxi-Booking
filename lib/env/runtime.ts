import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Static `process.env.VAR` reads so Next.js / Workers Builds can inline values
 * at build time. Dynamic `process.env[name]` is NOT inlined.
 */
function readStaticProcessEnv(name: string): string | undefined {
  switch (name) {
    case "CRON_SECRET":
      return process.env.CRON_SECRET?.trim();
    case "EMAIL_FROM":
      return process.env.EMAIL_FROM?.trim();
    case "GEOAPIFY_API_KEY":
      return process.env.GEOAPIFY_API_KEY?.trim();
    case "RESEND_API_KEY":
      return process.env.RESEND_API_KEY?.trim();
    case "RESEND_FROM_EMAIL":
      return process.env.RESEND_FROM_EMAIL?.trim();
    case "RESEND_FROM_NAME":
      return process.env.RESEND_FROM_NAME?.trim();
    case "STRIPE_SECRET_KEY":
      return process.env.STRIPE_SECRET_KEY?.trim();
    case "STRIPE_WEBHOOK_SECRET":
      return process.env.STRIPE_WEBHOOK_SECRET?.trim();
    case "STRIPE_CONNECT_WEBHOOK_SECRET":
      return process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();
    case "NEXT_PUBLIC_APP_URL":
      return process.env.NEXT_PUBLIC_APP_URL?.trim();
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    case "SUPABASE_SERVICE_ROLE_KEY":
      return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    case "TWILIO_ACCOUNT_SID":
      return process.env.TWILIO_ACCOUNT_SID?.trim();
    case "TWILIO_AUTH_TOKEN":
      return process.env.TWILIO_AUTH_TOKEN?.trim();
    case "TWILIO_PHONE_NUMBER":
      return process.env.TWILIO_PHONE_NUMBER?.trim();
    default: {
      const value = process.env[name];
      return typeof value === "string" ? value.trim() : undefined;
    }
  }
}

function readCloudflareBindingEnv(name: string): string | undefined {
  try {
    const value = (getCloudflareContext().env as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  } catch {
    // Local `next dev` or outside a Worker request context.
  }
  return undefined;
}

/**
 * Read a server-side secret/env var in local dev and on Cloudflare Workers.
 *
 * Order: static process.env (build inline + runtime populate) → Worker binding env.
 */
export function getRuntimeEnv(name: string): string | undefined {
  return readStaticProcessEnv(name) || readCloudflareBindingEnv(name);
}

export async function getRuntimeEnvAsync(name: string): Promise<string | undefined> {
  const immediate = getRuntimeEnv(name);
  if (immediate) return immediate;

  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  } catch {
    // ignore
  }

  return undefined;
}

export type RuntimeEnvProbe = {
  staticProcessEnv: boolean;
  cloudflareBinding: boolean;
  cloudflareBindingAsync: boolean;
};

export type RuntimeEnvDiagnostics = {
  workerName: string;
  hint: string;
  bindingKeys: string[];
    probes: Record<string, RuntimeEnvProbe>;
};

const DIAGNOSTIC_VARS = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_CONNECT_WEBHOOK_SECRET",
  "CRON_SECRET",
] as const;

/** Safe diagnostics (booleans + binding names only — never secret values). */
export async function getRuntimeEnvDiagnostics(): Promise<RuntimeEnvDiagnostics> {
  let bindingKeys: string[] = [];
  try {
    bindingKeys = Object.keys(getCloudflareContext().env).sort();
  } catch {
    bindingKeys = [];
  }

  const probes: Record<string, RuntimeEnvProbe> = {};
  for (const name of DIAGNOSTIC_VARS) {
    let cloudflareBindingAsync = false;
    try {
      const { env } = await getCloudflareContext({ async: true });
      cloudflareBindingAsync = Boolean((env as Record<string, unknown>)[name]);
    } catch {
      cloudflareBindingAsync = false;
    }

    probes[name] = {
      staticProcessEnv: Boolean(readStaticProcessEnv(name)),
      cloudflareBinding: Boolean(readCloudflareBindingEnv(name)),
      cloudflareBindingAsync,
    };
  }

  return {
    workerName: "taxi-booking",
    hint:
      "Workers Builds → Environment variables are BUILD-only. API routes also need Worker → Settings → Variables and secrets (Production runtime).",
    bindingKeys,
    probes,
  };
}
