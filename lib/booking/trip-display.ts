import type {
  BookingPlace,
  BookingRoute,
  TaxibookBookingSession,
} from "@/lib/booking/booking-session-types";

export function tripPickupLabel(trip: TaxibookBookingSession): string {
  return trip.pickup?.label ?? trip.pickup_address;
}

export function tripDropoffLabel(trip: TaxibookBookingSession): string {
  return trip.dropoff?.label ?? trip.dropoff_address;
}

/** Legacy sessions may still store distanceKm from before the miles migration. */
function routeDistanceMiles(route: BookingRoute): number | null {
  if (typeof route.distanceMiles === "number") {
    return route.distanceMiles;
  }
  const legacyKm = (route as { distanceKm?: number }).distanceKm;
  if (typeof legacyKm === "number") {
    return Math.round(legacyKm * 0.621371 * 10) / 10;
  }
  return null;
}

export function formatRouteSummary(route: BookingRoute | undefined): string | null {
  if (!route) return null;
  const miles = routeDistanceMiles(route);
  if (miles == null) return null;
  return `~${miles.toFixed(1)} miles · ~${route.durationMinutes} min`;
}

export function addressDetailLabel(
  place: BookingPlace | undefined,
  fallback: string,
): string {
  return place?.label ?? fallback;
}
