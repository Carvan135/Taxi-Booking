"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerSignInModal } from "@/components/auth/CustomerSignInModal";
import { PaymentTrustBadges } from "@/components/booking/PaymentTrustBadges";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import type { BookingPriceBreakdown } from "@/lib/booking/pricing";
import { clearPaymentSession } from "@/lib/booking/payment-session-storage";
import {
  clearTaxibookBooking,
  saveConfirmationReference,
  saveConfirmationSnapshot,
  saveTaxibookGuestSession,
  type TaxibookBookingSession,
} from "@/lib/booking/session";
import {
  finalizeBookingAfterPayment,
  pollPaymentIntentStatus,
  tryFinalizeFromSucceededIntent,
} from "@/lib/booking/payment-finalize-client";
import {
  logPaymentClientError,
  paymentUiError,
  PAYMENT_UI,
} from "@/lib/booking/payment-client-errors";
import type { CreateBookingBody } from "@/lib/booking/insert-pending-bookings";
import {
  guestDetailsSchema,
  type GuestDetailsFormInput,
} from "@/lib/validations/booking";
import type { Profile } from "@/types";

const stripeAppearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#2563EB",
    colorBackground: "#ffffff",
    colorText: "#1e293b",
    colorDanger: "#dc2626",
    borderRadius: "12px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

type PaymentCheckoutFormProps = {
  trip: TaxibookBookingSession;
  pricing: BookingPriceBreakdown;
  /** Authoritative totals from POST /api/stripe/payment-intent (avoids client/server drift). */
  serverPricing?: {
    total: number;
    platform_fee: number;
    operator_payout: number;
  };
  paymentIntentId: string;
  profile: Profile | null | undefined;
  isAuthenticated: boolean;
  stripeReady?: boolean;
  onPriceMismatch?: () => void;
  onAuthenticated?: () => void;
};

