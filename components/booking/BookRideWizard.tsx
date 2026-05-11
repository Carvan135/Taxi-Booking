"use client";

import {
  ArrowRight,
  Car,
  Clock,
  CreditCard,
  Lock,
  Shield,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookingStepper } from "@/components/booking/BookingStepper";
import {
  BOOK_TRIP_INPUT_CLASS,
  BOOK_TRIP_PRIMARY_ACTION_CLASS,
  BookTripDetailsFields,
} from "@/components/booking/BookTripDetailsFields";
import {
  emptyTripDraft,
  type OperatorOption,
  type TripDraft,
} from "@/components/booking/types";

const MOCK_OPERATORS: OperatorOption[] = [
  {
    id: "1",
    name: "City Cabs",
    rating: 4.8,
    reviewCount: 342,
    vehicleType: "Sedan",
    etaMins: 5,
    priceGbp: 45,
  },
  {
    id: "2",
    name: "Express Taxi",
    rating: 4.6,
    reviewCount: 189,
    vehicleType: "SUV",
    etaMins: 8,
    priceGbp: 52,
  },
  {
    id: "3",
    name: "Premium Rides",
    rating: 4.9,
    reviewCount: 521,
    vehicleType: "Luxury Sedan",
    etaMins: 6,
    priceGbp: 68,
  },
];

function formatTripDateTime(trip: TripDraft): string {
  if (!trip.date && !trip.time) return "—";
  const d = trip.date || "—";
  const t = trip.time || "—";
  return `${d} at ${t}`;
}

