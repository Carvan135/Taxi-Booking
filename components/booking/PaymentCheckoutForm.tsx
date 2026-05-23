"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PaymentTrustBadges } from "@/components/booking/PaymentTrustBadges";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import type { BookingPriceBreakdown } from "@/lib/booking/pricing";
import {
  clearTaxibookBooking,
  saveConfirmationReference,
  saveConfirmationSnapshot,
  saveTaxibookGuestSession,
  type TaxibookBookingSession,
} from "@/lib/booking/session";
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
  paymentIntentId: string;
  profile: Profile | null | undefined;
  isAuthenticated: boolean;
  stripeReady?: boolean;
};

export function PaymentCheckoutForm({
  trip,
  pricing,
  paymentIntentId,
  profile,
  isAuthenticated,
  stripeReady = true,
}: PaymentCheckoutFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
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

  const onSubmit = handleSubmit(async (customer) => {
    if (!stripe || !elements) {
      setPaymentError("Payment is still loading. Please wait a moment.");
      return;
    }

    setPaymentError(null);
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
      const operator = trip.selected_operator;
      if (!operator) {
        throw new Error("No operator selected");
      }

      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          language: trip.language ?? "english",
          price: pricing.total,
          platform_fee: pricing.platformFee,
          operator_payout: pricing.baseFareTotal,
          notes: trip.notes,
          customer_id: profile?.id ?? null,
        }),
      });

      const body = (await res.json()) as {
        success?: boolean;
        booking_reference?: string;
        group_reference?: string;
        booking_id?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(body.error ?? "Could not save your booking");
      }

      const reference = body.booking_reference ?? "";
      if (!isAuthenticated && body.booking_id) {
        saveTaxibookGuestSession({
          bookingId: body.booking_id,
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
      router.push(`/confirmation?ref=${encodeURIComponent(reference)}`);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Booking could not be saved",
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
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-content">Are you a customer?</p>
          <p className="mt-2 text-content/70">
            Continue as guest below, or{" "}
            <Link
              href="/login?redirect=/payment"
              className="font-semibold text-secondary hover:underline"
            >
              sign in to your account
            </Link>{" "}
            to pre-fill your details.
          </p>
        </div>
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

      <button
        type="submit"
        disabled={!stripe || !elements || isPaying}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3.5 text-sm font-semibold text-secondary-foreground shadow-md shadow-secondary/20 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
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
