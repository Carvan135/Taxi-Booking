import { getRuntimeEnv } from "@/lib/env/runtime";

const DEFAULT_PRODUCTION_URL = "https://airporthub.co.uk";

function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url.includes("://") ? url : `https://${url}`);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Canonical app origin (no trailing slash). */
export function getAppUrl(): string {
  const raw =
    getRuntimeEnv("NEXT_PUBLIC_APP_URL") ??
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  const normalized = raw?.replace(/\/$/, "");
  const inProduction = process.env.NODE_ENV === "production";

  if (normalized && !(inProduction && isLocalhostUrl(normalized))) {
    return normalized;
  }

  if (inProduction) {
    return DEFAULT_PRODUCTION_URL;
  }

  return normalized || "http://localhost:3000";
}
