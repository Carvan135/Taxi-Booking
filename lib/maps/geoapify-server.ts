/**
 * Geoapify server helpers for driving routes.
 * Uses GEOAPIFY_API_KEY (preferred) or NEXT_PUBLIC_GEOAPIFY_API_KEY (fallback).
 */

import { getGeoapifyApiKey } from "@/lib/env/geoapify";
import type { GeoPlace, RouteResult } from "@/lib/maps/types";

export type { GeoPlace, RouteResult } from "@/lib/maps/types";

const GEOAPIFY_BASE = "https://api.geoapify.com/v1";

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

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${GEOAPIFY_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("apiKey", getApiKey());
  return url.toString();
}

async function fetchGeoapify<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geoapify request failed (${res.status})`);
  }
  return (await res.json()) as T;
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
