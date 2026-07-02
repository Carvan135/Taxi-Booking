import { isGooglePlacesConfiguredAsync } from "@/lib/env/google-places";
import { autocomplete as geoapifyAutocomplete } from "@/lib/maps/geoapify-server";
import { geocode as geoapifyGeocode } from "@/lib/maps/geoapify-server";
import {
  googleGeocode,
  googlePlacesAutocomplete,
} from "@/lib/maps/google-places-server";
import { logGooglePlacesServerError } from "@/lib/maps/places-debug";
import type { AddressProvider } from "@/lib/maps/places-debug";
import type { GeoPlace } from "@/lib/maps/types";

export type { AddressProvider } from "@/lib/maps/places-debug";

export type AddressAutocompleteResult = {
  places: GeoPlace[];
  provider: AddressProvider;
  /** Set when Google is configured but we fell back to Geoapify. */
  googleFailure?: string;
};

/** Address suggestions: Google Places first, Geoapify fallback. */
export async function addressAutocomplete(
  query: string,
): Promise<AddressAutocompleteResult> {
  const text = query.trim();
  if (text.length < 2) {
    return { places: [], provider: "none" };
  }

  if (await isGooglePlacesConfiguredAsync()) {
    try {
      const places = await googlePlacesAutocomplete(text);
      if (places.length > 0) {
        return { places, provider: "google" };
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message.slice(0, 200) : "google_autocomplete_failed";
      logGooglePlacesServerError("autocomplete", {
        query: text,
        googleFailure: message,
        err,
      });
      const places = await geoapifyAutocomplete(text);
      return {
        places,
        provider: places.length > 0 ? "geoapify" : "none",
        googleFailure: message,
      };
    }

    logGooglePlacesServerError("autocomplete", {
      query: text,
      googleFailure: "empty_results",
    });
    const places = await geoapifyAutocomplete(text);
    return {
      places,
      provider: places.length > 0 ? "geoapify" : "none",
      googleFailure: "empty_results",
    };
  }

  const places = await geoapifyAutocomplete(text);
  return { places, provider: places.length > 0 ? "geoapify" : "none" };
}

export type AddressGeocodeResult = {
  place: GeoPlace | null;
  provider: AddressProvider;
  googleFailure?: string;
};

/** Geocode free-text address: Google Places first, Geoapify fallback. */
export async function addressGeocode(text: string): Promise<AddressGeocodeResult> {
  const query = text.trim();
  if (query.length < 3) {
    return { place: null, provider: "none" };
  }

  if (await isGooglePlacesConfiguredAsync()) {
    try {
      const place = await googleGeocode(query);
      if (place) {
        return { place, provider: "google" };
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message.slice(0, 200) : "google_geocode_failed";
      logGooglePlacesServerError("geocode", {
        query,
        googleFailure: message,
        err,
      });
      const place = await geoapifyGeocode(query);
      return {
        place,
        provider: place ? "geoapify" : "none",
        googleFailure: message,
      };
    }

    logGooglePlacesServerError("geocode", {
      query,
      googleFailure: "empty_results",
    });
    const place = await geoapifyGeocode(query);
    return {
      place,
      provider: place ? "geoapify" : "none",
      googleFailure: "empty_results",
    };
  }

  const place = await geoapifyGeocode(query);
  return { place, provider: place ? "geoapify" : "none" };
}
