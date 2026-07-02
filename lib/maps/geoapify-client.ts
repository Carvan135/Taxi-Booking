export type { GeoPlace, RouteResult } from "@/lib/maps/types";

import type { GeoPlace, RouteResult } from "@/lib/maps/types";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`Geo request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function autocomplete(query: string): Promise<GeoPlace[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  const url = new URL("/api/places/autocomplete", window.location.origin);
  url.searchParams.set("text", text);
  const data = await fetchJson<{ places: GeoPlace[] }>(url);
  return data.places ?? [];
}

export async function resolvePlaceSuggestion(placeId: string): Promise<GeoPlace> {
  const url = new URL("/api/places/resolve-address", window.location.origin);
  url.searchParams.set("id", placeId);
  const data = await fetchJson<{ place: GeoPlace | null; error?: string }>(url);
  if (!data.place) {
    throw new Error(data.error ?? "Could not resolve address");
  }
  return data.place;
}

export async function geocode(text: string): Promise<GeoPlace | null> {
  const query = text.trim();
  if (query.length < 3) return null;
  const url = new URL("/api/places/geocode", window.location.origin);
  url.searchParams.set("text", query);
  const data = await fetchJson<{ place: GeoPlace | null }>(url);
  return data.place ?? null;
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
