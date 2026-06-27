import { getRuntimeEnv } from "@/lib/env/runtime";

/** Google Maps Platform API key (Places API) for server-side /api/places/* routes. */
export function getGoogleMapsApiKey(): string {
  return getRuntimeEnv("GOOGLE_MAPS_API_KEY") ?? "";
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey());
}
