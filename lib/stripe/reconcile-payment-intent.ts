import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeServer } from "@/lib/stripe/server";
import {
  syncBookingsFromPaymentIntent,
  syncBookingsPaymentFailed,
} from "@/lib/stripe/sync-booking-payment";
import { isPaymentIntentSucceededOrProcessing } from "@/lib/stripe/payment-intent-utils";

export type ReconcilePaymentIntentResult = {
  synced: boolean;
  error?: string;
  stripeStatus?: string;
};

/** Pull PaymentIntent state from Stripe and sync matching bookings in Supabase. */
export async function reconcilePaymentIntentById(
  supabase: SupabaseClient,
  paymentIntentId: string,
  options?: { sendNotifications?: boolean },
): Promise<ReconcilePaymentIntentResult> {
  try {
    const stripe = getStripeServer();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (isPaymentIntentSucceededOrProcessing(intent.status)) {
      const sync = await syncBookingsFromPaymentIntent(supabase, intent, {
        sendNotifications: options?.sendNotifications ?? true,
      });
      return {
        synced: sync.updated,
        error: sync.error,
        stripeStatus: intent.status,
      };
    }

    if (
      intent.status === "canceled" ||
      intent.status === "requires_payment_method"
    ) {
      const sync = await syncBookingsPaymentFailed(supabase, paymentIntentId);
      return {
        synced: sync.updated,
        error: sync.error,
        stripeStatus: intent.status,
      };
    }

    return { synced: false, stripeStatus: intent.status };
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : "Payment reconcile failed",
    };
  }
}

/** Reconcile unpaid bookings that already have a Stripe PaymentIntent id. */
export async function reconcileUnpaidBookingsForPaymentIntents(
  supabase: SupabaseClient,
  paymentIntentIds: string[],
  options?: { sendNotifications?: boolean },
): Promise<void> {
  const unique = Array.from(new Set(paymentIntentIds.filter(Boolean)));
  for (const id of unique) {
    await reconcilePaymentIntentById(supabase, id, options);
  }
}
