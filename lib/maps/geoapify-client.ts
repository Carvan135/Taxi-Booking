export type { GeoPlace, RouteResult } from "@/lib/maps/types";

import type { GeoPlace, RouteResult } from "@/lib/maps/types";
import {
  logGooglePlacesClientError,
  logPlacesApiDiagnostics,
  type AddressProvider,
  type PlacesApiDiagnostics,
} from "@/lib/maps/places-debug";

type PlacesAutocompleteResponse = PlacesApiDiagnostics & {
  places: GeoPlace[];
  provider?: AddressProvider;
};

type PlacesGeocodeResponse = PlacesApiDiagnostics & {
  place: GeoPlace | null;
  provider?: AddressProvider;
};

type PlacesResolveResponse = {
  place: GeoPlace | null;
  error?: string;
};

async function fetchPlacesJson<T extends PlacesApiDiagnostics>(
  url: URL,
  operation: string,
  query: string,
): Promise<T> {
  let data: T;
  try {
    const res = await fetch(url);
    data = (await res.json()) as T;
    if (!res.ok) {
      logGooglePlacesClientError(operation, {
        query,
        status: res.status,
        error: data.error ?? `http_${res.status}`,
        provider: data.provider,
        googleFailure: data.googleFailure,
      });
      throw new Error(data.error ?? `Geo request failed (${res.status})`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Geo request failed")) {
      throw err;
    }
    logGooglePlacesClientError(operation, {
      query,
      error: err instanceof Error ? err.message : "network_error",
    });
    throw err;
  }

  logPlacesApiDiagnostics(operation, query, data);
  return data;
}

export async function autocomplete(query: string): Promise<GeoPlace[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  const url = new URL("/api/places/autocomplete", window.location.origin);
  url.searchParams.set("text", text);
  const data = await fetchPlacesJson<PlacesAutocompleteResponse>(
    url,
    "autocomplete",
    text,
  );
  return data.places ?? [];
}

export async function resolvePlaceSuggestion(placeId: string): Promise<GeoPlace> {
  const url = new URL("/api/places/resolve-address", window.location.origin);
  url.searchParams.set("id", placeId);
  const res = await fetch(url);
  const data = (await res.json()) as PlacesResolveResponse;
  if (!res.ok || !data.place) {
    logGooglePlacesClientError("resolve", {
      placeId,
      status: res.status,
      error: data.error ?? "not_found",
    });
    throw new Error(data.error ?? "Could not resolve address");
  }
  return data.place;
}

export async function geocode(text: string): Promise<GeoPlace | null> {
  const query = text.trim();
  if (query.length < 3) return null;
  const url = new URL("/api/places/geocode", window.location.origin);
  url.searchParams.set("text", query);
  const data = await fetchPlacesJson<PlacesGeocodeResponse>(url, "geocode", query);
  return data.place ?? null;
}

export async function route(
  pickup: Pick<GeoPlace, "lat" | "lng">,
  dropoff: Pick<GeoPlace, "lat" | "lng">,
): Promise<RouteResult> {
  const url = new URL("/api/geoapify/route", window.location.origin);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pickup, dropoff }),
  });
  if (!res.ok) {
    throw new Error(`Geo request failed (${res.status})`);
  }
  const data = (await res.json()) as { result: RouteResult };
  return data.result;
}
