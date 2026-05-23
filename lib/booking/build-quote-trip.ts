import type { TaxibookBookingSession } from "@/lib/booking/booking-session-types";
import type { QuoteRequestTrip } from "@/lib/booking/quote-server";

export function buildQuoteTripFromSession(
  trip: TaxibookBookingSession,
): QuoteRequestTrip | null {
  if (!trip.route) return null;

  return {
    booking_type: trip.booking_type,
    route: trip.route,
    pickup_date: trip.pickup_date,
    pickup_time: trip.pickup_time,
    return_date: trip.return_date,
    return_time: trip.return_time,
    pickup_is_airport: trip.pickup?.isAirport ?? false,
    dropoff_is_airport: trip.dropoff?.isAirport ?? false,
  };
}
