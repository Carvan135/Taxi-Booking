/**
 * Geoapify server helpers for address autocomplete, geocoding, and routing.
 * Uses GEOAPIFY_API_KEY (preferred) or NEXT_PUBLIC_GEOAPIFY_API_KEY (fallback).
 */

import { getGeoapifyApiKey } from "@/lib/env/geoapify";

const GEOAPIFY_BASE = "https://api.geoapify.com/v1";
const UK_FILTER = "countrycode:gb";

export type GeoPlace = {
  label: string;
  lat: number;
  lng: number;
  isAirport: boolean;
};

type GeoapifyProperties = {
  formatted?: string;
  address_line1?: string;
  name?: string;
  lat?: number;
  lon?: number;
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

export type RouteResult = {
  distanceMiles: number;
  durationMinutes: number;
};

const METERS_PER_MILE = 1609.344;

function distanceToMiles(distance: number, units?: string): number {
  if (!units) {
    // Routing requests use units=imperial; distance is already in miles.
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

/** Normalize a Geoapify feature into a consistent place object. */
export function normalizePlace(feature: GeoapifyFeature): GeoPlace | null {
  const props = feature.properties;
  if (!props) return null;

  const coords = getCoordinates(feature);
  if (!coords) return null;
  const { lat, lng: lon } = coords;

  const label =
    props.formatted?.trim() ||
    props.address_line1?.trim() ||
    props.name?.trim() ||
    "";

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
    limit: "6",
    filter: UK_FILTER,
    lang: "en",
  });

  const data = await fetchGeoapify<AutocompleteResponse>(url);
  const places: GeoPlace[] = [];

  for (const feature of data.features ?? []) {
    const place = normalizePlace(feature);
    if (place) places.push(place);
  }

  return places;
}

/** Forward geocode a full address string to coordinates. */
export async function geocode(text: string): Promise<GeoPlace | null> {
  const query = text.trim();
  if (query.length < 3) return null;

  const url = buildUrl("/geocode/search", {
    text: query,
    limit: "1",
    filter: UK_FILTER,
    lang: "en",
  });

  const data = await fetchGeoapify<GeocodeSearchResponse>(url);
  const feature = data.features?.[0];
  if (!feature) return null;
  return normalizePlace(feature);
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