export function PaymentCheckoutForm({
  trip,
  pricing,
  serverPricing,
  paymentIntentId,
  profile,
  isAuthenticated,
  stripeReady = true,
  onPriceMismatch,
  onAuthenticated,
}: PaymentCheckoutFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const stripe = useStripe();
  const elements = useElements();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryAttemptedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors },
  } = useForm<GuestDetailsFormInput>({
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      customer_name: profile.full_name?.trim() ?? "",
      customer_email: profile.email,
      customer_phone: profile.phone?.trim() ?? "",
    });
  }, [profile, reset]);

  const buildCreateBody = useCallback(
    (customer: GuestDetailsFormInput): CreateBookingBody | null => {
      const operator = trip.selected_operator;
      if (!operator) return null;
      const total = serverPricing?.total ?? pricing.total;
      const platformFee = serverPricing?.platform_fee ?? pricing.platformFee;
      const operatorPayout =
        serverPricing?.operator_payout ?? pricing.baseFareTotal;
      return {
        payment_intent_id: paymentIntentId,
        operator_id: operator.operator_id,
        customer_name: customer.customer_name,
        customer_email: customer.customer_email,
        customer_phone: customer.customer_phone,
        booking_type: trip.booking_type,
        pickup_address: trip.pickup_address,
        dropoff_address: trip.dropoff_address,
        pickup_date: trip.pickup_date,
        pickup_time: trip.pickup_time,
        return_date: trip.return_date,
        return_time: trip.return_time,
        passengers: trip.passengers,
        service_type: trip.service_type,
        luggage: trip.luggage ?? 0,
        price: total,
        platform_fee: platformFee,
        operator_payout: operatorPayout,
        notes: trip.notes,
        customer_id: profile?.id ?? null,
      };
    },
    [trip, paymentIntentId, pricing, serverPricing, profile?.id],
  );

  const completeBooking = useCallback(
    async (customer: GuestDetailsFormInput) => {
      const body = buildCreateBody(customer);
      if (!body) throw new Error("No operator selected");

      let lastError: string | undefined;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await finalizeBookingAfterPayment(body);

        if (
          !result.ok &&
          result.details?.code === "amount_mismatch" &&
          onPriceMismatch
        ) {
          onPriceMismatch();
          throw new Error(
            "The price was updated. Please review the new total and pay again.",
          );
        }

        if (result.ok) {
          const reference = result.booking_reference ?? "";
          if (!isAuthenticated && result.booking_id) {
            saveTaxibookGuestSession({
              bookingId: result.booking_id,
              email: customer.customer_email,
              reference,
            });
          }

          saveConfirmationReference(reference);
          saveConfirmationSnapshot({
            reference,
            total: pricing.total,
            trip,
          });
          clearTaxibookBooking();
          clearPaymentSession();
          router.push(`/confirmation?ref=${encodeURIComponent(reference)}`);
          return;
        }

        lastError = result.error;
        logPaymentClientError("finalize booking failed", {
          attempt: attempt + 1,
          status: result.status,
          error: result.error,
          payment_succeeded: result.payment_succeeded,
          details: result.details,
        });
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
          const recovery = await tryFinalizeFromSucceededIntent(body);
          if (recovery.ok && recovery.booking_reference) {
            continue;
          }
        }
      }

      throw new Error(
        paymentUiError(lastError, PAYMENT_UI.bookingFailed),
      );
    },
    [
      buildCreateBody,
      isAuthenticated,
      onPriceMismatch,
      pricing.total,
      router,
      trip,
    ],
  );

  const saveDraft = useCallback(
    async (customer: GuestDetailsFormInput) => {
      const body = buildCreateBody(customer);
      if (!body) return false;

      const res = await fetch("/api/bookings/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resBody = (await res.json()) as {
        error?: string;
        details?: { code?: string };
        payment_already_complete?: boolean;
      };

      if (!res.ok) {
        logPaymentClientError("draft save failed", {
          status: res.status,
          error: resBody.error,
          details: resBody.details,
        });
        if (resBody.details?.code === "amount_mismatch" && onPriceMismatch) {
          onPriceMismatch();
          setPaymentError(
            "The price was updated. Please review the new total before paying.",
          );
          return false;
        }
        setPaymentError(
          paymentUiError(resBody.error, PAYMENT_UI.draftFailed),
        );
        return false;
      }

      if (resBody.payment_already_complete) {
        setDraftReady(true);
      }
      return true;
    },
    [buildCreateBody, onPriceMismatch],
  );

  useEffect(() => {
    if (recoveryAttemptedRef.current) return;
    recoveryAttemptedRef.current = true;

    void (async () => {
      const status = await pollPaymentIntentStatus(paymentIntentId);
      if (!status?.can_finalize) return;

      const parsed = guestDetailsSchema.safeParse(getValues());
      if (!parsed.success) return;

      const body = buildCreateBody(parsed.data);
      if (!body) return;

      try {
        const result = await tryFinalizeFromSucceededIntent(body);
        if (result.ok && result.booking_reference) {
          await completeBooking(parsed.data);
        }
      } catch {
        /* user can submit manually */
      }
    })();
  }, [paymentIntentId, buildCreateBody, getValues, completeBooking]);

  useEffect(() => {
    const subscription = watch((values) => {
      const parsed = guestDetailsSchema.safeParse(values);
      if (!parsed.success) {
        setDraftReady(false);
        return;
      }
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
      draftTimerRef.current = setTimeout(() => {
        setDraftSaving(true);
        void saveDraft(parsed.data).then((ok) => {
          setDraftReady(ok);
          setDraftSaving(false);
        });
      }, 500);
    });
    return () => {
      subscription.unsubscribe();
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [watch, saveDraft]);

  const onSubmit = handleSubmit(async (customer) => {
    if (!stripe || !elements) {
      setPaymentError("Payment is still loading. Please wait a moment.");
      return;
    }

    setPaymentError(null);

    if (!draftReady) {
      const ok = await saveDraft(customer);
      if (!ok) return;
      setDraftReady(true);
    }

    setIsPaying(true);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setPaymentError(
        submitError.message ?? "Payment failed. Please try again.",
      );
      setIsPaying(false);
      return;
    }

    try {
      await completeBooking(customer);
    } catch (err) {
      logPaymentClientError("complete booking error", {
        error: err instanceof Error ? err.message : err,
      });
      setPaymentError(
        err instanceof Error
          ? err.message
          : PAYMENT_UI.bookingFailed,
      );
      setIsPaying(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <h2 className="text-lg font-bold text-content">
            Customer Details &amp; Payment
          </h2>
          <p className="mt-0.5 text-xs text-content/55 sm:text-sm">
            Secure payment powered by Stripe Connect
          </p>
        </div>
      </div>

      {!isAuthenticated ? (
        <>
          <CustomerSignInModal
            open={signInOpen}
            onClose={() => setSignInOpen(false)}
            onSuccess={async () => {
              await queryClient.invalidateQueries({ queryKey: ["profile"] });
              onAuthenticated?.();
            }}
          />
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-content">Are you a customer?</p>
            <p className="mt-2 text-content/70">
              Continue as guest below, or{" "}
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="font-semibold text-secondary hover:underline"
              >
                sign in to your account
              </button>{" "}
              to pre-fill your details and see this booking in My bookings after
              payment.
            </p>
          </div>
        </>
      ) : null}

      <fieldset className="mt-6 space-y-4">
        <legend className="text-sm font-bold text-content">Your Details</legend>
        <div>
          <label htmlFor="customer_name" className="text-sm font-medium text-content">
            Full Name
          </label>
          <input
            id="customer_name"
            className={BOOK_TRIP_INPUT_CLASS}
            autoComplete="name"
            {...register("customer_name")}
          />
          {errors.customer_name?.message ? (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.customer_name.message}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="customer_email" className="text-sm font-medium text-content">
            Email Address
          </label>
          <input
            id="customer_email"
            type="email"
            className={BOOK_TRIP_INPUT_CLASS}
            autoComplete="email"
            {...register("customer_email")}
          />
          {errors.customer_email?.message ? (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.customer_email.message}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="customer_phone" className="text-sm font-medium text-content">
            Phone Number
          </label>
          <input
            id="customer_phone"
            type="tel"
            className={BOOK_TRIP_INPUT_CLASS}
            autoComplete="tel"
            placeholder="+44 7700 900000"
            {...register("customer_phone")}
          />
          {errors.customer_phone?.message ? (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {errors.customer_phone.message}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="mt-6 border-t border-slate-200 pt-6">
        <p className="text-sm font-bold text-content">Payment</p>
        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-2.5 text-xs font-medium text-sky-900 sm:text-sm">
          Most Secure Payment — your card details are encrypted by Stripe
        </div>
        {!stripeReady ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 sm:text-sm">
            Test mode: this operator is not fully connected to Stripe Connect yet.
            Payment is processed without a connected account transfer.
          </p>
        ) : null}
        <div className="mt-4">
          <PaymentElement
            options={{
              layout: "tabs",
            }}
          />
        </div>
        {paymentError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {paymentError}
          </p>
        ) : null}
      </div>

      {draftSaving ? (
        <p className="mt-4 text-center text-xs text-content/55">
          Saving your booking…
        </p>
      ) : draftReady ? (
        <p className="mt-4 text-center text-xs text-emerald-700">
          Booking saved — complete payment below.
        </p>
      ) : (
        <p className="mt-4 text-center text-xs text-content/55">
          Enter your details to save the booking before paying.
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isPaying || draftSaving}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3.5 text-sm font-semibold text-secondary-foreground shadow-md shadow-secondary/20 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Processing…
          </>
        ) : (
          <>
            Complete Booking
            <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>

      <PaymentTrustBadges />
    </form>
  );
}

export { stripeAppearance };
