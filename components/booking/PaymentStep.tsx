"use client";

import { Elements } from "@stripe/react-stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { BookingSummaryCard } from "@/components/booking/BookingSummaryCard";
import {
  PaymentCheckoutForm,
  stripeAppearance,
} from "@/components/booking/PaymentCheckoutForm";
import { buildQuoteTripFromSession } from "@/lib/booking/build-quote-trip";
import { logQuoteSummaryClient, quoteDebugLogClient } from "@/lib/booking/quote-debug";
import { quoteToDisplayBreakdown } from "@/lib/booking/quote";
import type { BookingPriceBreakdown } from "@/lib/booking/pricing";
import type { BookingQuote } from "@/lib/booking/quote";
import { loadTaxibookBooking, type TaxibookBookingSession } from "@/lib/booking/session";
import { stripePromise } from "@/lib/stripe/client";
import { useProfile } from "@/hooks/queries/useProfile";
import { createClient } from "@/lib/supabase/client";

type PaymentIntentResponse = {
  client_secret: string;
  payment_intent_id: string;
  platform_fee: number;
  operator_payout: number;
  total: number;
  commission_percentage: number;
  stripe_ready: boolean;
  quote: BookingQuote;
};

export function PaymentStep() {
  const router = useRouter();
  const [trip, setTrip] = useState<TaxibookBookingSession | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<BookingPriceBreakdown | null>(null);
  const [stripeReady, setStripeReady] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isLoadingIntent, setIsLoadingIntent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data: profile } = useProfile();

  useEffect(() => {
    const stored = loadTaxibookBooking();
    if (!stored) {
      router.replace("/book");
      return;
    }
    if (!stored.selected_operator) {
      router.replace("/operators");
      return;
    }
    setTrip(stored);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

  useEffect(() => {
    if (!trip?.selected_operator) return;

    const operator = trip.selected_operator;
    const quoteTrip = buildQuoteTripFromSession(trip);
    if (!quoteTrip) {
      setSetupError(
        "Route details are missing. Please go back and complete your trip.",
      );
      return;
    }

    let cancelled = false;
    setIsLoadingIntent(true);
    setSetupError(null);

    void fetch("/api/stripe/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operator_id: operator.operator_id,
        trip: quoteTrip,
      }),
    })
      .then(async (res) => {
        const body = (await res.json()) as PaymentIntentResponse & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? "Could not start payment");
        }
        if (!cancelled) {
          setClientSecret(body.client_secret);
          setPaymentIntentId(body.payment_intent_id);
          setStripeReady(body.stripe_ready);
          setPricing(quoteToDisplayBreakdown(body.quote));
          quoteDebugLogClient(
            `payment intent for ${operator.business_name} — server calculation:`,
          );
          logQuoteSummaryClient(
            `Payment: ${operator.business_name}`,
            body.quote,
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSetupError(
            err instanceof Error ? err.message : "Payment setup failed",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingIntent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trip]);

  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: stripeAppearance,
          }
        : undefined,
    [clientSecret],
  );

  if (!trip?.selected_operator) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-content/60">
        Loading payment…
      </div>
    );
  }

  const operator = trip.selected_operator;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <BookingStepper currentStep={3} />

      <h1 className="text-center text-xl font-semibold tracking-tight text-content sm:text-2xl">
        Payment
      </h1>
      <p className="mt-2 text-center text-sm text-content/70">
        Review your trip and complete your booking
      </p>

      {setupError ? (
        <div className="mx-auto mt-8 max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-800">
          {setupError}
          <div className="mt-3">
            <Link href="/operators" className="font-semibold text-secondary hover:underline">
              ← Back to operators
            </Link>
          </div>
        </div>
      ) : null}

      {isLoadingIntent && !clientSecret ? (
        <p className="mt-10 text-center text-sm text-content/60">
          Preparing secure payment…
        </p>
      ) : null}

      {pricing && clientSecret && paymentIntentId && elementsOptions && stripePromise ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <BookingSummaryCard trip={trip} operator={operator} pricing={pricing} />
          <Elements stripe={stripePromise} options={elementsOptions}>
            <PaymentCheckoutForm
              trip={trip}
              pricing={pricing}
              paymentIntentId={paymentIntentId}
              profile={profile}
              isAuthenticated={isAuthenticated}
              stripeReady={stripeReady}
            />
          </Elements>
        </div>
      ) : null}

      <p className="mt-8 text-center">
        <Link
          href="/operators"
          className="text-sm font-medium text-secondary hover:underline"
        >
          ← Back to operators
        </Link>
      </p>
    </div>
  );
}
