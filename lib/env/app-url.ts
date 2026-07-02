import { getRuntimeEnv, getRuntimeEnvAsync } from "@/lib/env/runtime";

const PRODUCTION_APP_URL = "https://airporthub.co.uk";

function resolveAppUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.replace(/\/$/, "");
  // Builds often bake localhost into NEXT_PUBLIC_APP_URL — ignore in production.
  if (
    process.env.NODE_ENV === "production" &&
    /localhost|127\.0\.0\.1/i.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

/** Canonical app origin (no trailing slash). */
export function getAppUrl(): string {
  const fromEnv =
    resolveAppUrl(getRuntimeEnv("NEXT_PUBLIC_APP_URL")) ??
    resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_URL;
  }
  return "http://localhost:3000";
}

export async function getAppUrlAsync(): Promise<string> {
  const fromEnv =
    resolveAppUrl(await getRuntimeEnvAsync("NEXT_PUBLIC_APP_URL")) ??
    resolveAppUrl(getRuntimeEnv("NEXT_PUBLIC_APP_URL")) ??
    resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_URL;
  }
  return "http://localhost:3000";
}
