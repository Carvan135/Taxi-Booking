import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotificationContent } from "@/lib/notifications/messages";
import { sendNotification } from "@/lib/notifications/send";
import {
  BOOKING_STATUS,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from "@/lib/validations/enums";

const PAYMENT_UNPAID = PAYMENT_STATUSES[0] satisfies PaymentStatus;
const PAYMENT_PAID = PAYMENT_STATUSES[1] satisfies PaymentStatus;
const PAYMENT_FAILED = PAYMENT_STATUSES[3] satisfies PaymentStatus;

/** Map Stripe PaymentIntent status to synced platform payment fields. */
export function syncedPaymentStatusFromIntent(
  stripeStatus: Stripe.PaymentIntent.Status,
): PaymentStatus {
  if (stripeStatus === "succeeded") return PAYMENT_PAID;
  if (stripeStatus === "canceled") return PAYMENT_FAILED;
  return PAYMENT_UNPAID;
}

export function syncedPaymentFieldsFromIntent(intent: Stripe.PaymentIntent): {
  payment_status: PaymentStatus;
  stripe_payment_status: PaymentStatus;
} {
  const status = syncedPaymentStatusFromIntent(intent.status);
  return { payment_status: status, stripe_payment_status: status };
}

type BookingPaymentRow = {
  id: string;
  reference: string;
  status: string;
  operator_id: string | null;
  customer_id: string | null;
  payment_status: PaymentStatus;
  pickup_date: string;
};

async function notifyPaymentSucceeded(
  supabase: SupabaseClient,
  rows: BookingPaymentRow[],
): Promise<void> {
  const seenCustomers = new Set<string>();
  const seenOperators = new Set<string>();

  for (const row of rows) {
    if (row.customer_id && !seenCustomers.has(row.customer_id)) {
      seenCustomers.add(row.customer_id);
      const content = getNotificationContent("booking_confirmed", {
        reference: row.reference,
      });
      await sendNotification({
        user_id: row.customer_id,
        type: "booking_confirmed",
        title: content.title,
        message: content.message,
        booking_id: row.id,
        metadata: { reference: row.reference },
      });
    }

    if (row.operator_id && !seenOperators.has(row.operator_id)) {
      seenOperators.add(row.operator_id);
      const { data: op } = await supabase
        .from("operators")
        .select("user_id")
        .eq("id", row.operator_id)
        .maybeSingle();

      if (op?.user_id) {
        const content = getNotificationContent("new_booking_assigned", {
          reference: row.reference,
          pickup_date: row.pickup_date,
        });
        await sendNotification({
          user_id: op.user_id,
          type: "new_booking_assigned",
          title: content.title,
          message: content.message,
          booking_id: row.id,
          metadata: { reference: row.reference },
        });
      }
    }
  }
}

/**
 * Apply Stripe PaymentIntent state to all bookings for that intent.
 * Payment fields always stay in sync; status becomes confirmed after success.
 */
export async function syncBookingsFromPaymentIntent(
  supabase: SupabaseClient,
  intent: Stripe.PaymentIntent,
  options?: { sendNotifications?: boolean },
): Promise<{ updated: boolean; error?: string }> {
  const sendNotifications = options?.sendNotifications ?? true;

  const { data: bookings, error: listError } = await supabase
    .from("bookings")
    .select(
      "id, reference, status, operator_id, customer_id, payment_status, pickup_date",
    )
    .eq("stripe_payment_intent_id", intent.id);

  if (listError) {
    return { updated: false, error: listError.message };
  }

  if (!bookings?.length) {
    return { updated: false };
  }

  const rows = bookings as BookingPaymentRow[];
  const now = new Date().toISOString();
  const paymentFields = syncedPaymentFieldsFromIntent(intent);

  if (intent.status === "succeeded") {
    const hasOperator = rows.some((b) => Boolean(b.operator_id));
    if (!hasOperator) {
      return {
        updated: false,
        error: "Payment succeeded but booking has no operator assigned.",
      };
    }

    const alreadyConfirmed =
      rows.every(
        (b) =>
          b.status === BOOKING_STATUS.confirmed &&
          b.payment_status === PAYMENT_PAID,
      ) && rows.every((b) => Boolean(b.operator_id));

    if (alreadyConfirmed) {
      return { updated: false };
    }

    const updatePayload: Record<string, unknown> = {
      ...paymentFields,
      status: BOOKING_STATUS.confirmed,
      assigned_at: now,
      updated_at: now,
    };

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("stripe_payment_intent_id", intent.id);

    if (updateError) {
      return { updated: false, error: updateError.message };
    }

    if (sendNotifications) {
      await notifyPaymentSucceeded(supabase, rows);
    }
    return { updated: true };
  }

  if (intent.status === "canceled") {
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        ...paymentFields,
        updated_at: now,
      })
      .eq("stripe_payment_intent_id", intent.id);

    if (updateError) {
      return { updated: false, error: updateError.message };
    }
    return { updated: true };
  }

  const needsPaymentSync = rows.some(
    (b) => b.payment_status !== paymentFields.payment_status,
  );

  if (!needsPaymentSync) {
    return { updated: false };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      ...paymentFields,
      updated_at: now,
    })
    .eq("stripe_payment_intent_id", intent.id);

  if (updateError) {
    return { updated: false, error: updateError.message };
  }
  return { updated: true };
}

/** payment_intent.payment_failed — keep booking status pending, sync payment fields. */
export async function syncBookingsPaymentFailed(
  supabase: SupabaseClient,
  paymentIntentId: string,
): Promise<{ updated: boolean; error?: string }> {
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      payment_status: PAYMENT_FAILED,
      stripe_payment_status: PAYMENT_FAILED,
      status: BOOKING_STATUS.pending,
      updated_at: now,
    })
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (updateError) {
    return { updated: false, error: updateError.message };
  }
  return { updated: true };
}
