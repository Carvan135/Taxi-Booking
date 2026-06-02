/** Fallback when GEOAPIFY_API_KEY is not set in the Worker/host env. Env vars take precedence. */
const GEOAPIFY_API_KEY_FALLBACK = "2f40c7b1acd84d8aad268aa3916d7c1e";

/** Geoapify API key for server-side geocoding (Workers / API routes). */
export function getGeoapifyApiKey(): string {
  return (
    process.env.GEOAPIFY_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY?.trim() ||
    GEOAPIFY_API_KEY_FALLBACK
  );
}

export function isGeoapifyConfigured(): boolean {
  return getGeoapifyApiKey().length > 0;
}
