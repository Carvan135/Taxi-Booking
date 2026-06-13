"use server";

import { revalidatePath } from "next/cache";
import {
  addHours,
  getPayoutDelayHours,
} from "@/lib/booking/platform-settings-server";
import {
  fireBookingEmail,
  emitRefundConfirmationEmail,
} from "@/lib/email/booking-events";
import {
  sendCustomerTripEmail,
  sendOperatorTripEmail,
} from "@/lib/email/dispatch";
import { getNotificationContent } from "@/lib/notifications/messages";
import { sendNotification } from "@/lib/notifications/send";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  PAYMENT_STATUSES,
} from "@/lib/validations/enums";

export type ResolveDisputeCustomerWinsInput = {
  refundType?: "full" | "partial";
  refundAmount?: number;
  cancellationReason?: string;
};

export async function resolveDisputeCustomerWins(
  bookingId: string,
  input?: ResolveDisputeCustomerWinsInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { user } = await requireRole(supabase, ["admin"]);

  const { data: booking, error: readErr } = await supabase
    .from("bookings")
    .select(
      "id, reference, customer_id, customer_email, customer_name, operator_id, completion_status, price, dispute_reason",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (readErr || !booking) {
    return { success: false, error: readErr?.message ?? "Booking not found." };
  }

  if (booking.completion_status !== COMPLETION_STATUS.disputed) {
    return { success: false, error: "Booking is not in dispute." };
  }

  const price = Number(booking.price ?? 0);
  const refundType = input?.refundType ?? "full";
  const refundAmount =
    refundType === "partial"
      ? Math.min(
          price,
          Math.max(0, Number(input?.refundAmount ?? 0)),
        )
      : price;
  const cancellationReason =
    input?.cancellationReason?.trim() ||
    booking.dispute_reason?.trim() ||
    "Dispute resolved in customer favour";

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.cancelled,
      payment_status: PAYMENT_STATUSES[2],
      stripe_payment_status: PAYMENT_STATUSES[2],
      refund_type: refundType,
      refund_amount: refundAmount > 0 ? refundAmount : null,
      refunded_at: refundAmount > 0 ? now : null,
      refunded_by: refundAmount > 0 ? user.id : null,
      cancellation_reason: cancellationReason,
      cancelled_at: now,
      cancelled_by: user.id,
      dispute_raised_at: null,
      dispute_reason: null,
      auto_complete_at: null,
      updated_at: now,
    })
    .eq("id", bookingId);

  if (error) return { success: false, error: error.message };

  const content = getNotificationContent("dispute_resolved", {
    reference: booking.reference,
  });
  if (booking.customer_id) {
    await sendNotification({
      user_id: booking.customer_id,
      type: "dispute_resolved",
      title: content.title,
      message: `${content.message} Resolved in your favour.`,
      booking_id: bookingId,
    });
  }

  const adminClient = createServiceRoleClient();
  if (refundAmount > 0 && booking.customer_email) {
    fireBookingEmail(() =>
      emitRefundConfirmationEmail(adminClient, {
        bookingId,
        reference: booking.reference,
        amount: refundAmount,
        refundType,
        email: booking.customer_email,
        customerId: booking.customer_id,
      }),
    );
  }
  await sendCustomerTripEmail(adminClient, {
    bookingId,
    reference: booking.reference,
    customerEmail: booking.customer_email,
    customerId: booking.customer_id,
    customerName: booking.customer_name,
    type: "dispute_resolved",
  });

  if (booking.operator_id) {
    await sendOperatorTripEmail(adminClient, {
      operatorId: booking.operator_id,
      bookingId,
      type: "dispute_resolved",
      reference: booking.reference,
    });
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}

export async function resolveDisputeOperatorWins(
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  await requireRole(supabase, ["admin"]);

  const { data: booking, error: readErr } = await supabase
    .from("bookings")
    .select(
      "id, reference, customer_id, customer_email, customer_name, operator_id, completion_status",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (readErr || !booking) {
    return { success: false, error: readErr?.message ?? "Booking not found." };
  }

  if (booking.completion_status !== COMPLETION_STATUS.disputed) {
    return { success: false, error: "Booking is not in dispute." };
  }

  const payoutDelayHours = await getPayoutDelayHours(supabase);
  const now = new Date();
  const payoutEligibleAt = addHours(now, payoutDelayHours);

  const { error } = await supabase
    .from("bookings")
    .update({
      completion_status: COMPLETION_STATUS.customer_confirmed,
      status: BOOKING_STATUS.completed,
      completed_at: now.toISOString(),
      customer_confirmed_at: now.toISOString(),
      payout_eligible_at: payoutEligibleAt,
      dispute_raised_at: null,
      dispute_reason: null,
      auto_complete_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", bookingId);

  if (error) return { success: false, error: error.message };

  const content = getNotificationContent("dispute_resolved", {
    reference: booking.reference,
  });

  if (booking.customer_id) {
    await sendNotification({
      user_id: booking.customer_id,
      type: "dispute_resolved",
      title: content.title,
      message: `${content.message} Booking marked complete.`,
      booking_id: bookingId,
    });
  }

  if (booking.operator_id) {
    const { data: op } = await supabase
      .from("operators")
      .select("user_id")
      .eq("id", booking.operator_id)
      .maybeSingle();
    if (op?.user_id) {
      await sendNotification({
        user_id: op.user_id,
        type: "dispute_resolved",
        title: content.title,
        message: `${content.message} Payout will proceed.`,
        booking_id: bookingId,
      });
    }
  }

  const adminClient = createServiceRoleClient();
  await sendCustomerTripEmail(adminClient, {
    bookingId,
    reference: booking.reference,
    customerEmail: booking.customer_email,
    customerId: booking.customer_id,
    customerName: booking.customer_name,
    type: "dispute_resolved",
  });

  if (booking.operator_id) {
    await sendOperatorTripEmail(adminClient, {
      operatorId: booking.operator_id,
      bookingId,
      type: "dispute_resolved",
      reference: booking.reference,
    });
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
