import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addHours,
  getAutoCompleteWarningHours,
  getPayoutDelayHours,
} from "@/lib/booking/platform-settings-server";
import {
  fireBookingEmail,
  emitBookingReceiptEmail,
} from "@/lib/email/booking-events";
import { sendCustomerTripEmail } from "@/lib/email/dispatch";
import { getNotificationContent } from "@/lib/notifications/messages";
import { sendNotification } from "@/lib/notifications/send";
import { canReceivePayout } from "@/lib/stripe/payoutGuard";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
} from "@/lib/validations/enums";

type BookingCompletionRow = {
  id: string;
  reference: string;
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  operator_id: string | null;
  auto_complete_at: string | null;
};

export type AutoCompleteCronResult = {
  autoCompletedCount: number;
  warningsSent: number;
  payoutsReleased: number;
};

export async function runAutoCompleteCron(
  supabase: SupabaseClient,
): Promise<AutoCompleteCronResult> {
  const now = new Date();
  const nowIso = now.toISOString();

  const warningHours = await getAutoCompleteWarningHours();
  const warningDeadline = addHours(now, warningHours);

  let autoCompletedCount = 0;
  let warningsSent = 0;

  const { data: pendingCompletion, error: listError } = await supabase
    .from("bookings")
    .select(
      "id, reference, customer_id, customer_email, customer_name, operator_id, auto_complete_at, completion_status",
    )
    .eq("completion_status", COMPLETION_STATUS.operator_marked_complete)
    .is("dispute_raised_at", null)
    .not("auto_complete_at", "is", null);

  if (listError) {
    throw new Error(listError.message);
  }

  for (const booking of (pendingCompletion ?? []) as BookingCompletionRow[]) {
    if (!booking.auto_complete_at) continue;
    const autoAt = new Date(booking.auto_complete_at);

    if (autoAt <= now) {
      const payoutDelayHours = await getPayoutDelayHours();
      const payoutEligibleAt = addHours(now, payoutDelayHours);

      const { error } = await supabase
        .from("bookings")
        .update({
          completion_status: COMPLETION_STATUS.auto_completed,
          status: BOOKING_STATUS.completed,
          completed_at: nowIso,
          payout_eligible_at: payoutEligibleAt,
          auto_complete_at: null,
          updated_at: nowIso,
        })
        .eq("id", booking.id);

      if (error) {
        console.error("auto-complete update error:", booking.id, error);
        continue;
      }

      autoCompletedCount += 1;

      if (booking.customer_id) {
        const content = getNotificationContent("auto_completed", {
          reference: booking.reference,
        });
        await sendNotification({
          user_id: booking.customer_id,
          type: "auto_completed",
          title: content.title,
          message: content.message,
          booking_id: booking.id,
        });
      }

      fireBookingEmail(() => emitBookingReceiptEmail(supabase, booking.id));

      if (booking.operator_id) {
        const { data: op } = await supabase
          .from("operators")
          .select("user_id")
          .eq("id", booking.operator_id)
          .maybeSingle();

        if (op?.user_id) {
          const content = getNotificationContent("completion_confirmed", {
            reference: booking.reference,
          });
          await sendNotification({
            user_id: op.user_id,
            type: "completion_confirmed",
            title: content.title,
            message: `${content.message} Payout will be processed according to platform settings.`,
            booking_id: booking.id,
          });
        }
      }

      continue;
    }

    if (
      autoAt <= new Date(warningDeadline) &&
      (booking.customer_id || booking.customer_email)
    ) {
      if (booking.customer_id) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("type", "auto_complete_warning")
          .eq("user_id", booking.customer_id)
          .limit(1);

        if (existing && existing.length > 0) continue;
      }

      const hoursLeft = Math.max(
        1,
        Math.ceil((autoAt.getTime() - now.getTime()) / (60 * 60 * 1000)),
      );
      const content = getNotificationContent("auto_complete_warning", {
        reference: booking.reference,
        hours: String(hoursLeft),
      });
      if (booking.customer_id) {
        await sendNotification({
          user_id: booking.customer_id,
          type: "auto_complete_warning",
          title: content.title,
          message: content.message,
          booking_id: booking.id,
          metadata: { warning_sent: true },
        });
      }
      await sendCustomerTripEmail(supabase, {
        bookingId: booking.id,
        reference: booking.reference,
        customerId: booking.customer_id,
        type: "auto_complete_warning",
        data: { hours: String(hoursLeft) },
      });
      warningsSent += 1;
    }
  }

  const payoutsReleased = await releaseEligiblePayouts(supabase);

  return { autoCompletedCount, warningsSent, payoutsReleased };
}

export async function releaseEligiblePayouts(
  supabase: SupabaseClient,
): Promise<number> {
  const nowIso = new Date().toISOString();

  const { data: eligible, error } = await supabase
    .from("bookings")
    .select("id, reference, operator_id, operator_payout")
    .eq("status", BOOKING_STATUS.completed)
    .is("payout_released_at", null)
    .not("payout_eligible_at", "is", null)
    .lte("payout_eligible_at", nowIso);

  if (error) {
    console.error("releaseEligiblePayouts list error:", error);
    return 0;
  }

  let count = 0;

  for (const row of eligible ?? []) {
    if (!row.operator_id) continue;
    const guard = await canReceivePayout(row.operator_id);
    if (!guard.allowed) continue;

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payout_released_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", row.id);

    if (updateError) {
      console.error("releaseEligiblePayouts update error:", row.id, updateError);
      continue;
    }

    count += 1;

    const { data: op } = await supabase
      .from("operators")
      .select("user_id")
      .eq("id", row.operator_id)
      .maybeSingle();

    if (op?.user_id) {
      const amount =
        row.operator_payout != null
          ? `£${Number(row.operator_payout).toFixed(2)}`
          : "";
      const content = getNotificationContent("payout_released", {
        reference: row.reference,
        amount,
      });
      await sendNotification({
        user_id: op.user_id,
        type: "payout_released",
        title: content.title,
        message: amount
          ? `${content.message} Amount: ${amount}.`
          : content.message,
        booking_id: row.id,
      });
    }
  }

  return count;
}

export async function releasePayoutForBooking(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: booking, error: readErr } = await supabase
    .from("bookings")
    .select("id, reference, status, operator_id, operator_payout, payout_released_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (readErr || !booking) {
    return { success: false, error: readErr?.message ?? "Booking not found." };
  }

  if (booking.status !== BOOKING_STATUS.completed) {
    return { success: false, error: "Only completed bookings can release payout." };
  }

  if (booking.payout_released_at) {
    return { success: false, error: "Payout already released." };
  }

  if (!booking.operator_id) {
    return { success: false, error: "Booking has no operator." };
  }

  const guard = await canReceivePayout(booking.operator_id);
  if (!guard.allowed) {
    return { success: false, error: guard.reason ?? "Payout not allowed." };
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      payout_released_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", bookingId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { data: op } = await supabase
    .from("operators")
    .select("user_id")
    .eq("id", booking.operator_id)
    .maybeSingle();

  if (op?.user_id) {
    const amount =
      booking.operator_payout != null
        ? `£${Number(booking.operator_payout).toFixed(2)}`
        : "";
    const content = getNotificationContent("payout_released", {
      reference: booking.reference,
      amount,
    });
    await sendNotification({
      user_id: op.user_id,
      type: "payout_released",
      title: content.title,
      message: amount
        ? `${content.message} Amount: ${amount}.`
        : content.message,
      booking_id: bookingId,
    });
  }

  return { success: true };
}
