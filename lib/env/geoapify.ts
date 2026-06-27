import { getRuntimeEnv } from "@/lib/env/runtime";

/** Fallback when GEOAPIFY_API_KEY is not set in the Worker/host env. Env vars take precedence. */
const GEOAPIFY_API_KEY_FALLBACK = "2f40c7b1acd84d8aad268aa3916d7c1e";

/** Geoapify API key for server-side routing (Workers / API routes). */
export function getGeoapifyApiKey(): string {
  return (
    getRuntimeEnv("GEOAPIFY_API_KEY") ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY?.trim() ||
    GEOAPIFY_API_KEY_FALLBACK
  );
}

export function isGeoapifyConfigured(): boolean {
  return Boolean(
    getRuntimeEnv("GEOAPIFY_API_KEY") ||
      process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY?.trim(),
  );
}
