/**
 * Google Places API (New) — address autocomplete, place details, and text search.
 * Uses GOOGLE_MAPS_API_KEY (server-side only).
 */

import { getGoogleMapsApiKey } from "@/lib/env/google-maps";
import type { GeoPlace, PlaceSuggestion } from "@/lib/maps/types";

const PLACES_BASE = "https://places.googleapis.com/v1";

type AutocompleteSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
    types?: string[];
  };
};

type AutocompleteResponse = {
  suggestions?: AutocompleteSuggestion[];
};

type PlaceDetails = {
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  types?: string[];
};

type SearchTextResponse = {
  places?: PlaceDetails[];
};

function getApiKey(): string {
  const key = getGoogleMapsApiKey();
  if (!key) {
    throw new Error("Google Maps API key is not configured");
  }
  return key;
}

/** Detect airports from Google place types. */
export function isAirport(types: string[] | undefined): boolean {
  if (!types?.length) return false;
  return types.some((type) => {
    const normalized = type.toLowerCase();
    return normalized.includes("airport");
  });
}

function suggestionLabel(suggestion: AutocompleteSuggestion): string {
  const prediction = suggestion.placePrediction;
  const structured = prediction?.structuredFormat;
  const main = structured?.mainText?.text?.trim();
  const secondary = structured?.secondaryText?.text?.trim();
  if (main && secondary) return `${main}, ${secondary}`;
  return (
    prediction?.text?.text?.trim() ||
    main ||
    secondary ||
    ""
  );
}

function placeLabel(place: PlaceDetails): string {
  return (
    place.formattedAddress?.trim() ||
    place.displayName?.text?.trim() ||
    ""
  );
}

function normalizePlace(place: PlaceDetails): GeoPlace | null {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const label = placeLabel(place);
  if (label.length < 3) return null;

  return {
    label,
    lat,
    lng,
    isAirport: isAirport(place.types),
  };
}

async function placesFetch<T>(
  path: string,
  init: RequestInit & { fieldMask: string },
): Promise<T> {
  const { fieldMask, ...requestInit } = init;
  const res = await fetch(`${PLACES_BASE}${path}`, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask": fieldMask,
      ...requestInit.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Places request failed (${res.status}): ${body}`);
  }

  return (await res.json()) as T;
}

/** Address autocomplete suggestions for a free-text query. */
export async function autocomplete(
  query: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const input = query.trim();
  if (input.length < 2) return [];

  const body: Record<string, unknown> = {
    input,
    includedRegionCodes: ["gb"],
    languageCode: "en",
  };
  if (sessionToken) {
    body.sessionToken = sessionToken;
  }

  const data = await placesFetch<AutocompleteResponse>("/places:autocomplete", {
    method: "POST",
    fieldMask:
      "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types",
    body: JSON.stringify(body),
  });

  const suggestions: PlaceSuggestion[] = [];
  for (const suggestion of data.suggestions ?? []) {
    const placeId = suggestion.placePrediction?.placeId?.trim();
    const label = suggestionLabel(suggestion);
    if (!placeId || label.length < 3) continue;
    suggestions.push({
      label,
      placeId,
      isAirport: isAirport(suggestion.placePrediction?.types),
    });
  }

  return suggestions;
}

/** Resolve a place ID to coordinates and a formatted label. */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<GeoPlace | null> {
  const id = placeId.trim();
  if (!id) return null;

  const params = new URLSearchParams();
  if (sessionToken) {
    params.set("sessionToken", sessionToken);
  }
  const query = params.toString();
  const path = `/places/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;

  const data = await placesFetch<PlaceDetails>(path, {
    method: "GET",
    fieldMask: "id,displayName,formattedAddress,location,types",
  });

  return normalizePlace(data);
}

/** Forward geocode a full address string to coordinates (text search fallback). */
export async function geocode(text: string): Promise<GeoPlace | null> {
  const textQuery = text.trim();
  if (textQuery.length < 3) return null;

  const data = await placesFetch<SearchTextResponse>("/places:searchText", {
    method: "POST",
    fieldMask: "places.displayName,places.formattedAddress,places.location,places.types",
    body: JSON.stringify({
      textQuery,
      regionCode: "GB",
      languageCode: "en",
    }),
  });

  const place = data.places?.[0];
  if (!place) return null;
  return normalizePlace(place);
}
