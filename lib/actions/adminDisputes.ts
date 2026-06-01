"use server";

import { revalidatePath } from "next/cache";
import {
  addHours,
  getPayoutDelayHours,
} from "@/lib/booking/platform-settings-server";
import { getNotificationContent } from "@/lib/notifications/messages";
import { sendNotification } from "@/lib/notifications/send";
import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  PAYMENT_STATUSES,
} from "@/lib/validations/enums";

export async function resolveDisputeCustomerWins(
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  await requireRole(supabase, ["admin"]);

  const { data: booking, error: readErr } = await supabase
    .from("bookings")
    .select("id, reference, customer_id, operator_id, completion_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (readErr || !booking) {
    return { success: false, error: readErr?.message ?? "Booking not found." };
  }

  if (booking.completion_status !== COMPLETION_STATUS.disputed) {
    return { success: false, error: "Booking is not in dispute." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.cancelled,
      payment_status: PAYMENT_STATUSES[2],
      stripe_payment_status: PAYMENT_STATUSES[2],
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
    .select("id, reference, customer_id, operator_id, completion_status")
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

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
