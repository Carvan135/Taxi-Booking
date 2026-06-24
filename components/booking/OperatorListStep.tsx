"use client";

import { Car, Clock, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { buildQuoteTripFromSession } from "@/lib/booking/build-quote-trip";
import { logQuoteSummaryClient, quoteDebugLogClient } from "@/lib/booking/quote-debug";
import type { BookingQuote } from "@/lib/booking/quote";
import { OperatorCardSkeleton } from "@/components/booking/OperatorCardSkeleton";
import { TripLocationBadges } from "@/components/booking/TripLocationBadges";
import {
  formatRouteSummary,
  tripDropoffLabel,
  tripPickupLabel,
} from "@/lib/booking/trip-display";
import { useApprovedOperators } from "@/hooks/queries/useOperators";
import {
  loadTaxibookBooking,
  patchTaxibookBooking,
  type TaxibookBookingSession,
} from "@/lib/booking/session";
import { formatFleetVehicleTypesDisplay } from "@/lib/operator/fleet-vehicle-types";
import type { OperatorListItem } from "@/types";

const SERVICE_LABELS: Record<TaxibookBookingSession["service_type"], string> = {
  standard: "Standard",
  executive: "Executive",
  van: "Van",
  suv: "SUV",
};

function formatGbp(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function formatDateTime(date: string, time: string): string {
  return `${date} at ${time}`;
}

export function OperatorListStep() {
  const router = useRouter();
  const [trip, setTrip] = useState<TaxibookBookingSession | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, BookingQuote>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadTaxibookBooking();
    if (!stored) {
      router.replace("/book");
      return;
    }
    setTrip(stored);
    setHighlightedId(stored.selected_operator?.operator_id ?? null);
  }, [router]);

  const {
    data: operators = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useApprovedOperators(trip?.service_type);

  const quoteTrip = useMemo(
    () => (trip ? buildQuoteTripFromSession(trip) : null),
    [trip],
  );

  useEffect(() => {
    if (!trip || !quoteTrip) {
      setQuotes({});
      return;
    }

    let cancelled = false;
    setQuotesLoading(true);
    setQuotesError(null);

    void fetch("/api/booking/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_type: trip.service_type,
        trip: quoteTrip,
      }),
    })
      .then(async (res) => {
        const body = (await res.json()) as {
          quotes?: Record<string, BookingQuote>;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? "Could not load price estimates");
        }
        if (!cancelled) {
          const nextQuotes = body.quotes ?? {};
          setQuotes(nextQuotes);
          quoteDebugLogClient("quotes loaded — see terminal running `npm run dev` for step-by-step server logs");
          for (const op of operators) {
            const q = nextQuotes[op.id];
            if (q) {
              logQuoteSummaryClient(`${op.business_name} (${op.id})`, q);
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuotes({});
          setQuotesError(
            err instanceof Error ? err.message : "Could not load price estimates",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trip, quoteTrip, operators]);

  const handleSelect = (operator: OperatorListItem) => {
    if (!trip) return;
    const quote = quotes[operator.id];
    if (!quote) return;

    setHighlightedId(operator.id);
    patchTaxibookBooking({
      selected_operator: {
        operator_id: operator.id,
        business_name: operator.business_name,
        vehicle_type: operator.vehicle_type,
        rating: operator.rating,
        total_reviews: operator.total_reviews,
        operator_subtotal: quote.operator_subtotal,
      },
    });
    router.push("/payment");
  };

  if (!trip) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-content/60">
        Loading your trip…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-7 lg:p-8">
        <BookingStepper currentStep={2} />

        <h1 className="text-center text-xl font-semibold tracking-tight text-content sm:text-2xl">
          Select an Operator
        </h1>

        <TripSummaryBar trip={trip} routeSummary={formatRouteSummary(trip.route)} />

        {!quoteTrip ? (
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Route details are missing.{" "}
            <Link href="/book" className="font-semibold text-secondary hover:underline">
              Re-enter your trip
            </Link>{" "}
            to see accurate prices.
          </p>
        ) : null}

        {quotesError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {quotesError}
          </p>
        ) : null}

        {isLoading || quotesLoading ? (
          <ul className="mt-6 space-y-4" aria-busy="true" aria-label="Loading operators">
            {Array.from({ length: 3 }).map((_, i) => (
              <OperatorCardSkeleton key={i} />
            ))}
          </ul>
        ) : null}

        {isError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center">
            <p className="text-sm text-red-800">
              {error instanceof Error ? error.message : "Could not load operators."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 text-sm font-semibold text-secondary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && operators.length === 0 ? (
          <EmptyOperatorsState />
        ) : null}

        {!isLoading && !isError && !quotesLoading && operators.length > 0 ? (
          <ul className="mt-6 space-y-4">
            {operators.map((operator) => (
              <OperatorCard
                key={operator.id}
                operator={operator}
                selected={highlightedId === operator.id}
                routeDurationMinutes={trip.route?.durationMinutes}
                quote={quotes[operator.id]}
                canSelect={Boolean(quotes[operator.id]) && Boolean(quoteTrip)}
                onSelect={() => handleSelect(operator)}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function TripSummaryBar({
  trip,
  routeSummary,
}: {
  trip: TaxibookBookingSession;
  routeSummary: string | null;
}) {
  return (
    <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-content">Your Trip Details</p>
        <Link
          href="/book"
          className="shrink-0 text-sm font-semibold text-secondary hover:underline"
        >
          Edit
        </Link>
      </div>
      <TripLocationBadges trip={trip} className="mt-3" />
      {routeSummary ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-content">
          <MapPin className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
          {routeSummary}
        </p>
      ) : null}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3">
        <SummaryItem label="From" value={tripPickupLabel(trip)} />
        <SummaryItem label="To" value={tripDropoffLabel(trip)} />
        <SummaryItem
          label="Date & Time"
          value={formatDateTime(trip.pickup_date, trip.pickup_time)}
        />
        <SummaryItem
          label="Passengers"
          value={`${trip.passengers} ${trip.passengers === 1 ? "passenger" : "passengers"}`}
        />
        <SummaryItem
          label="Service type"
          value={SERVICE_LABELS[trip.service_type]}
          className="sm:col-span-2"
        />
        {trip.booking_type === "return" && trip.return_date && trip.return_time ? (
          <SummaryItem
            label="Return"
            value={formatDateTime(trip.return_date, trip.return_time)}
            className="sm:col-span-2"
          />
        ) : null}
      </dl>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-content/55">{label}</dt>
      <dd className="mt-0.5 font-medium text-content">{value}</dd>
    </div>
  );
}

function OperatorRating({
  rating,
  totalReviews,
}: {
  rating: number;
  totalReviews: number;
}) {
  if (totalReviews === 0) {
    return (
      <span className="text-sm font-medium text-content/60">New Operator</span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star
        className="h-4 w-4 fill-amber-400 text-amber-400"
        aria-hidden
      />
      <span className="font-semibold text-content">{rating.toFixed(1)}</span>
      <span className="text-content/55">({totalReviews} reviews)</span>
    </span>
  );
}

function OperatorCard({
  operator,
  selected,
  routeDurationMinutes,
  quote,
  canSelect,
  onSelect,
}: {
  operator: OperatorListItem;
  selected: boolean;
  routeDurationMinutes?: number;
  quote?: BookingQuote;
  canSelect: boolean;
  onSelect: () => void;
}) {
  const etaLabel =
    routeDurationMinutes != null
      ? `~${routeDurationMinutes} min drive`
      : "~15–30 min";
  const subtitle =
    operator.business_description?.trim() ||
    `${operator.fleet_vehicle_count} vehicle${operator.fleet_vehicle_count === 1 ? "" : "s"} in fleet`;

  return (
    <li>
      <article
        className={`flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 ${
          selected
            ? "border-secondary ring-2 ring-secondary/20"
            : "border-slate-200 hover:border-secondary/40 hover:shadow-md"
        }`}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-content sm:text-xl">
            {operator.business_name}
          </h2>
          <p className="mt-0.5 text-sm text-content/55">{subtitle}</p>
          <div className="mt-2">
            <OperatorRating
              rating={operator.rating}
              totalReviews={operator.total_reviews}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-content/70">
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              {formatFleetVehicleTypesDisplay(operator)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              {etaLabel}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <div className="sm:text-right">
            {quote ? (
              <>
                <p className="text-2xl font-bold text-secondary">
                  {formatGbp(quote.total)}
                </p>
                <p className="text-xs text-content/55">
                  Estimated total (incl. platform fee)
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-content/50">Price unavailable</p>
                <p className="text-xs text-content/45">Pricing not configured</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onSelect}
            disabled={!canSelect}
            className="rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-secondary-foreground shadow-md shadow-secondary/20 transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select
          </button>
        </div>
      </article>
    </li>
  );
}

function EmptyOperatorsState() {
  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="text-base font-medium text-content">
        No operators available for this service type
      </p>
      <p className="mt-2 text-sm text-content/60">
        Try a different service type or adjust your journey details.
      </p>
      <Link
        href="/book"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground shadow-md transition hover:bg-blue-600"
      >
        Change Journey Details
      </Link>
    </div>
  );
}
