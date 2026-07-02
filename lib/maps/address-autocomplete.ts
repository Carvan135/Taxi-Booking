import { isGooglePlacesConfigured } from "@/lib/env/google-places";
import { autocomplete as geoapifyAutocomplete } from "@/lib/maps/geoapify-server";
import { geocode as geoapifyGeocode } from "@/lib/maps/geoapify-server";
import {
  googleGeocode,
  googlePlacesAutocomplete,
} from "@/lib/maps/google-places-server";
import type { GeoPlace } from "@/lib/maps/types";

/** Address suggestions: Google Places first, Geoapify fallback. */
export async function addressAutocomplete(query: string): Promise<GeoPlace[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  if (isGooglePlacesConfigured()) {
    try {
      const places = await googlePlacesAutocomplete(text);
      if (places.length > 0) {
        return places;
      }
    } catch (err) {
      console.error("Google Places autocomplete error:", err);
    }
  }

  return geoapifyAutocomplete(text);
}

/** Geocode free-text address: Google Places first, Geoapify fallback. */
export async function addressGeocode(text: string): Promise<GeoPlace | null> {
  const query = text.trim();
  if (query.length < 3) return null;

  if (isGooglePlacesConfigured()) {
    try {
      const place = await googleGeocode(query);
      if (place) return place;
    } catch (err) {
      console.error("Google Places geocode error:", err);
    }
  }

  return geoapifyGeocode(query);
}