export function BookRideWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [trip, setTrip] = useState<TripDraft>(emptyTripDraft);
  const [selectedOperator, setSelectedOperator] =
    useState<OperatorOption | null>(null);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  const tripSummaryLine = useMemo(
    () => formatTripDateTime(trip),
    [trip.date, trip.time],
  );

  const goQuotes = () => {
    if (!trip.from.trim() || !trip.to.trim()) {
      setStep1Error("Please enter both pickup and destination.");
      return;
    }
    if (!trip.date || !trip.time) {
      setStep1Error("Please choose pickup date and time.");
      return;
    }
    setStep1Error(null);
    setStep(2);
  };

  const selectOperator = (op: OperatorOption) => {
    setSelectedOperator(op);
    setStep(3);
  };

  const completePlaceholder = () => {
    router.push("/confirmation");
  };

  const shellMaxClass =
    step === 3
      ? "max-w-3xl lg:max-w-[52rem]"
      : step === 2
        ? "max-w-2xl"
        : "max-w-3xl";

  return (
    <div
      className={`mx-auto ${shellMaxClass} px-4 py-6 sm:px-6 sm:py-8`}
    >
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-300/40 sm:p-6 md:rounded-2xl md:p-7">
        <BookingStepper currentStep={step} />

        {step === 1 ? (
          <>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">
                Book your ride
              </h1>
              <p className="mt-1.5 text-sm text-content/70">
                Enter your trip details to find available operators
              </p>
            </div>

            <BookTripDetailsFields
              idPrefix="book"
              value={trip}
              onChange={(patch) => setTrip((t) => ({ ...t, ...patch }))}
              twoColumnFromTo
              tripToggleSize="default"
              dateLabel="Pickup Date"
              timeLabel="Pickup Time"
              error={step1Error}
              tripToggleWrapperClassName="mt-6"
              fieldsWrapperClassName="mt-6"
              action={
                <button
                  type="button"
                  onClick={goQuotes}
                  className={BOOK_TRIP_PRIMARY_ACTION_CLASS}
                >
                  Get quotes
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              }
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">
                Select an operator
              </h1>
              <p className="mt-1.5 text-sm text-content/70">
                Choose who you&apos;d like to drive with
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-content/60">
                Your trip
              </p>
              <dl className="mt-2.5 grid gap-1.5 text-sm sm:grid-cols-2 sm:gap-x-6 sm:gap-y-1.5">
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-content/55">From</dt>
                  <dd className="font-medium text-content">{trip.from}</dd>
                </div>
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-content/55">To</dt>
                  <dd className="font-medium text-content">{trip.to}</dd>
                </div>
                <div className="flex justify-between gap-4 sm:block sm:col-span-2">
                  <dt className="text-content/55">Date &amp; time</dt>
                  <dd className="font-medium text-content">
                    {tripSummaryLine}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-content/55">Passengers</dt>
                  <dd className="font-medium text-content">
                    {trip.passengers}{" "}
                    {trip.passengers === 1 ? "passenger" : "passengers"}
                  </dd>
                </div>
              </dl>
            </div>

            <ul className="mt-6 space-y-3">
              {MOCK_OPERATORS.map((op) => (
                <li
                  key={op.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-content">
                      {op.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 sm:text-sm">
                      <Star
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                        aria-hidden
                      />
                      <span className="font-semibold text-content">
                        {op.rating.toFixed(1)}
                      </span>
                      <span className="text-content/55">
                        ({op.reviewCount} reviews)
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-content/70 sm:text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Car className="h-4 w-4 text-secondary" aria-hidden />
                        {op.vehicleType}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4 text-secondary" aria-hidden />
                        ETA {op.etaMins} mins
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex shrink-0 flex-col items-stretch gap-2 border-t border-slate-100 pt-3 sm:mt-0 sm:w-36 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                    <div className="text-right sm:text-right">
                      <p className="text-xl font-bold text-secondary">
                        £{op.priceGbp.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-content/55">Est. price</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectOperator(op)}
                      className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:text-sm"
                    >
                      Select
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-6 text-sm font-medium text-secondary hover:underline"
            >
              ← Edit trip details
            </button>
          </>
        ) : null}

        {step === 3 && selectedOperator ? (
          <>
            <div className="text-center lg:text-left">
              <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">
                Payment
              </h1>
              <p className="mt-1.5 text-sm text-content/70">
                Review your details and complete your booking
              </p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-content/55">
                  Ride details
                </h2>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-content/55">Pickup</dt>
                    <dd className="max-w-[55%] text-right font-medium text-content">
                      {trip.from}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-content/55">Dropoff</dt>
                    <dd className="max-w-[55%] text-right font-medium text-content">
                      {trip.to}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-content/55">Date</dt>
                    <dd className="font-medium text-content">
                      {trip.date || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-content/55">Time</dt>
                    <dd className="font-medium text-content">
                      {trip.time || "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-content/55">
                    Operator
                  </h2>
                  <p className="mt-1.5 font-semibold text-content">
                    {selectedOperator.name}
                  </p>
                  <p className="mt-0.5 text-sm text-content/70">
                    {selectedOperator.vehicleType}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700 sm:text-sm">
                    <Star
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                      aria-hidden
                    />
                    {selectedOperator.rating.toFixed(1)} ★ (
                    {selectedOperator.reviewCount} reviews)
                  </p>
                </div>

                <div className="mt-4 rounded-lg bg-secondary px-3 py-3 text-secondary-foreground sm:px-4">
                  <p className="text-[10px] font-medium uppercase opacity-90">
                    Total
                  </p>
                  <p className="text-2xl font-bold tracking-tight">
                    £{selectedOperator.priceGbp.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2.5">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  <p className="text-xs font-medium text-emerald-900 sm:text-sm">
                    Secure payment powered by Stripe Connect
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium text-content">
                      Full name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      defaultValue=""
                      className={BOOK_TRIP_INPUT_CLASS}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-content">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      className={BOOK_TRIP_INPUT_CLASS}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-content">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      placeholder="+44 7700 900000"
                      className={BOOK_TRIP_INPUT_CLASS}
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-content">
                      Cardholder name
                    </label>
                    <input type="text" className={BOOK_TRIP_INPUT_CLASS} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-content">
                      Card number
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="4242 4242 4242 4242"
                      className={BOOK_TRIP_INPUT_CLASS}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-content">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className={BOOK_TRIP_INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-content">
                        CVV
                      </label>
                      <input type="text" className={BOOK_TRIP_INPUT_CLASS} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-2.5 text-xs text-content/80 sm:text-sm">
                  This is a placeholder payment form. In production, this would
                  integrate with Stripe Connect for secure payment processing.
                </div>

                <button
                  type="button"
                  onClick={completePlaceholder}
                  className={`${BOOK_TRIP_PRIMARY_ACTION_CLASS} mt-4`}
                >
                  Complete payment
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-t border-slate-100 pt-4 text-[11px] text-emerald-800 sm:gap-5 sm:text-xs">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" aria-hidden />
                    Secure payment
                  </span>
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" aria-hidden />
                    SSL encrypted
                  </span>
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" aria-hidden />
                    PCI compliant
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-6 text-sm font-medium text-secondary hover:underline"
            >
              ← Back to operators
            </button>
          </>
        ) : null}
      </div>

      <p className="mt-4 text-center text-xs text-content/55">
        Prices shown are estimates. Final fare may vary based on traffic and
        route.
      </p>
      <p className="mt-1.5 text-center text-xs text-content/55">
        Need help?{" "}
        <Link href="/#contact" className="font-medium text-secondary hover:underline">
          Contact us
        </Link>
      </p>
    </div>
  );
}
