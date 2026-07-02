import { getGooglePlacesApiKey } from "@/lib/env/google-places";
import type { GeoPlace } from "@/lib/maps/types";

const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1";
const SUGGESTION_LIMIT = 6;

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      types?: string[];
    };
  }>;
};

type GooglePlaceDetails = {
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  types?: string[];
};

type GoogleTextSearchResponse = {
  places?: GooglePlaceDetails[];
};

function isAirportFromTypes(types: string[] | undefined): boolean {
  return (types ?? []).some((type) => type.toLowerCase().includes("airport"));
}

function toPlaceResourceName(placeId: string): string {
  return placeId.startsWith("places/") ? placeId : `places/${placeId}`;
}

function formatPlaceLabel(data: GooglePlaceDetails): string {
  return (
    data.formattedAddress?.trim() ||
    data.displayName?.text?.trim() ||
    ""
  );
}

/** Google Places Autocomplete (New) — UK-focused address suggestions. */
export async function googlePlacesAutocomplete(input: string): Promise<GeoPlace[]> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return [];

  const res = await fetch(`${GOOGLE_PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["gb"],
      languageCode: "en",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Google Places autocomplete failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  const data = (await res.json()) as GoogleAutocompleteResponse;
  const places: GeoPlace[] = [];

  for (const suggestion of data.suggestions ?? []) {
    const prediction = suggestion.placePrediction;
    const label = prediction?.text?.text?.trim();
    const googlePlaceId = prediction?.placeId?.trim();
    if (!prediction || !label || !googlePlaceId) continue;

    places.push({
      label,
      lat: 0,
      lng: 0,
      isAirport: isAirportFromTypes(prediction.types),
      googlePlaceId,
    });

    if (places.length >= SUGGESTION_LIMIT) break;
  }

  return places;
}

/** Resolve a Google place id to coordinates and a formatted label. */
export async function resolveGooglePlace(placeId: string): Promise<GeoPlace | null> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;

  const res = await fetch(
    `${GOOGLE_PLACES_BASE}/${encodeURIComponent(toPlaceResourceName(placeId))}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Google Places details failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  const data = (await res.json()) as GooglePlaceDetails;
  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  const label = formatPlaceLabel(data);
  if (!label) return null;

  return {
    label,
    lat,
    lng,
    isAirport: isAirportFromTypes(data.types),
  };
}

/** Forward geocode a free-text UK address via Google Text Search (New). */
export async function googleGeocode(text: string): Promise<GeoPlace | null> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;

  const res = await fetch(`${GOOGLE_PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.types",
    },
    body: JSON.stringify({
      textQuery: text,
      regionCode: "GB",
      languageCode: "en",
      maxResultCount: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Google Places search failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  const data = (await res.json()) as GoogleTextSearchResponse;
  const place = data.places?.[0];
  if (!place) return null;

  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  const label = formatPlaceLabel(place);
  if (!label) return null;

  return {
    label,
    lat,
    lng,
    isAirport: isAirportFromTypes(place.types),
  };
}
