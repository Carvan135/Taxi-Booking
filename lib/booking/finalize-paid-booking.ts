import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { createBookingBodySchema } from "@/lib/booking/api-schemas";
import {
  insertPendingBookings,
  pendingBookingSuccessPayload,
  type PendingBookingRow,
} from "@/lib/booking/insert-pending-bookings";
import { syncBookingsFromPaymentIntent } from "@/lib/stripe/sync-booking-payment";
import {
  isPaymentIntentSucceededOrProcessing,
  paymentIntentAmountMatches,
} from "@/lib/stripe/payment-intent-utils";
import type { z } from "zod";

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

export type FinalizePaidBookingResult =
  | {
      ok: true;
      payload: ReturnType<typeof pendingBookingSuccessPayload>;
      rows: PendingBookingRow[];
      alreadyConfirmed: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
      payment_succeeded?: boolean;
      booking_reference?: string;
      details?: unknown;
    };

export async function finalizePaidBooking(
  supabase: SupabaseClient,
  body: CreateBookingBody,
  paymentIntent: Stripe.PaymentIntent,
  options?: { sendNotifications?: boolean },
): Promise<FinalizePaidBookingResult> {
  if (paymentIntent.status === "canceled") {
    return {
      ok: false,
      status: 400,
      error: "Payment was canceled. Please try again.",
    };
  }

  if (!isPaymentIntentSucceededOrProcessing(paymentIntent.status)) {
    return {
      ok: false,
      status: 400,
      error: "Payment has not completed yet. Please try again.",
    };
  }

  if (!paymentIntentAmountMatches(paymentIntent, body.price)) {
    return {
      ok: false,
      status: 400,
      error: "Payment amount mismatch. Please refresh and try again.",
      details: { code: "amount_mismatch" },
    };
  }

  const metadataOperatorId = paymentIntent.metadata?.operator_id;
  if (metadataOperatorId && metadataOperatorId !== body.operator_id) {
    return {
      ok: false,
      status: 400,
      error: "Operator does not match payment",
    };
  }

  const rows = await insertPendingBookings(supabase, body);

  if (paymentIntent.status === "processing") {
    return {
      ok: true,
      payload: pendingBookingSuccessPayload(rows),
      rows,
      alreadyConfirmed: false,
    };
  }

  const sync = await syncBookingsFromPaymentIntent(supabase, paymentIntent, {
    sendNotifications: options?.sendNotifications ?? true,
  });

  if (sync.error) {
    const reference = rows[0]?.reference;
    return {
      ok: false,
      status: 503,
      error:
        "Your payment was received but we could not confirm the booking yet. Please wait a moment and refresh, or contact support with your booking reference.",
      payment_succeeded: true,
      booking_reference: reference,
    };
  }

  return {
    ok: true,
    payload: pendingBookingSuccessPayload(rows),
    rows,
    alreadyConfirmed: !sync.updated && !sync.error,
  };
}
