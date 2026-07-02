/** Shared log prefix — filter DevTools or Worker logs with `Google Places`. */
export const GOOGLE_PLACES_LOG_PREFIX = "[AirportHub:Google Places]";

export type AddressProvider = "google" | "geoapify" | "none";

export type PlacesApiDiagnostics = {
  provider?: AddressProvider;
  googleFailure?: string;
  error?: string;
};

/** Server-side (API routes / Workers). */
export function logGooglePlacesServerError(
  operation: string,
  details: Record<string, unknown>,
): void {
  console.error(GOOGLE_PLACES_LOG_PREFIX, operation, details);
}

/** Browser console when our API fell back from Google to Geoapify. */
export function logGooglePlacesClientFallback(
  operation: string,
  details: Record<string, unknown>,
): void {
  console.warn(GOOGLE_PLACES_LOG_PREFIX, operation, details);
}

export function logGooglePlacesClientError(
  operation: string,
  details: Record<string, unknown>,
): void {
  console.error(GOOGLE_PLACES_LOG_PREFIX, operation, details);
}

/** Log when /api/places/* used a non-Google provider despite Google being expected. */
export function logPlacesApiDiagnostics(
  operation: string,
  query: string,
  diagnostics: PlacesApiDiagnostics,
): void {
  const { provider, googleFailure, error } = diagnostics;

  if (error) {
    logGooglePlacesClientError(operation, { query, error });
    return;
  }

  if (googleFailure) {
    logGooglePlacesClientFallback(operation, {
      query,
      provider: provider ?? "unknown",
      googleFailure,
    });
    return;
  }

  if (provider && provider !== "google") {
    logGooglePlacesClientFallback(operation, {
      query,
      provider,
      hint: "Google Places may not be configured in production",
    });
  }
}
