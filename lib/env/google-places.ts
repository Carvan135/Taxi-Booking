import { getRuntimeEnv } from "@/lib/env/runtime";

/** Server-side Google Places API key (Places API New must be enabled). */
export function getGooglePlacesApiKey(): string | null {
  return getRuntimeEnv("GOOGLE_PLACES_API_KEY") ?? null;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(getGooglePlacesApiKey());
}
