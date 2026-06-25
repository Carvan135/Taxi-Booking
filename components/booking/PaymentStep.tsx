"use client";

import { Elements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { BookingSummaryCard } from "@/components/booking/BookingSummaryCard";
import {
  PaymentCheckoutForm,
  stripeAppearance,
} from "@/components/booking/PaymentCheckoutForm";
import { buildQuoteTripFromSession } from "@/lib/booking/build-quote-trip";
import { buildPaymentTripFingerprint } from "@/lib/booking/payment-trip-fingerprint";
import {
  clearPaymentSession,
  loadPaymentSession,
  savePaymentSession,
} from "@/lib/booking/payment-session-storage";
import { logQuoteSummaryClient, quoteDebugLogClient } from "@/lib/booking/quote-debug";
import { quoteToDisplayBreakdown } from "@/lib/booking/quote";
import type { BookingPriceBreakdown } from "@/lib/booking/pricing";
import type { BookingQuote } from "@/lib/booking/quote";
import { loadTaxibookBooking, type TaxibookBookingSession } from "@/lib/booking/session";
import { getStripePromise, resolveStripeClient } from "@/lib/stripe/load-stripe-client";
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
  reused?: boolean;
  publishable_key?: string | null;
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
  const [intentGeneration, setIntentGeneration] = useState(0);
  const [stripeClient, setStripeClient] = useState<Stripe | null | undefined>(
    undefined,
  );
  const [elementsStripe, setElementsStripe] = useState<
    Promise<Stripe | null> | null
  >(null);

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
    void getStripePromise().then((stripe) => {
      setStripeClient(stripe);
      if (stripe) {
        setElementsStripe(getStripePromise());
      }
    });
  }, []);

  const setupPayment = useCallback(async () => {
    if (!trip?.selected_operator) return;

    const operator = trip.selected_operator;
    const quoteTrip = buildQuoteTripFromSession(trip);
    if (!quoteTrip) {
      setSetupError(
        "Route details are missing. Please go back and complete your trip.",
      );
      return;
    }

    const fingerprint = buildPaymentTripFingerprint(
      operator.operator_id,
      quoteTrip,
    );
    const stored = loadPaymentSession();
    const reuseId =
      stored?.trip_fingerprint === fingerprint &&
      stored.operator_id === operator.operator_id
        ? stored.payment_intent_id
        : undefined;

    const supersedeId =
      stored && stored.trip_fingerprint !== fingerprint
        ? stored.payment_intent_id
        : undefined;

    setIsLoadingIntent(true);
    setSetupError(null);

    try {
      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_id: operator.operator_id,
          trip: quoteTrip,
          reuse_payment_intent_id: reuseId,
          supersede_payment_intent_id: supersedeId,
        }),
      });

      const body = (await res.json()) as PaymentIntentResponse & {
        error?: string;
        details?: { code?: string };
      };

      if (!res.ok) {
        throw new Error(body.error ?? "Could not start payment");
      }

      if (!body.client_secret?.trim() || !body.payment_intent_id?.trim()) {
        throw new Error("Payment setup returned an invalid response.");
      }

      setClientSecret(body.client_secret);
      setPaymentIntentId(body.payment_intent_id);
      setStripeReady(body.stripe_ready);
      setPricing(quoteToDisplayBreakdown(body.quote));

      const stripe = await resolveStripeClient(body.publishable_key);
      setStripeClient(stripe);
      if (stripe) {
        setElementsStripe(getStripePromise());
      } else {
        setElementsStripe(null);
      }

      savePaymentSession({
        payment_intent_id: body.payment_intent_id,
        client_secret: body.client_secret,
        trip_fingerprint: fingerprint,
        operator_id: operator.operator_id,
        total: body.total,
        created_at: new Date().toISOString(),
      });

      quoteDebugLogClient(
        `payment intent for ${operator.business_name} — server calculation:`,
      );
      logQuoteSummaryClient(`Payment: ${operator.business_name}`, body.quote);
    } catch (err) {
      setSetupError(
        err instanceof Error ? err.message : "Payment setup failed",
      );
    } finally {
      setIsLoadingIntent(false);
    }
  }, [trip]);

  useEffect(() => {
    void setupPayment();
  }, [setupPayment, intentGeneration]);

  const refreshPaymentIntent = useCallback(() => {
    const stored = loadPaymentSession();
    if (stored) {
      clearPaymentSession();
    }
    setClientSecret(null);
    setPaymentIntentId(null);
    setPricing(null);
    setIntentGeneration((n) => n + 1);
  }, []);

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

  const stripeConfigError =
    stripeClient === null
      ? "Stripe payment is not configured on this site. Add STRIPE_PUBLISHABLE_KEY (or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) to your Cloudflare environment and redeploy."
      : null;

  const paymentReady =
    Boolean(
      pricing &&
        clientSecret &&
        paymentIntentId &&
        elementsOptions &&
        elementsStripe &&
        stripeClient,
    ) && !stripeConfigError;

  const showIntentFailure =
    !isLoadingIntent &&
    !setupError &&
    !stripeConfigError &&
    stripeClient !== undefined &&
    !paymentReady &&
    trip?.selected_operator;

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
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSetupError(null);
                refreshPaymentIntent();
              }}
              className="font-semibold text-secondary hover:underline"
            >
              Try again
            </button>
            <Link href="/operators" className="font-semibold text-secondary hover:underline">
              ← Back to operators
            </Link>
          </div>
        </div>
      ) : null}

      {stripeConfigError ? (
        <div className="mx-auto mt-8 max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm text-amber-950">
          {stripeConfigError}
        </div>
      ) : null}


      {(isLoadingIntent || stripeClient === undefined) && !clientSecret ? (
        <p className="mt-10 text-center text-sm text-content/60">
          Preparing secure payment…
        </p>
      ) : null}

      {showIntentFailure ? (
        <div className="mx-auto mt-8 max-w-lg rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-800">
          Could not load the payment form. Please try again.
          <div className="mt-3">
            <button
              type="button"
              onClick={() => refreshPaymentIntent()}
              className="font-semibold text-secondary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {paymentReady && elementsOptions && elementsStripe ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <BookingSummaryCard trip={trip} operator={operator} pricing={pricing!} />
          <Elements
            stripe={elementsStripe}
            options={elementsOptions}
            key={paymentIntentId}
          >
            <PaymentCheckoutForm
              trip={trip}
              pricing={pricing!}
              paymentIntentId={paymentIntentId!}
              profile={profile}
              isAuthenticated={isAuthenticated}
              stripeReady={stripeReady}
              onPriceMismatch={refreshPaymentIntent}
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
