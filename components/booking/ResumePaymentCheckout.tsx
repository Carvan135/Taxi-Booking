"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stripeAppearance } from "@/components/booking/PaymentCheckoutForm";
import { buildCreateBodyFromBooking } from "@/lib/booking/build-create-body-from-booking";
import {
  finalizeBookingAfterPayment,
  pollPaymentIntentStatus,
  tryFinalizeFromSucceededIntent,
} from "@/lib/booking/payment-finalize-client";
import {
  clearTaxibookBooking,
  saveConfirmationReference,
  saveTaxibookGuestSession,
} from "@/lib/booking/session";
import { stripePromise } from "@/lib/stripe/client";
import type { Booking } from "@/types";

type ResumePaymentCheckoutProps = {
  booking: Booking;
  guestEmail?: string;
  backHref: string;
  /** Logged-in customer — skip email verification and auto-start Stripe session. */
  isAuthenticated?: boolean;
};

type ResumePaymentResponse = {
  client_secret: string;
  payment_intent_id: string;
  total: number;
  platform_fee: number;
  operator_payout: number;
  booking_reference: string;
  reused?: boolean;
  error?: string;
};

export function ResumePaymentCheckout({
  booking,
  guestEmail,
  backHref,
  isAuthenticated = false,
}: ResumePaymentCheckoutProps) {
  const skipEmailGate = isAuthenticated || Boolean(guestEmail);
  const [email, setEmail] = useState(
    guestEmail ?? booking.customer_email ?? "",
  );
  const [emailVerified, setEmailVerified] = useState(skipEmailGate);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [session, setSession] = useState<{
    payment_intent_id: string;
    total: number;
    platform_fee: number;
    operator_payout: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);

  const startPaymentSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/resume-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_email: isAuthenticated ? undefined : email.trim(),
        }),
      });
      const body = (await res.json()) as ResumePaymentResponse;
      if (!res.ok) {
        throw new Error(body.error ?? "Could not start payment");
      }
      setClientSecret(body.client_secret);
      setSession({
        payment_intent_id: body.payment_intent_id,
        total: body.total,
        platform_fee: body.platform_fee,
        operator_payout: body.operator_payout,
      });
      setEmailVerified(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setLoading(false);
    }
  }, [booking.id, email, isAuthenticated]);

  useEffect(() => {
    if (!skipEmailGate || sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    void startPaymentSession();
  }, [skipEmailGate, startPaymentSession]);

  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? { clientSecret, appearance: stripeAppearance }
        : undefined,
    [clientSecret],
  );

  if (!emailVerified) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">Verify your email</h2>
        <p className="mt-1 text-sm text-content/70">
          Enter the email you used for booking #{booking.reference}.
        </p>
        <label className="mt-4 block text-sm font-medium text-content" htmlFor="resume-email">
          Email
        </label>
        <input
          id="resume-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={loading || !email.trim()}
          onClick={() => void startPaymentSession()}
          className="mt-4 w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
        >
          {loading ? "Loading…" : "Continue to payment"}
        </button>
        <p className="mt-4 text-center">
          <Link href={backHref} className="text-sm text-secondary hover:underline">
            ← Back
          </Link>
        </p>
      </div>
    );
  }

  if (!clientSecret || !session || !elementsOptions || !stripePromise) {
    return (
      <p className="py-8 text-center text-sm text-content/60">
        Preparing secure payment…
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-primary">Complete payment</h2>
      <p className="mt-1 text-sm text-content/70">
        Booking #{booking.reference} ·{" "}
        <span className="font-semibold text-primary">
          £{session.total.toFixed(2)}
        </span>
      </p>

      <Elements stripe={stripePromise} options={elementsOptions} key={session.payment_intent_id}>
        <ResumePaymentFormInner
          booking={booking}
          email={email}
          session={session}
          error={error}
          setError={setError}
          isAuthenticated={isAuthenticated}
        />
      </Elements>

      <p className="mt-4 text-center">
        <Link href={backHref} className="text-sm text-secondary hover:underline">
          ← Back
        </Link>
      </p>
    </div>
  );
}

function ResumePaymentFormInner({
  booking,
  email,
  session,
  error,
  setError,
  isAuthenticated,
}: {
  booking: Booking;
  email: string;
  session: {
    payment_intent_id: string;
    total: number;
    platform_fee: number;
    operator_payout: number;
  };
  error: string | null;
  setError: (v: string | null) => void;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const recoveryAttemptedRef = useRef(false);

  const buildBody = useCallback(
    () =>
      buildCreateBodyFromBooking(booking, session.payment_intent_id, {
        price: session.total,
        platform_fee: session.platform_fee,
        operator_payout: session.operator_payout,
      }, email),
    [booking, session, email],
  );

  const finishBooking = useCallback(async () => {
    const body = buildBody();
    const result = await finalizeBookingAfterPayment(body);

    if (!result.ok) {
      throw new Error(result.error ?? "Could not confirm booking");
    }

    const reference = result.booking_reference ?? booking.reference;
    if (!isAuthenticated && !booking.customer_id && result.booking_id) {
      saveTaxibookGuestSession({
        bookingId: result.booking_id,
        email: email.trim() || booking.customer_email,
        reference,
      });
    }
    saveConfirmationReference(reference);
    clearTaxibookBooking();
    router.push(`/confirmation?ref=${encodeURIComponent(reference)}`);
  }, [buildBody, booking, email, isAuthenticated, router]);

  useEffect(() => {
    if (recoveryAttemptedRef.current) return;
    recoveryAttemptedRef.current = true;

    void (async () => {
      const status = await pollPaymentIntentStatus(session.payment_intent_id);
      if (!status?.can_finalize) return;
      try {
        const result = await tryFinalizeFromSucceededIntent(buildBody());
        if (result.ok && result.booking_reference) {
          await finishBooking();
        }
      } catch {
        /* manual pay */
      }
    })();
  }, [session.payment_intent_id, buildBody, finishBooking]);

  async function handlePay() {
    if (!stripe || !elements) {
      setError("Payment is still loading.");
      return;
    }
    setPaying(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message ?? "Payment failed");
      setPaying(false);
      return;
    }

    try {
      await finishBooking();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm booking");
      setPaying(false);
    }
  }

  return (
    <>
      <div className="mt-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!stripe || !elements || paying}
        onClick={() => void handlePay()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
      >
        {paying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Processing…
          </>
        ) : (
          "Pay now"
        )}
      </button>
    </>
  );
}
