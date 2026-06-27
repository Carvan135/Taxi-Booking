import type { GeoPlace, PlaceSuggestion } from "@/lib/maps/types";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`Places request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function autocomplete(
  query: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  const url = new URL("/api/places/autocomplete", window.location.origin);
  url.searchParams.set("text", text);
  if (sessionToken) {
    url.searchParams.set("sessionToken", sessionToken);
  }
  const data = await fetchJson<{ suggestions: PlaceSuggestion[] }>(url);
  return data.suggestions ?? [];
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<GeoPlace | null> {
  const id = placeId.trim();
  if (!id) return null;
  const url = new URL("/api/places/details", window.location.origin);
  url.searchParams.set("placeId", id);
  if (sessionToken) {
    url.searchParams.set("sessionToken", sessionToken);
  }
  const data = await fetchJson<{ place: GeoPlace | null }>(url);
  return data.place ?? null;
}

export async function geocode(text: string): Promise<GeoPlace | null> {
  const query = text.trim();
  if (query.length < 3) return null;
  const url = new URL("/api/places/geocode", window.location.origin);
  url.searchParams.set("text", query);
  const data = await fetchJson<{ place: GeoPlace | null }>(url);
  return data.place ?? null;
}
