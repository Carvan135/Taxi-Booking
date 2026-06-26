import { Car, Luggage, MapPin, Star, Users } from "lucide-react";
import { formatBookingLuggage } from "@/lib/booking/luggage-display";
import { TripLocationBadges } from "@/components/booking/TripLocationBadges";
import type { BookingPriceBreakdown } from "@/lib/booking/pricing";
import {
  formatRouteSummary,
  tripDropoffLabel,
  tripPickupLabel,
} from "@/lib/booking/trip-display";
import { formatBookingVehicleType } from "@/lib/operator/fleet-vehicle-types";
import type { TaxibookBookingSession } from "@/lib/booking/session";
import type { SelectedOperatorSession } from "@/lib/booking/session";

type BookingSummaryCardProps = {
  trip: TaxibookBookingSession;
  operator: SelectedOperatorSession;
  pricing: BookingPriceBreakdown;
};

export function BookingSummaryCard({
  trip,
  operator,
  pricing,
}: BookingSummaryCardProps) {
  const quote = pricing.quote;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-primary">Booking Summary</h2>

      <TripLocationBadges trip={trip} className="mt-4" />
      {(() => {
        const routeSummary = formatRouteSummary(trip.route);
        return routeSummary ? (
          <p className="mt-3 text-sm font-medium text-content">{routeSummary}</p>
        ) : null;
      })()}

      <div className="mt-5 space-y-4 text-sm">
        <SummaryRow icon={MapPin} label="Pickup" value={tripPickupLabel(trip)} />
        <SummaryRow icon={MapPin} label="Dropoff" value={tripDropoffLabel(trip)} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-content/55">Date</p>
            <p className="mt-0.5 font-medium text-content">{trip.pickup_date}</p>
          </div>
          <div>
            <p className="text-content/55">Time</p>
            <p className="mt-0.5 font-medium text-content">{trip.pickup_time}</p>
          </div>
        </div>
        <SummaryRow
          icon={Users}
          label="Passengers"
          value={`${trip.passengers} ${trip.passengers === 1 ? "passenger" : "passengers"}`}
        />
        <SummaryRow
          icon={Car}
          label="Vehicle type"
          value={formatBookingVehicleType(trip.service_type)}
        />
        <SummaryRow
          icon={Luggage}
          label="Luggage"
          value={formatBookingLuggage(trip.luggage ?? 0)}
        />
      </div>

      <div className="my-5 border-t border-slate-200" />

      <div>
        <p className="text-sm font-bold text-primary">Operator Selected</p>
        <p className="mt-2 text-base font-semibold text-content">
          {operator.business_name}
        </p>
        <p className="mt-1 text-sm text-content/70">{operator.vehicle_type}</p>
        <p className="mt-2 flex items-center gap-1 text-sm">
          {operator.total_reviews === 0 ? (
            <span className="text-content/60">New Operator</span>
          ) : (
            <>
              <Star
                className="h-4 w-4 fill-amber-400 text-amber-400"
                aria-hidden
              />
              <span className="font-semibold text-content">
                {operator.rating.toFixed(1)}
              </span>
              <span className="text-content/55">
                ({operator.total_reviews} reviews)
              </span>
            </>
          )}
        </p>
      </div>

      <div className="my-5 border-t border-slate-200" />

      <dl className="space-y-2 text-sm">
        {quote
          ? quote.legs.map((leg) => (
              <div key={leg.label} className="space-y-1.5 border-b border-slate-100 pb-3">
                <p className="font-semibold text-content">{leg.label}</p>
                <PriceLine label="Base fare" amount={leg.base_fare} />
                <PriceLine label="Distance" amount={leg.distance_charge} />
                <PriceLine label="Time" amount={leg.time_charge} />
                {leg.after_minimum > leg.metered_subtotal ? (
                  <PriceLine
                    label="Minimum fare"
                    amount={leg.after_minimum}
                    hint={`Min £${leg.minimum_fare.toFixed(2)}`}
                  />
                ) : null}
                {leg.rules_applied.map((rule) => (
                  <PriceLine
                    key={`${leg.label}-${rule.rule_key}`}
                    label={rule.name}
                    amount={rule.impact}
                    signed
                  />
                ))}
                <PriceLine label="Leg total" amount={leg.leg_total} bold />
              </div>
            ))
          : pricing.legs.map((leg) => (
              <div key={leg.label} className="flex justify-between gap-2">
                <dt className="text-content/55">{leg.label}</dt>
                <dd className="font-medium text-content">
                  £{leg.baseFare.toFixed(2)}
                </dd>
              </div>
            ))}
        <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
          <dt className="text-content/55">Operator subtotal</dt>
          <dd className="font-medium text-content">
            £{pricing.baseFareTotal.toFixed(2)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-content/55">
            Platform fee ({pricing.platformFeePercent}%)
          </dt>
          <dd className="font-medium text-content">
            £{pricing.platformFee.toFixed(2)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-sky-50 px-4 py-3">
        <span className="font-semibold text-primary">Total Price</span>
        <span className="text-2xl font-bold text-secondary">
          £{pricing.total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function PriceLine({
  label,
  amount,
  bold,
  signed,
  hint,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  signed?: boolean;
  hint?: string;
}) {
  const prefix = signed && amount > 0 ? "+" : "";
  return (
    <div className="flex justify-between gap-2 pl-2">
      <dt className="text-content/55">
        {label}
        {hint ? (
          <span className="ml-1 text-xs text-content/45">({hint})</span>
        ) : null}
      </dt>
      <dd className={bold ? "font-semibold text-content" : "text-content/80"}>
        {prefix}£{amount.toFixed(2)}
      </dd>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
      <div>
        <p className="text-content/55">{label}</p>
        <p className="mt-0.5 font-medium text-content">{value}</p>
      </div>
    </div>
  );
}
