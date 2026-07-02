import { getRuntimeEnv, getRuntimeEnvAsync } from "@/lib/env/runtime";

/** Server-side Google Places API key (Places API New must be enabled). */
export function getGooglePlacesApiKey(): string | null {
  return getRuntimeEnv("GOOGLE_PLACES_API_KEY") ?? null;
}

export async function getGooglePlacesApiKeyAsync(): Promise<string | null> {
  return (await getRuntimeEnvAsync("GOOGLE_PLACES_API_KEY")) ?? null;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(getGooglePlacesApiKey());
}

export async function isGooglePlacesConfiguredAsync(): Promise<boolean> {
  return Boolean(await getGooglePlacesApiKeyAsync());
}
