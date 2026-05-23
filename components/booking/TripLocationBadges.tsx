import type { TaxibookBookingSession } from "@/lib/booking/booking-session-types";

type TripLocationBadgesProps = {
  trip: TaxibookBookingSession;
  className?: string;
};

export function TripLocationBadges({ trip, className = "" }: TripLocationBadgesProps) {
  const showPickup = trip.pickup?.isAirport;
  const showDropoff = trip.dropoff?.isAirport;

  if (!showPickup && !showDropoff) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {showPickup ? <AirportBadge label="Airport Pickup" /> : null}
      {showDropoff ? <AirportBadge label="Airport Dropoff" /> : null}
    </div>
  );
}

function AirportBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
      {label}
    </span>
  );
}
