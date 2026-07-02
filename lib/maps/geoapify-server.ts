/**
 * Geoapify server helpers for address autocomplete, geocoding, and routing.
 * Uses GEOAPIFY_API_KEY (preferred) or NEXT_PUBLIC_GEOAPIFY_API_KEY (fallback).
 */

import { getGeoapifyApiKey } from "@/lib/env/geoapify";
import type { GeoPlace, RouteResult } from "@/lib/maps/types";

export type { GeoPlace, RouteResult } from "@/lib/maps/types";

const GEOAPIFY_BASE = "https://api.geoapify.com/v1";
const UK_FILTER = "countrycode:gb";
const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;
const SUGGESTION_LIMIT = "6";

type GeoapifyProperties = {
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  name?: string;
  lat?: number;
  lon?: number;
  city?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  category?: string;
  categories?: string[];
  result_type?: string;
};

type GeoapifyFeature = {
  properties?: GeoapifyProperties;
  geometry?: { coordinates?: [number, number] };
};

type AutocompleteResponse = {
  features?: GeoapifyFeature[];
};

type GeocodeSearchResponse = {
  features?: GeoapifyFeature[];
};

type RoutingJsonResponse = {
  results?: Array<{
    distance?: number;
    time?: number;
    distance_units?: string;
  }>;
};

const METERS_PER_MILE = 1609.344;

function distanceToMiles(distance: number, units?: string): number {
  if (!units) {
    return distance;
  }
  const normalized = units.toLowerCase();
  if (normalized.includes("mile")) {
    return distance;
  }
  if (normalized.includes("meter") || normalized.includes("metre")) {
    return distance / METERS_PER_MILE;
  }
  return distance / METERS_PER_MILE;
}

function getApiKey(): string {
  const key = getGeoapifyApiKey();
  if (!key) {
    throw new Error("Geoapify API key is not configured");
  }
  return key;
}

function getCoordinates(feature: GeoapifyFeature): { lat: number; lng: number } | null {
  const props = feature.properties;
  if (typeof props?.lat === "number" && typeof props?.lon === "number") {
    return { lat: props.lat, lng: props.lon };
  }
  const coords = feature.geometry?.coordinates;
  if (coords && coords.length >= 2) {
    const [lng, lat] = coords;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
  }
  return null;
}

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${GEOAPIFY_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("apiKey", getApiKey());
  return url.toString();
}

/** Detect airports from Geoapify category metadata. */
export function isAirport(source: {
  category?: string;
  categories?: string[];
  result_type?: string;
  name?: string;
}): boolean {
  const categories = [
    ...(source.categories ?? []),
    ...(source.category ? [source.category] : []),
  ].map((c) => c.toLowerCase());

  if (categories.some((c) => c.includes("airport"))) {
    return true;
  }

  const resultType = source.result_type?.toLowerCase() ?? "";
  if (resultType.includes("airport")) {
    return true;
  }

  const name = source.name?.toLowerCase() ?? "";
  if (/\bairport\b/.test(name)) {
    return true;
  }

  return false;
}

function hasStreetAddress(props: GeoapifyProperties): boolean {
  return Boolean(props.housenumber?.trim() || props.street?.trim());
}

/** Prefer building-level matches over postcode centroids. */
function placePrecisionRank(props: GeoapifyProperties): number {
  const resultType = props.result_type?.toLowerCase() ?? "";

  if (resultType === "building" || (props.housenumber && props.street)) {
    return 100;
  }
  if (resultType === "amenity" || isAirport(props)) {
    return 90;
  }
  if (resultType === "street" && props.street) {
    return 70;
  }
  if (resultType === "postcode") {
    return 20;
  }
  if (resultType === "city" || resultType === "district" || resultType === "suburb") {
    return 10;
  }
  return hasStreetAddress(props) ? 80 : 50;
}

/** Build a display label that keeps door number and street when present. */
export function formatPlaceLabel(props: GeoapifyProperties): string {
  const line1 = props.address_line1?.trim();
  const line2 = props.address_line2?.trim();

  if (line1 && line2 && (hasStreetAddress(props) || props.name?.trim())) {
    return `${line1}, ${line2}`;
  }

  const streetLine = [props.housenumber, props.street]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  const parts: string[] = [];
  if (streetLine) parts.push(streetLine);
  if (props.city?.trim()) parts.push(props.city.trim());
  if (props.postcode?.trim()) parts.push(props.postcode.trim());

  if (parts.length >= 2) {
    return parts.join(", ");
  }

  return (
    props.formatted?.trim() ||
    (line1 && line2 ? `${line1}, ${line2}` : line1) ||
    props.name?.trim() ||
    ""
  );
}

