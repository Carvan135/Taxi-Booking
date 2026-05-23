import { route, type GeoPlace } from "@/lib/maps/geoapify";
import type { BookingRoute } from "@/lib/booking/booking-session-types";

export type { BookingRoute };

/**
 * Calculate driving distance and duration between pickup and dropoff.
 */
export async function calculateTripDistance(
  pickup: Pick<GeoPlace, "lat" | "lng">,
  dropoff: Pick<GeoPlace, "lat" | "lng">,
): Promise<BookingRoute> {
  return route(pickup, dropoff);
}
