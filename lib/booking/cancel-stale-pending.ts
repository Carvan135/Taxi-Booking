import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BOOKING_STATUS,
  PAYMENT_STATUSES,
} from "@/lib/validations/enums";

const PAYMENT_UNPAID = PAYMENT_STATUSES[0];

/** Cancel pending unpaid bookings tied to a superseded payment intent. */
export async function cancelPendingBookingsForPaymentIntent(
  supabase: SupabaseClient,
  paymentIntentId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.cancelled,
      updated_at: now,
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("status", BOOKING_STATUS.pending)
    .eq("payment_status", PAYMENT_UNPAID);

  if (error) {
    console.error("cancelPendingBookingsForPaymentIntent:", error);
  }
}