function featureDedupeKey(feature: GeoapifyFeature): string {
  const coords = getCoordinates(feature);
  if (coords) {
    return `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
  }
  return feature.properties?.formatted?.trim().toLowerCase() ?? "";
}

function mergeFeatures(
  primary: GeoapifyFeature[],
  secondary: GeoapifyFeature[],
): GeoapifyFeature[] {
  const seen = new Set<string>();
  const merged: GeoapifyFeature[] = [];

  for (const feature of [...primary, ...secondary]) {
    const key = featureDedupeKey(feature);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(feature);
  }

  return merged.sort(
    (a, b) =>
      placePrecisionRank(b.properties ?? {}) - placePrecisionRank(a.properties ?? {}),
  );
}

function shouldSupplementWithSearch(
  query: string,
  features: GeoapifyFeature[],
): boolean {
  if (features.length === 0) {
    return true;
  }

  const topRank = Math.max(
    ...features.map((feature) => placePrecisionRank(feature.properties ?? {})),
  );
  if (topRank >= 70) {
    return false;
  }

  if (!UK_POSTCODE_RE.test(query)) {
    return query.length >= 8;
  }

  const remainder = query
    .replace(UK_POSTCODE_RE, "")
    .replace(/,/g, " ")
    .trim();

  // Postcode-only queries need the geocode search supplement (area → streets).
  if (remainder.length === 0) {
    return true;
  }

  return remainder.length >= 2;
}

async function searchFeatures(query: string, limit = SUGGESTION_LIMIT): Promise<GeoapifyFeature[]> {
  const url = buildUrl("/geocode/search", {
    text: query,
    limit,
    filter: UK_FILTER,
    lang: "en",
  });

  const data = await fetchGeoapify<GeocodeSearchResponse>(url);
  return data.features ?? [];
}

function featuresToPlaces(features: GeoapifyFeature[], limit: number): GeoPlace[] {
  const places: GeoPlace[] = [];

  for (const feature of features) {
    const place = normalizePlace(feature);
    if (place) places.push(place);
    if (places.length >= limit) break;
  }

  return places;
}

/** Normalize a Geoapify feature into a consistent place object. */
export function normalizePlace(feature: GeoapifyFeature): GeoPlace | null {
  const props = feature.properties;
  if (!props) return null;

  const coords = getCoordinates(feature);
  if (!coords) return null;
  const { lat, lng: lon } = coords;

  const label = formatPlaceLabel(props);

  if (label.length < 3) return null;

  return {
    label,
    lat,
    lng: lon,
    isAirport: isAirport(props),
  };
}

async function fetchGeoapify<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geoapify request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Address autocomplete suggestions for a free-text query. */
export async function autocomplete(query: string): Promise<GeoPlace[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  const url = buildUrl("/geocode/autocomplete", {
    text,
    limit: SUGGESTION_LIMIT,
    filter: UK_FILTER,
    lang: "en",
  });

  const data = await fetchGeoapify<AutocompleteResponse>(url);
  const autocompleteFeatures = data.features ?? [];

  let features = autocompleteFeatures;
  if (shouldSupplementWithSearch(text, autocompleteFeatures)) {
    const searchFeaturesResult = await searchFeatures(text, SUGGESTION_LIMIT);
    features = mergeFeatures(autocompleteFeatures, searchFeaturesResult);
  } else {
    features = mergeFeatures(autocompleteFeatures, []);
  }

  return featuresToPlaces(features, Number(SUGGESTION_LIMIT));
}

/** Forward geocode a full address string to coordinates. */
export async function geocode(text: string): Promise<GeoPlace | null> {
  const query = text.trim();
  if (query.length < 3) return null;

  const features = await searchFeatures(query, "5");
  const ranked = [...features].sort(
    (a, b) =>
      placePrecisionRank(b.properties ?? {}) - placePrecisionRank(a.properties ?? {}),
  );

  for (const feature of ranked) {
    const place = normalizePlace(feature);
    if (place) return place;
  }

  return null;
}

/** Driving route between two coordinates. */
export async function route(
  pickup: Pick<GeoPlace, "lat" | "lng">,
  dropoff: Pick<GeoPlace, "lat" | "lng">,
): Promise<RouteResult> {
  const waypoints = `${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}`;
  const url = buildUrl("/routing", {
    waypoints,
    mode: "drive",
    format: "json",
    units: "imperial",
  });

  const data = await fetchGeoapify<RoutingJsonResponse>(url);
  const leg = data.results?.[0];
  if (!leg || typeof leg.distance !== "number" || typeof leg.time !== "number") {
    throw new Error("Could not calculate route");
  }

  const miles = distanceToMiles(leg.distance, leg.distance_units);

  return {
    distanceMiles: Math.round(miles * 10) / 10,
    durationMinutes: Math.max(1, Math.round(leg.time / 60)),
  };
}
