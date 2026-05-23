import type { QuoteRequestTrip } from "@/lib/booking/quote-server";

/** Stable key for reusing a payment session for the same trip + operator. */
export function buildPaymentTripFingerprint(
  operatorId: string,
  trip: QuoteRequestTrip,
): string {
  return JSON.stringify({
    operatorId,
    booking_type: trip.booking_type,
    pickup_date: trip.pickup_date,
    pickup_time: trip.pickup_time,
    return_date: trip.return_date ?? null,
    return_time: trip.return_time ?? null,
    route: trip.route,
    pickup_is_airport: trip.pickup_is_airport,
    dropoff_is_airport: trip.dropoff_is_airport,
  });
}
