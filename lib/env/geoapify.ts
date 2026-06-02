/** Geoapify API key for server-side geocoding (Workers / API routes). */
export function getGeoapifyApiKey(): string | null {
  const key =
    process.env.GEOAPIFY_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY?.trim();
  return key || null;
}

export function isGeoapifyConfigured(): boolean {
  return getGeoapifyApiKey() !== null;
}
