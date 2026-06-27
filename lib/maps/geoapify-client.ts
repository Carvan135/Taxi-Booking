export type { GeoPlace, PlaceSuggestion, RouteResult } from "@/lib/maps/types";
export { autocomplete, geocode, getPlaceDetails } from "@/lib/maps/places-client";

import type { GeoPlace, RouteResult } from "@/lib/maps/types";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`Geo request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function route(
  pickup: Pick<GeoPlace, "lat" | "lng">,
  dropoff: Pick<GeoPlace, "lat" | "lng">,
): Promise<RouteResult> {
  const url = new URL("/api/geoapify/route", window.location.origin);
  const data = await fetchJson<{ result: RouteResult }>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pickup, dropoff }),
  });
  return data.result;
}
