import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcileUnpaidBookingsForPaymentIntents } from "@/lib/stripe/reconcile-payment-intent";
import { PAYMENT_STATUSES } from "@/lib/validations/enums";

const PAYMENT_PAID = PAYMENT_STATUSES[1];

export type ReconcilePaymentsCronResult = {
  checked: number;
  synced: number;
  errors: string[];
};

/**
 * Safety net when webhooks lag or finalize returns before DB sync completes.
 * Only touches bookings older than 2 minutes to avoid racing the live checkout flow.
 */
export async function runReconcilePaymentsCron(
  supabase: SupabaseClient,
): Promise<ReconcilePaymentsCronResult> {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data: unpaid, error: listError } = await supabase
    .from("bookings")
    .select("stripe_payment_intent_id")
    .neq("payment_status", PAYMENT_PAID)
    .not("stripe_payment_intent_id", "is", null)
    .lt("created_at", cutoff);

  if (listError) {
    throw listError;
  }

  const intentIds = (unpaid ?? [])
    .map((row) => row.stripe_payment_intent_id)
    .filter((id): id is string => Boolean(id?.trim()));

  return reconcileUnpaidBookingsForPaymentIntents(supabase, intentIds, {
    sendNotifications: true,
  });
}
